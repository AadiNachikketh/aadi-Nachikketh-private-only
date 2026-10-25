import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('admin'), // 'admin' | 'outreacher' | 'developer'
  accountStatus: text('account_status').notNull().default('Active'),
  languagesSpoken: text('languages_spoken'),
  startDate: text('start_date'),
  assignedLocations: text('assigned_locations'),
  assignedCategories: text('assigned_categories'),
  commissionType: text('commission_type').notNull().default('fixed'), // 'fixed' | 'percentage'
  commissionRate: integer('commission_rate').notNull().default(1000), // INR or percentage
  skills: text('skills'),
  specialities: text('specialities'),
  employmentStatus: text('employment_status').default('Contractor'),
  paymentArrangement: text('payment_arrangement'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  parentLocationId: integer('parent_location_id'),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull(),
  locationType: text('location_type').notNull(), // 'Country' | 'State / Province' | 'District / County' | 'City / Town' | 'Locality'
  administrativeLevel: integer('administrative_level').notNull(), // 0..4
  countryCode: text('country_code').notNull(),
  externalGeographicId: text('external_geographic_id').notNull().unique(),
  latitude: text('latitude'),
  longitude: text('longitude'),
  dataSource: text('data_source').notNull().default('GeoNames'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const savedLocations = pgTable('saved_locations', {
  id: serial('id').primaryKey(),
  locationId: integer('location_id')
    .references(() => locations.id)
    .notNull()
    .unique(),
  status: text('status').notNull().default('Not Started'), // 'Not Started' | 'Researching' | 'Ready for Outreach' | 'In Progress' | 'Completed' | 'Paused'
  priority: text('priority').notNull().default('Medium'), // 'High' | 'Medium' | 'Low'
  targetCategories: text('target_categories'),
  notes: text('notes'),
  targetLeadCount: integer('target_lead_count').default(50),
  assignedOutreacherId: integer('assigned_outreacher_id').references(() => users.id),
  lastResearchedAt: text('last_researched_at'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const businessCategories = pgTable('business_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  businessName: text('business_name').notNull(),
  contactName: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  websiteUrl: text('website_url'),
  googleMapsUrl: text('google_maps_url'),
  externalPlaceId: text('external_place_id'),
  categoryId: integer('category_id').references(() => businessCategories.id),
  categoryName: text('category_name').notNull().default('Jewellery Stores'),
  country: text('country').notNull().default('India'),
  state: text('state'),
  district: text('district'),
  city: text('city'),
  locality: text('locality'),
  locationId: integer('location_id').references(() => locations.id),
  address: text('address'),
  websiteStatus: text('website_status').notNull().default('Website Status Unknown'), // 'No Website' | 'Has Website' | 'Website Needs Improvement' | 'Website Status Unknown'
  source: text('source').notNull().default('Manual Entry'),
  status: text('status').notNull().default('New Lead'),
  priority: text('priority').notNull().default('Medium'),
  assignedOutreacherId: integer('assigned_outreacher_id').references(() => users.id),
  assignedDeveloperId: integer('assigned_developer_id').references(() => users.id),
  estimatedDealValue: integer('estimated_deal_value').notNull().default(0),
  agreedDealValue: integer('agreed_deal_value').notNull().default(0),
  nextFollowUpAt: text('next_follow_up_at'),
  lastContactedAt: text('last_contacted_at'),
  notes: text('notes'),
  tags: text('tags'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const leadActivities = pgTable('lead_activities', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id')
    .references(() => leads.id)
    .notNull(),
  userId: integer('user_id').references(() => users.id),
  userName: text('user_name').notNull().default('Admin'),
  activityType: text('activity_type').notNull(), // 'Phone Call' | 'Email' | 'WhatsApp Message' | 'Meeting' | 'Proposal' | 'Follow-up' | 'Note' | 'Status Change'
  outcome: text('outcome'),
  notes: text('notes'),
  occurredAt: text('occurred_at').notNull(),
  nextFollowUpAt: text('next_follow_up_at'),
  isVerifiedIntegration: boolean('is_verified_integration').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const leadAssignments = pgTable('lead_assignments', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id')
    .references(() => leads.id)
    .notNull(),
  assignedUserId: integer('assigned_user_id')
    .references(() => users.id)
    .notNull(),
  assignedBy: text('assigned_by'),
  notes: text('notes'),
  assignedAt: timestamp('assigned_at').defaultNow(),
});

export const deals = pgTable('deals', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id')
    .references(() => leads.id)
    .notNull()
    .unique(),
  dealName: text('deal_name').notNull(),
  status: text('status').notNull().default('Deal Won'),
  agreedValue: integer('agreed_value').notNull().default(0),
  currency: text('currency').notNull().default('INR'),
  outreacherId: integer('outreacher_id').references(() => users.id),
  wonAt: text('won_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const commissions = pgTable('commissions', {
  id: serial('id').primaryKey(),
  dealId: integer('deal_id')
    .references(() => deals.id)
    .notNull()
    .unique(),
  leadId: integer('lead_id').references(() => leads.id),
  outreacherId: integer('outreacher_id')
    .references(() => users.id)
    .notNull(),
  commissionType: text('commission_type').notNull().default('fixed'), // 'fixed' | 'percentage'
  commissionRate: integer('commission_rate').notNull().default(1000),
  amount: integer('amount').notNull().default(1000),
  currency: text('currency').notNull().default('INR'),
  calculationBasis: text('calculation_basis'),
  status: text('status').notNull().default('Pending'), // 'Pending' | 'Approved' | 'Paid' | 'Cancelled'
  approvedBy: text('approved_by'),
  approvedAt: text('approved_at'),
  paidAt: text('paid_at'),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id').references(() => leads.id),
  dealId: integer('deal_id').references(() => deals.id),
  clientName: text('client_name').notNull(),
  projectName: text('project_name').notNull(),
  description: text('description'),
  requirements: text('requirements'),
  status: text('status').notNull().default('Not Started'),
  priority: text('priority').notNull().default('Medium'),
  assignedDeveloperId: integer('assigned_developer_id').references(() => users.id),
  collaboratorIds: text('collaborator_ids'),
  startDate: text('start_date'),
  dueDate: text('due_date'),
  completedAt: text('completed_at'),
  deliveredAt: text('delivered_at'),
  agreedPrice: integer('agreed_price').notNull().default(0),
  currency: text('currency').notNull().default('INR'),
  agreedDeveloperCost: integer('agreed_developer_cost').notNull().default(0),
  otherExpenses: integer('other_expenses').notNull().default(0),
  clientFeedback: text('client_feedback'),
  revisionCount: integer('revision_count').notNull().default(0),
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const projectTasks = pgTable('project_tasks', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('To Do'), // 'To Do' | 'In Progress' | 'Blocked' | 'In Review' | 'Completed'
  priority: text('priority').notNull().default('Medium'),
  assignedDeveloperId: integer('assigned_developer_id').references(() => users.id),
  dueDate: text('due_date'),
  completedAt: text('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id),
  dealId: integer('deal_id').references(() => deals.id),
  payerOrPayee: text('payer_or_payee').notNull(),
  paymentDirection: text('payment_direction').notNull(), // 'inbound_client' | 'outbound_developer' | 'outbound_expense' | 'outbound_commission'
  paymentType: text('payment_type').notNull(), // 'Advance' | 'Milestone' | 'Final Balance' | 'Developer Payout' | 'Project Expense' | 'Commission Payout' | 'Refund'
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('INR'),
  status: text('status').notNull().default('Completed'),
  paidAt: text('paid_at').notNull(),
  reference: text('reference').notNull(),
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const importJobs = pgTable('import_jobs', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  importType: text('import_type').notNull(),
  status: text('status').notNull().default('Completed'),
  rowsRead: integer('rows_read').notNull().default(0),
  rowsImported: integer('rows_imported').notNull().default(0),
  rowsSkipped: integer('rows_skipped').notNull().default(0),
  rowsFailed: integer('rows_failed').notNull().default(0),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull().default('admin'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const agencySettings = pgTable('agency_settings', {
  id: serial('id').primaryKey(),
  agencyName: text('agency_name').notNull().default('Agency Command Center'),
  defaultCurrency: text('default_currency').notNull().default('INR'),
  timezone: text('timezone').notNull().default('Asia/Kolkata'),
  dateFormat: text('date_format').notNull().default('YYYY-MM-DD'),
  defaultCommissionType: text('default_commission_type').notNull().default('fixed'),
  defaultCommissionValue: integer('default_commission_value').notNull().default(1000),
  leadStatuses: text('lead_statuses').notNull(),
  projectStatuses: text('project_statuses').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignedLeads: many(leads),
  activities: many(leadActivities),
  commissions: many(commissions),
  assignedProjects: many(projects),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  category: one(businessCategories, {
    fields: [leads.categoryId],
    references: [businessCategories.id],
  }),
  location: one(locations, {
    fields: [leads.locationId],
    references: [locations.id],
  }),
  outreacher: one(users, {
    fields: [leads.assignedOutreacherId],
    references: [users.id],
  }),
  activities: many(leadActivities),
}));
