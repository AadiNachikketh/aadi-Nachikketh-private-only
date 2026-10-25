'use client';

import React, { useState, useMemo } from 'react';
import {
  Download,
  FileSpreadsheet,
  Plus,
  Shield,
  Database,
  CheckCircle2,
  FolderPlus,
} from 'lucide-react';
import { CrmState } from '../types/crm';
import { calculateProjectFinancials } from '../lib/crm-logic';
import { exportRecordsToFile } from '../utils/spreadsheet';

interface ReportsAndSettingsProps {
  mode: 'reports' | 'settings';
  state: CrmState;
  actorRole: string;
  onChangeActorRole: (newRole: 'admin' | 'outreacher' | 'developer') => void;
  onMutate: (action: string, payload: Record<string, unknown>, successMsg?: string) => Promise<void>;
}

const REPORT_TYPES = [
  { id: 'leads_by_location', label: '1. Leads by Geographical Location' },
  { id: 'leads_by_category', label: '2. Leads by Business Category' },
  { id: 'leads_without_websites', label: '3. Leads Without Websites' },
  { id: 'leads_by_status', label: '4. Leads by Pipeline Status' },
  { id: 'outreacher_performance', label: '5. Outreacher Performance & Conversion' },
  { id: 'won_deals', label: '6. Won Website Deals' },
  { id: 'revenue_and_payments', label: '7. Client Revenue & Payments Collected' },
  { id: 'project_profitability', label: '8. Website Project Profitability' },
  { id: 'developer_workload', label: '9. Developer Workload & Payouts' },
  { id: 'overdue_projects', label: '10. Overdue Projects & Deadlines' },
  { id: 'commission_liabilities', label: '11. Outreacher Commission Liabilities' },
];

