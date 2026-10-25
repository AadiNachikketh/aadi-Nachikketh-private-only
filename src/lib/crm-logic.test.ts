import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProjectFinancials,
  calculateCommissionAmount,
  detectLeadDuplicate,
  autoMapSpreadsheetColumns,
  sanitizeSpreadsheetCell,
  canUserPerformAction,
} from './crm-logic';

test('calculateProjectFinancials separates cash collected, balances, and estimated profit', () => {
  const summary = calculateProjectFinancials(
    {
      agreedPrice: 45000,
      agreedDeveloperCost: 12000,
      otherExpenses: 1500,
    },
    [
      { paymentDirection: 'inbound_client', paymentType: 'Advance', amount: 25000, status: 'Completed' },
      { paymentDirection: 'outbound_developer', paymentType: 'Developer Payout', amount: 6000, status: 'Completed' },
    ],
    1000
  );

  assert.equal(summary.projectRevenue, 45000);
  assert.equal(summary.cashCollected, 25000);
  assert.equal(summary.outstandingClientBalance, 20000);
  assert.equal(summary.developerCost, 12000);
  assert.equal(summary.developerPayments, 6000);
  assert.equal(summary.outstandingDeveloperBalance, 6000);
  assert.equal(summary.otherProjectExpenses, 1500);
  assert.equal(summary.commissionAmount, 1000);
  // 45000 - 12000 - 1500 - 1000 = 30500
  assert.equal(summary.estimatedProjectProfit, 30500);
});

test('calculateCommissionAmount supports fixed and percentage models accurately', () => {
  const fixed = calculateCommissionAmount(50000, 'fixed', 1000);
  assert.equal(fixed.amount, 1000);

  const pct = calculateCommissionAmount(50000, 'percentage', 10);
  assert.equal(pct.amount, 5000);
});

test('detectLeadDuplicate never matches on business name alone, requires locality or phone/domain/maps', () => {
  const existing = [
    {
      id: 1,
      businessName: 'Kalyan Jewellers',
      phone: '+91 98450 11223',
      websiteUrl: 'https://kalyanjewellers.net',
      googleMapsUrl: 'https://maps.google.com/?cid=111',
      locality: 'Whitefield',
      city: 'Bengaluru',
    },
  ];

  // Same name in different locality -> NOT a duplicate
  const diffLocality = detectLeadDuplicate(
    { businessName: 'Kalyan Jewellers', locality: 'Indiranagar', city: 'Bengaluru' },
    existing
  );
  assert.equal(diffLocality.isDuplicate, false);

  // Same name + same locality -> IS a duplicate
  const sameLocality = detectLeadDuplicate(
    { businessName: 'Kalyan Jewellers', locality: 'Whitefield', city: 'Bengaluru' },
    existing
  );
  assert.equal(sameLocality.isDuplicate, true);

  // Same phone with different formatting -> IS a duplicate
  const samePhone = detectLeadDuplicate(
    { businessName: 'Kalyan Gold Showroom', phone: '09845011223', locality: 'Jayanagar' },
    existing
  );
  assert.equal(samePhone.isDuplicate, true);
});

test('autoMapSpreadsheetColumns and sanitizeSpreadsheetCell protect against formula injection', () => {
  const mapped = autoMapSpreadsheetColumns(['Company Name', 'Mobile', 'Google Maps Profile', 'Area', 'Custom Column']);
  assert.equal(mapped['Company Name'], 'businessName');
  assert.equal(mapped['Mobile'], 'phone');
  assert.equal(mapped['Google Maps Profile'], 'googleMapsUrl');
  assert.equal(mapped['Area'], 'locality');
  assert.equal(mapped['Custom Column'], 'unmapped');

  assert.equal(sanitizeSpreadsheetCell('=CMD|" /C calc"!A0'), "'=CMD|\" /C calc\"!A0");
  assert.equal(sanitizeSpreadsheetCell('+91 98765 43210'), "'+91 98765 43210");
  assert.equal(sanitizeSpreadsheetCell('Aarav Jewellers'), 'Aarav Jewellers');
});

test('canUserPerformAction enforces role-based access control', () => {
  assert.equal(canUserPerformAction('admin', 'approve_commission'), true);
  assert.equal(canUserPerformAction('outreacher', 'approve_commission'), false);
  assert.equal(canUserPerformAction('outreacher', 'update_lead'), true);
  assert.equal(canUserPerformAction('developer', 'update_project'), true);
  assert.equal(canUserPerformAction('developer', 'assign_leads'), false);
});
