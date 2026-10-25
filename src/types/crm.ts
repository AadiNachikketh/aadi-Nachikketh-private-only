export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'admin' | 'outreacher' | 'developer' | string;
  accountStatus: string;
  languagesSpoken: string | null;
  startDate: string | null;
  assignedLocations: string | null;
  assignedCategories: string | null;
  commissionType: 'fixed' | 'percentage' | string;
  commissionRate: number;
  skills: string | null;
  specialities: string | null;
  employmentStatus: string | null;
  paymentArrangement: string | null;
  notes: string | null;
}

export interface GeoLocation {
  id: number;
  parentLocationId: number | null;
  name: string;
  normalizedName: string;
  locationType: string;
  administrativeLevel: number;
  countryCode: string;
  externalGeographicId: string;
  latitude: string | null;
  longitude: string | null;
  dataSource: string;
}

export interface SavedLocationRecord {
  id: number;
  locationId: number;
  status: string;
  priority: string;
  targetCategories: string | null;
  notes: string | null;
  targetLeadCount: number | null;
  assignedOutreacherId: number | null;
  lastResearchedAt: string | null;
  createdBy: string | null;
}

export interface BusinessCategory {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface LeadRecord {
  id: number;
  businessName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  googleMapsUrl: string | null;
  externalPlaceId: string | null;
  categoryId: number | null;
  categoryName: string;
  country: string;
  state: string | null;
  district: string | null;
  city: string | null;
  locality: string | null;
  locationId: number | null;
  address: string | null;
  websiteStatus: string;
  source: string;
  status: string;
  priority: string;
  assignedOutreacherId: number | null;
  assignedDeveloperId: number | null;
  estimatedDealValue: number;
  agreedDealValue: number;
  nextFollowUpAt: string | null;
  lastContactedAt: string | null;
  notes: string | null;
  tags: string | null;
  isArchived: boolean;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LeadActivityRecord {
  id: number;
  leadId: number;
  userId: number | null;
  userName: string;
  activityType: string;
  outcome: string | null;
  notes: string | null;
  occurredAt: string;
  nextFollowUpAt: string | null;
  isVerifiedIntegration: boolean;
}

export interface DealRecord {
  id: number;
  leadId: number;
  dealName: string;
  status: string;
  agreedValue: number;
  currency: string;
  outreacherId: number | null;
  wonAt: string;
}

export interface CommissionRecord {
  id: number;
  dealId: number;
  leadId: number | null;
  outreacherId: number;
  commissionType: string;
  commissionRate: number;
  amount: number;
  currency: string;
  calculationBasis: string | null;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  adminNotes: string | null;
}

export interface ProjectRecord {
  id: number;
  leadId: number | null;
  dealId: number | null;
  clientName: string;
  projectName: string;
  description: string | null;
  requirements: string | null;
  status: string;
  priority: string;
  assignedDeveloperId: number | null;
  collaboratorIds: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  deliveredAt: string | null;
  agreedPrice: number;
  currency: string;
  agreedDeveloperCost: number;
  otherExpenses: number;
  clientFeedback: string | null;
  revisionCount: number;
  notes: string | null;
}

export interface ProjectTaskRecord {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: 'To Do' | 'In Progress' | 'Blocked' | 'In Review' | 'Completed' | string;
  priority: string;
  assignedDeveloperId: number | null;
  dueDate: string | null;
  completedAt: string | null;
}

export interface PaymentRecord {
  id: number;
  projectId: number | null;
  dealId: number | null;
  payerOrPayee: string;
  paymentDirection: 'inbound_client' | 'outbound_developer' | 'outbound_expense' | 'outbound_commission' | string;
  paymentType: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string;
  reference: string;
  notes: string | null;
}

export interface ImportJobRecord {
  id: number;
  filename: string;
  importType: string;
  status: string;
  rowsRead: number;
  rowsImported: number;
  rowsSkipped: number;
  rowsFailed: number;
  createdBy: string | null;
  createdAt: string | null;
}

export interface AuditLogRecord {
  id: number;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: string | null;
}

export interface AgencySettingsRecord {
  id: number;
  agencyName: string;
  defaultCurrency: string;
  timezone: string;
  dateFormat: string;
  defaultCommissionType: string;
  defaultCommissionValue: number;
  leadStatuses: string;
  projectStatuses: string;
}

export interface CrmState {
  users: UserProfile[];
  locations: GeoLocation[];
  savedLocations: SavedLocationRecord[];
  categories: BusinessCategory[];
  leads: LeadRecord[];
  activities: LeadActivityRecord[];
  assignments: Array<{ id: number; leadId: number; assignedUserId: number; assignedBy: string | null; assignedAt: string | null }>;
  deals: DealRecord[];
  commissions: CommissionRecord[];
  projects: ProjectRecord[];
  tasks: ProjectTaskRecord[];
  payments: PaymentRecord[];
  importJobs: ImportJobRecord[];
  auditLogs: AuditLogRecord[];
  settings: AgencySettingsRecord | null;
}
