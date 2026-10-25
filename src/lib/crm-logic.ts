export interface PaymentRecordInput {
  id?: number;
  projectId?: number | null;
  dealId?: number | null;
  paymentDirection: string; // 'inbound_client' | 'outbound_developer' | 'outbound_expense' | 'outbound_commission'
  paymentType: string;
  amount: number;
  status: string;
}

export interface ProjectFinancialInput {
  id?: number;
  agreedPrice: number;
  agreedDeveloperCost: number;
  otherExpenses: number;
}

export interface ProjectFinancialSummary {
  projectRevenue: number;
  cashCollected: number;
  outstandingClientBalance: number;
  developerCost: number;
  developerPayments: number;
  outstandingDeveloperBalance: number;
  otherProjectExpenses: number;
  commissionAmount: number;
  estimatedProjectProfit: number;
}

export function calculateProjectFinancials(
  project: ProjectFinancialInput,
  payments: PaymentRecordInput[],
  commissionAmount: number = 0
): ProjectFinancialSummary {
  const completedPayments = payments.filter((p) => p.status === 'Completed');

  const clientInbound = completedPayments
    .filter((p) => p.paymentDirection === 'inbound_client' && p.paymentType !== 'Refund')
    .reduce((acc, p) => acc + Math.max(0, Number(p.amount) || 0), 0);

  const clientRefunds = completedPayments
    .filter((p) => p.paymentDirection === 'inbound_client' && p.paymentType === 'Refund')
    .reduce((acc, p) => acc + Math.abs(Number(p.amount) || 0), 0);

  const cashCollected = Math.max(0, clientInbound - clientRefunds);
  const projectRevenue = Math.max(0, Number(project.agreedPrice) || 0);
  const outstandingClientBalance = Math.max(0, projectRevenue - cashCollected);

  const developerCost = Math.max(0, Number(project.agreedDeveloperCost) || 0);
  const developerPayments = completedPayments
    .filter((p) => p.paymentDirection === 'outbound_developer')
    .reduce((acc, p) => acc + Math.max(0, Number(p.amount) || 0), 0);
  const outstandingDeveloperBalance = Math.max(0, developerCost - developerPayments);

  const recordedExpensePayments = completedPayments
    .filter((p) => p.paymentDirection === 'outbound_expense')
    .reduce((acc, p) => acc + Math.max(0, Number(p.amount) || 0), 0);

  const otherProjectExpenses = Math.max(0, Number(project.otherExpenses) || 0) + recordedExpensePayments;
  const validCommission = Math.max(0, Number(commissionAmount) || 0);

  const estimatedProjectProfit =
    projectRevenue - developerCost - otherProjectExpenses - validCommission;

  return {
    projectRevenue,
    cashCollected,
    outstandingClientBalance,
    developerCost,
    developerPayments,
    outstandingDeveloperBalance,
    otherProjectExpenses,
    commissionAmount: validCommission,
    estimatedProjectProfit,
  };
}

export function calculateCommissionAmount(
  agreedDealValue: number,
  commissionType: 'fixed' | 'percentage' | string,
  commissionRate: number
): { amount: number; calculationBasis: string } {
  const safeValue = Math.max(0, Number(agreedDealValue) || 0);
  const safeRate = Math.max(0, Number(commissionRate) || 0);

  if (commissionType === 'percentage') {
    const amount = Math.round((safeValue * safeRate) / 100);
    return {
      amount,
      calculationBasis: `${safeRate}% of ₹${safeValue.toLocaleString('en-IN')}`,
    };
  }

  return {
    amount: safeRate,
    calculationBasis: `Fixed ₹${safeRate.toLocaleString('en-IN')} per won deal`,
  };
}

export function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function normalizeDomain(url?: string | null): string {
  if (!url) return '';
  const trimmed = String(url).trim().toLowerCase();
  if (!trimmed) return '';
  try {
    const withProto = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return trimmed.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || '';
  }
}