export default function ReportsAndSettingsModule({
  mode,
  state,
  actorRole,
  onChangeActorRole,
  onMutate,
}: ReportsAndSettingsProps) {
  const [selectedReport, setSelectedReport] = useState('leads_by_location');
  const [reportLocationFilter, setReportLocationFilter] = useState('ALL');
  const [reportCategoryFilter, setReportCategoryFilter] = useState('ALL');

  // Settings form state
  const [agencyName, setAgencyName] = useState(
    state.settings?.agencyName || 'Agency Command Center'
  );
  const [defaultCurrency, setDefaultCurrency] = useState(
    state.settings?.defaultCurrency || 'INR'
  );
  const [timezone, setTimezone] = useState(state.settings?.timezone || 'Asia/Kolkata');
  const [defaultCommType, setDefaultCommType] = useState(
    state.settings?.defaultCommissionType || 'fixed'
  );
  const [defaultCommVal, setDefaultCommVal] = useState(
    state.settings?.defaultCommissionValue || 1000
  );

  // Category creation state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);

  const reportData = useMemo(() => {
    const activeLeads = state.leads.filter((l) => !l.isArchived);
    const filteredLeads = activeLeads.filter((l) => {
      if (
        reportLocationFilter !== 'ALL' &&
        (l.locality || l.city || '') !== reportLocationFilter
      ) {
        return false;
      }
      if (reportCategoryFilter !== 'ALL' && l.categoryName !== reportCategoryFilter) {
        return false;
      }
      return true;
    });

    switch (selectedReport) {
      case 'leads_by_location':
        return filteredLeads.map((l) => ({
          Locality: l.locality || l.city || 'Unspecified',
          City: l.city || '',
          State: l.state || '',
          BusinessName: l.businessName,
          Category: l.categoryName,
          WebsiteStatus: l.websiteStatus,
          LeadStatus: l.status,
          EstimatedDealINR: l.estimatedDealValue,
        }));

      case 'leads_by_category':
        return filteredLeads.map((l) => ({
          Category: l.categoryName,
          BusinessName: l.businessName,
          Locality: l.locality || l.city || '',
          Phone: l.phone || '',
          WebsiteStatus: l.websiteStatus,
          LeadStatus: l.status,
          EstimatedDealINR: l.estimatedDealValue,
        }));

      case 'leads_without_websites':
        return filteredLeads
          .filter((l) => l.websiteStatus === 'No Website')
          .map((l) => ({
            BusinessName: l.businessName,
            Contact: l.contactName || '',
            Phone: l.phone || '',
            Category: l.categoryName,
            Locality: l.locality || l.city || '',
            LeadStatus: l.status,
            EstimatedDealINR: l.estimatedDealValue,
          }));

      case 'leads_by_status':
        return filteredLeads.map((l) => ({
          LeadStatus: l.status,
          BusinessName: l.businessName,
          Locality: l.locality || l.city || '',
          FollowUpDate: l.nextFollowUpAt || '—',
          EstimatedDealINR: l.estimatedDealValue,
        }));

      case 'outreacher_performance':
        return state.users
          .filter((u) => u.role === 'outreacher')
          .map((o) => {
            const assigned = activeLeads.filter((l) => l.assignedOutreacherId === o.id);
            const won = assigned.filter((l) => l.status === 'Deal Won');
            const comms = state.commissions.filter((c) => c.outreacherId === o.id);
            return {
              Outreacher: o.fullName,
              Email: o.email,
              LeadsAssigned: assigned.length,
              DealsWon: won.length,
              WonRevenueINR: won.reduce((a, b) => a + (b.agreedDealValue || 0), 0),
              TotalCommissionINR: comms.reduce((a, b) => a + b.amount, 0),
            };
          });

      case 'won_deals':
        return state.deals.map((d) => ({
          DealName: d.dealName,
          Status: d.status,
          AgreedValueINR: d.agreedValue,
          WonDate: d.wonAt,
        }));

      case 'revenue_and_payments':
        return state.payments.map((p) => ({
          Date: p.paidAt,
          Party: p.payerOrPayee,
          Direction: p.paymentDirection,
          PaymentType: p.paymentType,
          AmountINR: p.amount,
          Reference: p.reference,
        }));

      case 'project_profitability':
        return state.projects.map((p) => {
          const pPays = state.payments.filter((pay) => pay.projectId === p.id);
          const comm = state.commissions.find(
            (c) => (p.dealId && c.dealId === p.dealId) || (p.leadId && c.leadId === p.leadId)
          );
          const fin = calculateProjectFinancials(p, pPays, comm?.amount || 0);
          return {
            Project: p.projectName,
            Client: p.clientName,
            Status: p.status,
            AgreedPriceINR: fin.projectRevenue,
            CashCollectedINR: fin.cashCollected,
            ClientBalanceDueINR: fin.outstandingClientBalance,
            DeveloperCostINR: fin.developerCost,
            ExpensesINR: fin.otherProjectExpenses,
            CommissionINR: fin.commissionAmount,
            EstimatedProfitINR: fin.estimatedProjectProfit,
          };
        });

      case 'developer_workload':
        return state.users
          .filter((u) => u.role === 'developer')
          .map((dev) => {
            const projs = state.projects.filter((p) => p.assignedDeveloperId === dev.id);
            return {
              Developer: dev.fullName,
              Specialities: dev.specialities || '',
              ActiveProjects: projs.filter(
                (p) => !['Completed', 'Delivered', 'Cancelled'].includes(p.status)
              ).length,
              CompletedProjects: projs.filter((p) =>
                ['Completed', 'Delivered'].includes(p.status)
              ).length,
              PaymentTerms: dev.paymentArrangement || '',
            };
          });

      case 'overdue_projects':
        return state.projects
          .filter(
            (p) =>
              p.dueDate &&
              p.dueDate < todayStr &&
              !['Completed', 'Delivered', 'Cancelled'].includes(p.status)
          )
          .map((p) => ({
            Project: p.projectName,
            Client: p.clientName,
            Status: p.status,
            DueDate: p.dueDate || '',
            AgreedPriceINR: p.agreedPrice,
          }));

      case 'commission_liabilities':
        return state.commissions.map((c) => {
          const out = state.users.find((u) => u.id === c.outreacherId);
          return {
            CommissionID: c.id,
            Outreacher: out?.fullName || `User #${c.outreacherId}`,
            Basis: c.calculationBasis || '',
            AmountINR: c.amount,
            Status: c.status,
            PaidDate: c.paidAt || 'Unpaid',
          };
        });

      default:
        return [];
    }
  }, [selectedReport, state, reportLocationFilter, reportCategoryFilter, todayStr]);

  const handleDownloadReport = (format: 'xlsx' | 'csv') => {
    if (reportData.length === 0) return;
    const cols = Object.keys(reportData[0]).map((k) => ({
      key: k,
      label: k,
      getValue: (row: Record<string, unknown>) => row[k],
    }));
    exportRecordsToFile(reportData, cols, selectedReport, format);
  };

  if (mode === 'reports') {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Select Report Type"
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-medium"
            >
              {REPORT_TYPES.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter Report by Locality"
              value={reportLocationFilter}
              onChange={(e) => setReportLocationFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
            >
              <option value="ALL">All Locations</option>
              <option value="Whitefield">Whitefield</option>
              <option value="Indiranagar">Indiranagar</option>
              <option value="Bandra West">Bandra West</option>
              <option value="JP Nagar">JP Nagar</option>
            </select>

            <select
              aria-label="Filter Report by Category"
              value={reportCategoryFilter}
              onChange={(e) => setReportCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
            >
              <option value="ALL">All Business Categories</option>
              {state.categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={reportData.length === 0}
              onClick={() => handleDownloadReport('csv')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export Report (.CSV)
            </button>
            <button
              type="button"
              disabled={reportData.length === 0}
              onClick={() => handleDownloadReport('xlsx')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Report (.XLSX)
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <h2 className="text-base font-semibold text-white">
              {REPORT_TYPES.find((r) => r.id === selectedReport)?.label}
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {reportData.length} records
            </span>
          </div>

          {reportData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No database records match the selected report filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    {Object.keys(reportData[0]).map((colKey) => (
                      <th key={colKey} className="py-2.5 px-3 font-medium">
                        {colKey}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      {Object.values(row).map((val, cIdx) => (
                        <td
                          key={cIdx}
                          className="py-2.5 px-3 text-slate-200 font-mono tabular-nums"
                        >
                          {typeof val === 'number' && val > 999
                            ? `₹${val.toLocaleString('en-IN')}`
                            : String(val ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Settings View (Section 18)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General & Commission Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-white border-b border-slate-800 pb-3">
            A. General Agency & Default Commission Settings
          </h2>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!state.settings) return;
              await onMutate(
                'UPDATE_SETTINGS',
                {
                  ...state.settings,
                  agencyName,
                  defaultCurrency,
                  timezone,
                  defaultCommissionType: defaultCommType,
                  defaultCommissionValue: defaultCommVal,
                },
                'Saved agency configuration settings to PostgreSQL.'
              );
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs text-slate-400 mb-1">Agency Name</label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Default Currency</label>
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="INR">INR (₹) — Indian Rupee</option>
                  <option value="USD">USD ($) — US Dollar</option>
                  <option value="GBP">GBP (£) — British Pound</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Default Commission Rule</label>
                <select
                  value={defaultCommType}
                  onChange={(e) => setDefaultCommType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="fixed">Fixed Amount per Won Deal</option>
                  <option value="percentage">Percentage of Deal Value</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Default Commission Value</label>
                <input
                  type="number"
                  value={defaultCommVal}
                  onChange={(e) => setDefaultCommVal(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono tabular-nums"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
            >
              Save Agency Settings
            </button>
          </form>
        </div>

        {/* Business Categories Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-white border-b border-slate-800 pb-3">
            B. Business Categories Configuration
          </h2>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newCategoryName.trim()) return;
              await onMutate(
                'UPSERT_CATEGORY',
                { name: newCategoryName.trim(), description: newCategoryDesc.trim(), isActive: true },
                `Added business category: ${newCategoryName.trim()}`
              );
              setNewCategoryName('');
              setNewCategoryDesc('');
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              required
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name (e.g. Boutique Hotels)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg whitespace-nowrap"
            >
              + Add Category
            </button>
          </form>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {state.categories.map((cat) => (
              <div
                key={cat.id}
                className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-medium text-white">{cat.name}</span>
                  {cat.description && (
                    <span className="text-slate-500 ml-2">· {cat.description}</span>
                  )}
                </div>
                <span className="text-emerald-400">Active</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role-Based Access Control & Import Jobs History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-white">
              F. Team Roles & RBAC Verification Switcher
            </h2>
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xs text-slate-400">
            Test server-side Role-Based Access Control (Admin vs Outreacher vs Developer). For example, switching to Outreacher restricts commission approval and administrative deletions on the backend API.
          </p>

          <div className="flex items-center gap-2">
            {(['admin', 'outreacher', 'developer'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onChangeActorRole(r)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                  actorRole === r
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Role: {r}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-white">
              G. Spreadsheet & Dataset Import History
            </h2>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {state.importJobs.map((job) => (
              <div
                key={job.id}
                className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-medium text-white">{job.filename}</div>
                  <div className="text-slate-500">{job.importType}</div>
                </div>
                <div className="text-right font-mono tabular-nums text-slate-300">
                  <div>{job.rowsImported} imported / {job.rowsRead} read</div>
                  <div className="text-slate-500">{job.rowsSkipped} skipped</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