export function normalizeText(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface DuplicateCandidate {
  id: number;
  businessName: string;
  phone?: string | null;
  websiteUrl?: string | null;
  googleMapsUrl?: string | null;
  locality?: string | null;
  city?: string | null;
}

export interface IncomingLeadRow {
  businessName?: string;
  phone?: string;
  websiteUrl?: string;
  googleMapsUrl?: string;
  locality?: string;
  city?: string;
}

export function detectLeadDuplicate(
  incoming: IncomingLeadRow,
  existingLeads: DuplicateCandidate[]
): { isDuplicate: boolean; matchedLead?: DuplicateCandidate; matchReason?: string } {
  const incMaps = (incoming.googleMapsUrl || '').trim().toLowerCase();
  const incDomain = normalizeDomain(incoming.websiteUrl);
  const incPhone = normalizePhone(incoming.phone);
  const incName = normalizeText(incoming.businessName);
  const incLoc = normalizeText(incoming.locality || incoming.city);

  for (const existing of existingLeads) {
    // 1. Google Maps profile URL match
    if (incMaps && existing.googleMapsUrl && existing.googleMapsUrl.trim().toLowerCase() === incMaps) {
      return {
        isDuplicate: true,
        matchedLead: existing,
        matchReason: 'Exact Google Maps URL match',
      };
    }

    // 2. Website domain match
    const exDomain = normalizeDomain(existing.websiteUrl);
    if (incDomain && exDomain && incDomain === exDomain) {
      return {
        isDuplicate: true,
        matchedLead: existing,
        matchReason: `Website domain match (${incDomain})`,
      };
    }

    // 3. Normalized phone number match (at least 10 digits)
    const exPhone = normalizePhone(existing.phone);
    if (incPhone.length >= 10 && exPhone.length >= 10 && incPhone === exPhone) {
      return {
        isDuplicate: true,
        matchedLead: existing,
        matchReason: `Phone number match (${incPhone})`,
      };
    }

    // 4. Business name combined with locality/city (Never rely on business name alone)
    const exName = normalizeText(existing.businessName);
    const exLoc = normalizeText(existing.locality || existing.city);
    if (incName && exName && incName === exName && incLoc && exLoc && incLoc === exLoc) {
      return {
        isDuplicate: true,
        matchedLead: existing,
        matchReason: `Business Name + Locality match (${incoming.businessName} in ${incoming.locality || incoming.city})`,
      };
    }
  }

  return { isDuplicate: false };
}

const COLUMN_SYNONYMS: Record<string, string[]> = {
  businessName: ['business name', 'company name', 'place name', 'name', 'store name', 'shop name', 'business', 'title'],
  contactName: ['contact name', 'contact person', 'owner', 'owner name', 'manager', 'person'],
  phone: ['phone', 'telephone', 'mobile', 'phone number', 'contact number', 'tel', 'whatsapp'],
  email: ['email', 'email address', 'e-mail', 'mail'],
  websiteUrl: ['website', 'website url', 'url', 'web', 'domain', 'site'],
  googleMapsUrl: ['google maps url', 'google maps profile', 'maps url', 'gmaps', 'maps link', 'place url'],
  categoryName: ['category', 'business category', 'niche', 'industry', 'type', 'sector'],
  country: ['country', 'nation'],
  state: ['state', 'province', 'state/province', 'region'],
  district: ['district', 'county', 'district/county'],
  city: ['city', 'town', 'city/town', 'municipality'],
  locality: ['locality', 'neighborhood', 'area', 'suburb', 'ward', 'sector'],
  address: ['address', 'full address', 'street address', 'location address'],
  websiteStatus: ['website status', 'site status', 'has website'],
  estimatedDealValue: ['deal value', 'estimated value', 'potential deal value', 'budget', 'estimate'],
  notes: ['notes', 'comments', 'description', 'remarks'],
};

export function autoMapSpreadsheetColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const clean = header.trim().toLowerCase();
    for (const [targetField, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
      if (synonyms.includes(clean)) {
        mapping[header] = targetField;
        break;
      }
    }
    if (!mapping[header]) {
      mapping[header] = 'unmapped';
    }
  }
  return mapping;
}

export function sanitizeSpreadsheetCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Protect against spreadsheet formula injection (=, +, -, @, Tab, CR)
  // Exception: standard international phone numbers like "+91 98765 43210" are prefixed with "'" so Excel treats them as literal text
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function canUserPerformAction(
  role: string,
  action:
    | 'manage_locations'
    | 'delete_lead'
    | 'assign_leads'
    | 'approve_commission'
    | 'pay_commission'
    | 'manage_team'
    | 'manage_settings'
    | 'view_financials'
    | 'update_lead'
    | 'update_project'
): boolean {
  const normalizedRole = (role || 'admin').toLowerCase();
  if (normalizedRole === 'admin') return true;

  if (normalizedRole === 'outreacher') {
    return action === 'update_lead';
  }

  if (normalizedRole === 'developer') {
    return action === 'update_project';
  }

  return false;
}
