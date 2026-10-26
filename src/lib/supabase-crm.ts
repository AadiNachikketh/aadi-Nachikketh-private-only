import { supabase } from '../supabaseClient.js';
import {
  CrmState,
  LeadRecord,
  LeadActivityRecord,
  SavedLocationRecord,
  ProjectRecord,
  ProjectTaskRecord,
  PaymentRecord,
  UserProfile,
  CommissionRecord,
  BusinessCategory,
} from '../types/crm';
import {
  getClientFallbackState,
  executeClientFallbackMutation,
} from './client-fallback-store';
import { calculateCommissionAmount } from './crm-logic';

const LOCAL_STORAGE_KEY = 'agency_command_center_static_state_v1';

function saveStateToLocalStorage(state: CrmState) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    }
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Extracts an unknown or foreign-key-failing column name from a Supabase / PostgREST error message if present.
 */
function extractMissingColumn(errorMsg: string): string | null {
  // PostgREST format: Could not find the 'column_name' column of 'table_name' in the schema cache
  const pgrstMatch = errorMsg.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch?.[1]) return pgrstMatch[1];

  // Postgres format: column "column_name" of relation "table_name" does not exist
  const pgMatch = errorMsg.match(/column "([^"]+)" of relation/i);
  if (pgMatch?.[1]) return pgMatch[1];

  // Postgres FK detail format: Key (column_name)=(...) is not present in table
  const fkDetailMatch = errorMsg.match(/Key \(([^)]+)\)=\([^)]+\) is not present/i);
  if (fkDetailMatch?.[1]) return fkDetailMatch[1];

  // Postgres FK constraint name format: violates foreign key constraint "..._assigned_outreacher_id_fkey"
  const fkColCandidates = [
    'assigned_outreacher_id',
    'assigned_developer_id',
    'assigned_to',
    'location_id',
    'project_id',
    'lead_id',
    'outreacher_id',
  ];
  if (/foreign key constraint/i.test(errorMsg)) {
    for (const col of fkColCandidates) {
      if (errorMsg.includes(col)) return col;
    }
  }

  return null;
}

/**
 * Inserts a row into a Supabase table, automatically stripping any columns
 * that do not exist in the user's table schema or fail FK constraints so inserts never fail.
 */
async function resilientInsert(
  table: string,
  initialRow: Record<string, any>
): Promise<{ data: any | null; error: any | null }> {
  const row = { ...initialRow };
  for (let attempt = 0; attempt < 25; attempt++) {
    const { data, error } = await supabase.from(table).insert([row]).select().maybeSingle();
    if (!error) {
      return { data, error: null };
    }
    const fullErrText = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
    const missingCol = extractMissingColumn(fullErrText);
    if (missingCol && missingCol in row) {
      delete row[missingCol];
      continue;
    }
    return { data: null, error };
  }
  return { data: null, error: new Error('Max insert retries exceeded') };
}

/**
 * Updates a row in a Supabase table, automatically stripping any columns
 * that do not exist in the user's table schema or fail FK constraints.
 */
async function resilientUpdate(
  table: string,
  initialRow: Record<string, any>,
  matchCol: string,
  matchVal: any,
  userId: string
): Promise<{ error: any | null }> {
  const row = { ...initialRow };
  for (let attempt = 0; attempt < 25; attempt++) {
    const { error } = await supabase
      .from(table)
      .update(row)
      .eq(matchCol, matchVal)
      .eq('user_id', userId);
    if (!error) {
      return { error: null };
    }
    const fullErrText = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
    const missingCol = extractMissingColumn(fullErrText);
    if (missingCol && missingCol in row) {
      delete row[missingCol];
      continue;
    }
    return { error };
  }
  return { error: new Error('Max update retries exceeded') };
}

/**
 * Maps snake_case rows from Supabase (supporting both SQL schemas) to LeadRecord.
 */
function mapLeadFromRow(row: any): LeadRecord {
  return {
    id: Number(row.id),
    businessName: row.business_name || '',
    contactName: row.contact_name ?? row.client_owner_name ?? '',
    phone: row.phone || row.whatsapp || '',
    email: row.email || '',
    websiteUrl: row.website_url ?? row.existing_website_url ?? '',
    googleMapsUrl: row.google_maps_url ?? row.google_maps_link ?? '',
    externalPlaceId: null,
    categoryId: null,
    categoryName: row.category_name || row.category || 'Jewellery Stores',
    country: row.country || 'India',
    state: row.state || '',
    district: row.district || '',
    city: row.city || '',
    locality: row.locality || '',
    locationId: row.location_id ? Number(row.location_id) : null,
    address: row.address ?? row.full_address ?? '',
    websiteStatus: row.website_status || row.has_website || 'No Website',
    source: row.source || row.lead_source || 'Manual Entry',
    status: row.status || row.outreach_status || 'New Lead',
    priority: row.priority || row.client_interest_level || 'Medium',
    assignedOutreacherId: row.assigned_outreacher_id ? Number(row.assigned_outreacher_id) : null,
    assignedDeveloperId: row.assigned_developer_id ? Number(row.assigned_developer_id) : null,
    estimatedDealValue: Number(row.estimated_deal_value) || 0,
    agreedDealValue: Number(row.agreed_deal_value ?? row.final_deal_value) || 0,
    nextFollowUpAt: row.next_follow_up_at ?? row.next_follow_up_date ?? '',
    lastContactedAt: row.last_contacted_at ?? row.last_contact_date ?? '',
    notes: row.notes ?? row.summary_notes ?? row.follow_up_notes ?? '',
    tags: row.tags || '',
    isArchived: Boolean(row.is_archived),
    createdBy: row.created_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapActivityFromRow(row: any): LeadActivityRecord {
  return {
    id: Number(row.id),
    leadId: Number(row.lead_id),
    userId: null,
    userName: row.user_name || row.performed_by || 'Operator',
    activityType: row.activity_type || row.action || 'Phone Call',
    outcome: row.outcome || 'Connected',
    notes: row.notes ?? row.details ?? '',
    occurredAt: row.occurred_at || (row.created_at ? String(row.created_at).slice(0, 16).replace('T', ' ') : ''),
    nextFollowUpAt: row.next_follow_up_at || null,
    isVerifiedIntegration: false,
  };
}

function mapSavedLocFromRow(row: any, allLocations: CrmState['locations']): SavedLocationRecord {
  let locId = row.location_id ? Number(row.location_id) : 0;
  if (!locId && row.locality) {
    const match = allLocations.find(
      (l) => l.name.toLowerCase() === String(row.locality).toLowerCase()
    );
    if (match) locId = match.id;
  }
  return {
    id: Number(row.id),
    locationId: locId,
    status: row.status || 'Not Started',
    priority: row.priority || 'High',
    targetCategories: row.target_categories || 'Jewellery Stores',
    notes: row.notes || '',
    targetLeadCount: Number(row.target_lead_count) || 40,
    assignedOutreacherId: row.assigned_outreacher_id ? Number(row.assigned_outreacher_id) : null,
    lastResearchedAt: row.last_researched_at || (row.created_at ? String(row.created_at).slice(0, 10) : ''),
    createdBy: null,
  };
}

function mapProjectFromRow(row: any): ProjectRecord {
  return {
    id: Number(row.id),
    leadId: row.lead_id ? Number(row.lead_id) : null,
    dealId: null,
    clientName: row.client_name || '',
    projectName: row.project_name || row.project_title || row.business_name || '',
    description: row.description || row.website_type || '',
    requirements: row.requirements || row.features_requested || '',
    status: row.status || 'Not Started',
    priority: row.priority || 'Medium',
    assignedDeveloperId: row.assigned_developer_id ? Number(row.assigned_developer_id) : null,
    collaboratorIds: row.collaborator_ids || '',
    startDate: row.start_date || '',
    dueDate: row.due_date || row.deadline || '',
    completedAt: row.completed_at || null,
    deliveredAt: row.delivered_at || row.delivery_date || null,
    agreedPrice: Number(row.agreed_price ?? row.price) || 0,
    currency: row.currency || 'INR',
    agreedDeveloperCost: Number(row.agreed_developer_cost) || 0,
    otherExpenses: Number(row.other_expenses) || 0,
    clientFeedback: row.client_feedback || '',
    revisionCount: Number(row.revision_count) || 0,
    notes: row.notes || row.internal_notes || '',
  };
}

function mapTaskFromRow(row: any): ProjectTaskRecord {
  const status =
    row.status || (row.is_completed !== undefined ? (row.is_completed ? 'Completed' : 'To Do') : 'To Do');
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    title: row.title || '',
    description: row.description || '',
    status,
    priority: row.priority || 'Medium',
    assignedDeveloperId:
      row.assigned_developer_id || row.assigned_to
        ? Number(row.assigned_developer_id || row.assigned_to)
        : null,
    dueDate: row.due_date || '',
    completedAt: row.completed_at || null,
  };
}

function mapPaymentFromRow(row: any): PaymentRecord {
  return {
    id: Number(row.id),
    projectId: row.project_id ? Number(row.project_id) : null,
    dealId: null,
    payerOrPayee: row.payer_or_payee || 'Client',
    paymentDirection: row.payment_direction || 'inbound_client',
    paymentType: row.payment_type || 'Advance',
    amount: Number(row.amount) || 0,
    currency: row.currency || 'INR',
    status: row.status || 'Completed',
    paidAt: row.paid_at ? String(row.paid_at).slice(0, 10) : '',
    reference: row.reference || `PAY-${row.id}`,
    notes: row.notes || '',
  };
}

function mapTeamMemberFromRow(row: any): UserProfile {
  return {
    id: Number(row.id),
    uid: `sb-${row.id}`,
    email: row.email || '',
    fullName: row.full_name || '',
    phone: row.phone || '',
    role: row.role || 'outreacher',
    accountStatus: row.account_status || row.status || 'Active',
    languagesSpoken: row.languages_spoken || 'English, Hindi',
    startDate: row.start_date || (row.joined_at ? String(row.joined_at).slice(0, 10) : ''),
    assignedLocations: row.assigned_locations || '',
    assignedCategories: row.assigned_categories || '',
    commissionType: row.commission_type || 'fixed',
    commissionRate: Number(row.commission_rate) || 0,
    skills: row.skills || row.specialization || '',
    specialities: row.specialities || row.specialization || '',
    employmentStatus: row.employment_status || 'Contractor',
    paymentArrangement: row.payment_arrangement || '',
    notes: row.notes || '',
  };
}

function mapCommissionFromRow(row: any): CommissionRecord {
  return {
    id: Number(row.id),
    dealId: Number(row.lead_id || row.id),
    leadId: row.lead_id ? Number(row.lead_id) : null,
    outreacherId: Number(row.outreacher_id),
    commissionType: row.commission_type || 'fixed',
    commissionRate: Number(row.commission_rate) || 1000,
    amount: Number(row.amount) || 0,
    currency: row.currency || 'INR',
    calculationBasis: row.calculation_basis || 'Deal Won Commission',
    status: row.status || 'Pending',
    approvedBy: null,
    approvedAt: null,
    paidAt: row.paid_at || null,
    adminNotes: row.admin_notes || '',
  };
}

function mapCategoryFromRow(row: any): BusinessCategory {
  return {
    id: Number(row.id),
    name: row.name || '',
    description: row.description || '',
    isActive: row.is_active !== false,
  };
}

/**
 * Merges remote Supabase leads with local fallback leads so newly created leads
 * and local Outreacher / Developer assignments never disappear.
 */
function mergeLeads(remoteLeads: LeadRecord[], localLeads: LeadRecord[]): LeadRecord[] {
  const localById = new Map(localLeads.map((l) => [l.id, l]));
  const localByKey = new Map(
    localLeads.map((l) => [
      `${(l.businessName || '').trim().toLowerCase()}|${(l.phone || '').trim()}`,
      l,
    ])
  );

  const merged: LeadRecord[] = remoteLeads.map((remote) => {
    const key = `${(remote.businessName || '').trim().toLowerCase()}|${(remote.phone || '').trim()}`;
    const localMatch = localById.get(remote.id) || localByKey.get(key);
    if (!localMatch) return remote;
    return {
      ...remote,
      assignedOutreacherId:
        localMatch.assignedOutreacherId !== undefined
          ? localMatch.assignedOutreacherId
          : remote.assignedOutreacherId,
      assignedDeveloperId:
        localMatch.assignedDeveloperId !== undefined
          ? localMatch.assignedDeveloperId
          : remote.assignedDeveloperId,
      status: localMatch.status || remote.status,
      agreedDealValue: localMatch.agreedDealValue || remote.agreedDealValue,
      nextFollowUpAt: localMatch.nextFollowUpAt || remote.nextFollowUpAt,
      notes: localMatch.notes || remote.notes,
      isArchived: localMatch.isArchived ?? remote.isArchived,
    };
  });

  const seenIds = new Set(merged.map((l) => l.id));
  const seenKeys = new Set(
    merged.map(
      (l) => `${(l.businessName || '').trim().toLowerCase()}|${(l.phone || '').trim()}`
    )
  );

  for (const local of localLeads) {
    const key = `${(local.businessName || '').trim().toLowerCase()}|${(local.phone || '').trim()}`;
    if (!seenIds.has(local.id) && !seenKeys.has(key)) {
      merged.push(local);
      seenIds.add(local.id);
      seenKeys.add(key);
    }
  }
  return merged;
}

function mergeProjects(remoteProjects: ProjectRecord[], localProjects: ProjectRecord[]): ProjectRecord[] {
  const localById = new Map(localProjects.map((p) => [p.id, p]));
  const localByName = new Map(
    localProjects.map((p) => [(p.projectName || '').trim().toLowerCase(), p])
  );

  const merged: ProjectRecord[] = remoteProjects.map((remote) => {
    const localMatch =
      localById.get(remote.id) || localByName.get((remote.projectName || '').trim().toLowerCase());
    if (!localMatch) return remote;
    return {
      ...remote,
      assignedDeveloperId:
        localMatch.assignedDeveloperId !== undefined
          ? localMatch.assignedDeveloperId
          : remote.assignedDeveloperId,
      status: localMatch.status || remote.status,
      dueDate: localMatch.dueDate || remote.dueDate,
    };
  });

  const seenIds = new Set(merged.map((p) => p.id));
  const seenNames = new Set(merged.map((p) => (p.projectName || '').trim().toLowerCase()));

  for (const local of localProjects) {
    const nameKey = (local.projectName || '').trim().toLowerCase();
    if (!seenIds.has(local.id) && (!nameKey || !seenNames.has(nameKey))) {
      merged.push(local);
      seenIds.add(local.id);
      if (nameKey) seenNames.add(nameKey);
    }
  }
  return merged;
}

function mergeTasks(remoteTasks: ProjectTaskRecord[], localTasks: ProjectTaskRecord[]): ProjectTaskRecord[] {
  const localById = new Map(localTasks.map((t) => [t.id, t]));
  const localByKey = new Map(
    localTasks.map((t) => [`${t.projectId}|${(t.title || '').trim().toLowerCase()}`, t])
  );

  const merged: ProjectTaskRecord[] = remoteTasks.map((remote) => {
    const key = `${remote.projectId}|${(remote.title || '').trim().toLowerCase()}`;
    const localMatch = localById.get(remote.id) || localByKey.get(key);
    if (!localMatch) return remote;
    return {
      ...remote,
      assignedDeveloperId:
        localMatch.assignedDeveloperId !== undefined
          ? localMatch.assignedDeveloperId
          : remote.assignedDeveloperId,
      status: localMatch.status || remote.status,
      dueDate: localMatch.dueDate || remote.dueDate,
    };
  });

  const seenIds = new Set(merged.map((t) => t.id));
  const seenKeys = new Set(
    merged.map((t) => `${t.projectId}|${(t.title || '').trim().toLowerCase()}`)
  );

  for (const local of localTasks) {
    const key = `${local.projectId}|${(local.title || '').trim().toLowerCase()}`;
    if (!seenIds.has(local.id) && !seenKeys.has(key)) {
      merged.push(local);
      seenIds.add(local.id);
      seenKeys.add(key);
    }
  }
  return merged;
}

function mergeTeamMembers(remoteUsers: UserProfile[], localUsers: UserProfile[]): UserProfile[] {
  const merged: UserProfile[] = [...remoteUsers];
  const seenIds = new Set(remoteUsers.map((u) => u.id));
  const seenEmails = new Set(
    remoteUsers.map((u) => (u.email || '').trim().toLowerCase()).filter(Boolean)
  );

  for (const local of localUsers) {
    const emailKey = (local.email || '').trim().toLowerCase();
    if (!seenIds.has(local.id) && (!emailKey || !seenEmails.has(emailKey))) {
      merged.push(local);
      seenIds.add(local.id);
      if (emailKey) seenEmails.add(emailKey);
    }
  }
  return merged;
}

/**
 * 1. LOAD USER'S DATA FROM SUPABASE
 */
export async function loadSupabaseCrmState(): Promise<CrmState> {
  const baseState = getClientFallbackState();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return baseState;
  }

  const [
    leadsRes,
    activitiesRes,
    savedLocsRes,
    projectsRes,
    tasksRes,
    paymentsRes,
    teamRes,
    commissionsRes,
    categoriesRes,
  ] = await Promise.all([
    supabase.from('leads').select('*').order('id', { ascending: false }),
    supabase.from('lead_activities').select('*').order('id', { ascending: false }),
    supabase.from('saved_locations').select('*').order('id', { ascending: false }),
    supabase.from('projects').select('*').order('id', { ascending: false }),
    supabase.from('project_tasks').select('*').order('id', { ascending: true }),
    supabase.from('payments').select('*').order('id', { ascending: false }),
    supabase.from('team_members').select('*').order('id', { ascending: true }),
    supabase.from('commissions').select('*').order('id', { ascending: false }),
    supabase.from('business_categories').select('*').order('id', { ascending: true }),
  ]);

  if (leadsRes.error) {
    return baseState;
  }

  const remoteLeads = (leadsRes.data || []).map(mapLeadFromRow);
  const leads = mergeLeads(remoteLeads, baseState.leads);
  const wonLeads = leads.filter((l) => l.status === 'Deal Won');

  const nextState: CrmState = {
    ...baseState,
    leads,
    activities:
      activitiesRes.error || !activitiesRes.data?.length
        ? baseState.activities
        : activitiesRes.data.map(mapActivityFromRow),
    savedLocations:
      savedLocsRes.error || !savedLocsRes.data?.length
        ? baseState.savedLocations
        : savedLocsRes.data
            .map((r: any) => mapSavedLocFromRow(r, baseState.locations))
            .filter((s: SavedLocationRecord) => s.locationId > 0),
    projects:
      projectsRes.error || !projectsRes.data?.length
        ? baseState.projects
        : mergeProjects(projectsRes.data.map(mapProjectFromRow), baseState.projects),
    tasks:
      tasksRes.error || !tasksRes.data?.length
        ? baseState.tasks
        : mergeTasks(tasksRes.data.map(mapTaskFromRow), baseState.tasks),
    payments:
      paymentsRes.error || !paymentsRes.data?.length
        ? baseState.payments
        : paymentsRes.data.map(mapPaymentFromRow),
    users:
      !teamRes.error && teamRes.data && teamRes.data.length > 0
        ? mergeTeamMembers(teamRes.data.map(mapTeamMemberFromRow), baseState.users)
        : baseState.users,
    commissions:
      commissionsRes.error || !commissionsRes.data?.length
        ? baseState.commissions
        : commissionsRes.data.map(mapCommissionFromRow),
    categories:
      !categoriesRes.error && categoriesRes.data && categoriesRes.data.length > 0
        ? categoriesRes.data.map(mapCategoryFromRow)
        : baseState.categories,
    deals: wonLeads.map((wl) => ({
      id: wl.id,
      leadId: wl.id,
      dealName: `${wl.businessName} — Website Deal`,
      status: 'Deal Won',
      agreedValue: wl.agreedDealValue || wl.estimatedDealValue,
      currency: 'INR',
      outreacherId: wl.assignedOutreacherId,
      wonAt: (wl.updatedAt || '').slice(0, 10),
    })),
  };

  saveStateToLocalStorage(nextState);
  return nextState;
}

/**
 * 2. CREATE, UPDATE & DELETE ITEMS IN SUPABASE
 */
export async function mutateSupabaseCrmState(
  action: string,
  payload: Record<string, any>,
  actorRole: string,
  actorName: string
): Promise<CrmState> {
  // Capture lead business names prior to local deletion so Supabase rows can also be matched by business_name
  const preDeleteState = getClientFallbackState();
  const deletedLeadBusinessNames =
    action === 'DELETE_LEADS'
      ? preDeleteState.leads
          .filter((l) => (payload.leadIds || []).map((n: unknown) => Number(n)).includes(l.id))
          .map((l) => l.businessName)
          .filter(Boolean)
      : [];

  // Always apply to local state first so UI updates immediately and never loses data
  const updatedLocalState = executeClientFallbackMutation(action, payload, actorRole, actorName);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return updatedLocalState;
  }

  const userId = session.user.id;
  const today = new Date().toISOString().slice(0, 10);

  switch (action) {
    // CREATE OR UPDATE A LEAD
    case 'UPSERT_LEAD': {
      // Include columns for both SQL schemas; resilientInsert/resilientUpdate strips any column not in the DB
      const combinedLeadRow: Record<string, any> = {
        user_id: userId,
        business_name: String(payload.businessName || '').trim(),
        // Schema A columns
        contact_name: payload.contactName || '',
        website_url: payload.websiteUrl || '',
        google_maps_url: payload.googleMapsUrl || '',
        category_name: payload.categoryName || 'Jewellery Stores',
        location_id: payload.locationId ? Number(payload.locationId) : null,
        address: payload.address || '',
        website_status: payload.websiteStatus || 'No Website',
        source: payload.source || 'Manual Entry',
        status: payload.status || 'New Lead',
        priority: payload.priority || 'Medium',
        assigned_developer_id: payload.assignedDeveloperId ? Number(payload.assignedDeveloperId) : null,
        agreed_deal_value: Number(payload.agreedDealValue) || 0,
        next_follow_up_at: payload.nextFollowUpAt || '',
        notes: payload.notes || '',
        tags: payload.tags || '',
        // Schema B columns
        client_owner_name: payload.contactName || '',
        existing_website_url: payload.websiteUrl || '',
        google_maps_link: payload.googleMapsUrl || '',
        category: payload.categoryName || 'Jewellery Stores',
        full_address: payload.address || '',
        has_website: payload.websiteStatus || 'No Website',
        lead_source: payload.source || 'Manual Entry',
        outreach_status: payload.status || 'New Lead',
        client_interest_level: payload.priority || 'Medium',
        final_deal_value: Number(payload.agreedDealValue) || 0,
        next_follow_up_date: payload.nextFollowUpAt || '',
        summary_notes: payload.notes || '',
        // Shared columns
        phone: payload.phone || '',
        email: payload.email || '',
        country: payload.country || 'India',
        state: payload.state || '',
        district: payload.district || '',
        city: payload.city || '',
        locality: payload.locality || '',
        assigned_outreacher_id: payload.assignedOutreacherId ? Number(payload.assignedOutreacherId) : null,
        estimated_deal_value: Number(payload.estimatedDealValue) || 0,
        updated_at: new Date().toISOString(),
      };

      if (payload.id) {
        await resilientUpdate('leads', combinedLeadRow, 'id', Number(payload.id), userId);
      } else {
        const { data: inserted } = await resilientInsert('leads', combinedLeadRow);
        if (inserted?.id) {
          // Sync the generated database ID back into local state so we don't duplicate
          const latestLocal = getClientFallbackState();
          const topIdx = latestLocal.leads.findIndex(
            (l) =>
              l.businessName === combinedLeadRow.business_name &&
              l.phone === combinedLeadRow.phone
          );
          if (topIdx >= 0) {
            latestLocal.leads[topIdx].id = Number(inserted.id);
            saveStateToLocalStorage(latestLocal);
          }

          if (payload.status === 'Deal Won' && payload.assignedOutreacherId) {
            const finalAgreed =
              Number(payload.agreedDealValue) || Number(payload.estimatedDealValue) || 35000;
            const commCalc = calculateCommissionAmount(finalAgreed, 'fixed', 1000);
            await resilientInsert('commissions', {
              user_id: userId,
              lead_id: inserted.id,
              outreacher_id: Number(payload.assignedOutreacherId),
              commission_type: 'fixed',
              commission_rate: 1000,
              amount: commCalc.amount,
              currency: 'INR',
              calculation_basis: commCalc.calculationBasis,
              status: 'Pending',
            });
          }
        }
      }
      break;
    }

    // BULK UPDATE LEADS
    case 'BULK_UPDATE_LEADS': {
      const validIds = (payload.leadIds || []).map((n: unknown) => Number(n)).filter(Boolean);
      for (const id of validIds) {
        const updateObj: Record<string, any> = { updated_at: new Date().toISOString() };
        if (payload.assignedOutreacherId !== undefined) {
          updateObj.assigned_outreacher_id = payload.assignedOutreacherId
            ? Number(payload.assignedOutreacherId)
            : null;
        }
        if (payload.status !== undefined) {
          updateObj.status = payload.status;
          updateObj.outreach_status = payload.status;
        }
        if (payload.isArchived !== undefined) {
          updateObj.is_archived = Boolean(payload.isArchived);
        }
        await resilientUpdate('leads', updateObj, 'id', id, userId);
      }
      break;
    }

    // DELETE LEADS
    case 'DELETE_LEADS': {
      const validIds = (payload.leadIds || []).map((n: unknown) => Number(n)).filter(Boolean);
      if (validIds.length > 0) {
        await supabase.from('leads').delete().in('id', validIds).eq('user_id', userId);
      }
      if (deletedLeadBusinessNames.length > 0) {
        await supabase
          .from('leads')
          .delete()
          .in('business_name', deletedLeadBusinessNames)
          .eq('user_id', userId);
      }
      break;
    }

    // CLEAR ALL LEADS
    case 'CLEAR_ALL_LEADS': {
      await supabase.from('leads').delete().eq('user_id', userId);
      break;
    }

    // ADD LEAD ACTIVITY
    case 'ADD_LEAD_ACTIVITY': {
      const timestamp =
        payload.occurredAt || new Date().toISOString().slice(0, 16).replace('T', ' ');
      await resilientInsert('lead_activities', {
        user_id: userId,
        lead_id: Number(payload.leadId),
        user_name: actorName,
        performed_by: actorName,
        activity_type: payload.activityType || 'Phone Call',
        action: payload.activityType || 'Phone Call',
        outcome: payload.outcome || 'Connected',
        notes: payload.notes || '',
        details: payload.notes || '',
        occurred_at: timestamp,
        next_follow_up_at: payload.nextFollowUpAt || '',
      });

      const leadUpdate: Record<string, any> = {
        last_contacted_at: timestamp.slice(0, 10),
        last_contact_date: timestamp.slice(0, 10),
        updated_at: new Date().toISOString(),
      };
      if (payload.nextFollowUpAt) {
        leadUpdate.next_follow_up_at = payload.nextFollowUpAt;
        leadUpdate.next_follow_up_date = payload.nextFollowUpAt;
      }
      if (payload.newLeadStatus) {
        leadUpdate.status = payload.newLeadStatus;
        leadUpdate.outreach_status = payload.newLeadStatus;
      }

      await resilientUpdate('leads', leadUpdate, 'id', Number(payload.leadId), userId);
      break;
    }

    // BATCH IMPORT LEADS
    case 'BATCH_IMPORT_LEADS': {
      const rows = (payload.rows || []).filter(
        (r: any) => r.resolution !== 'skip' && r.businessName && String(r.businessName).trim()
      );
      for (const item of rows) {
        await resilientInsert('leads', {
          user_id: userId,
          business_name: String(item.businessName).trim(),
          contact_name: item.contactName || '',
          client_owner_name: item.contactName || '',
          phone: item.phone || '',
          email: item.email || '',
          website_url: item.websiteUrl || '',
          existing_website_url: item.websiteUrl || '',
          google_maps_url: item.googleMapsUrl || '',
          google_maps_link: item.googleMapsUrl || '',
          category_name: item.categoryName || 'Jewellery Stores',
          category: item.categoryName || 'Jewellery Stores',
          country: item.country || 'India',
          state: item.state || 'Karnataka',
          district: item.district || '',
          city: item.city || 'Bengaluru',
          locality: item.locality || 'Whitefield',
          address: item.address || '',
          full_address: item.address || '',
          website_status: item.websiteStatus || 'Website Status Unknown',
          has_website: item.websiteStatus || 'Website Status Unknown',
          source: `Spreadsheet Import (${payload.filename || 'import.csv'})`,
          lead_source: `Spreadsheet Import (${payload.filename || 'import.csv'})`,
          status: 'Not Contacted',
          outreach_status: 'Not Contacted',
          priority: 'Medium',
          client_interest_level: 'Medium',
          estimated_deal_value: Number(item.estimatedDealValue) || 40000,
          notes: item.notes || '',
          summary_notes: item.notes || '',
        });
      }
      break;
    }

    // SAVE TARGET LOCATION
    case 'SAVE_TARGET_LOCATION': {
      await resilientInsert('saved_locations', {
        user_id: userId,
        location_id: Number(payload.locationId),
        status: payload.status || 'Not Started',
        priority: payload.priority || 'High',
        target_categories: payload.targetCategories || 'Jewellery Stores',
        notes: payload.notes || '',
        target_lead_count: Number(payload.targetLeadCount) || 40,
        assigned_outreacher_id: payload.assignedOutreacherId
          ? Number(payload.assignedOutreacherId)
          : null,
        last_researched_at: today,
      });
      break;
    }

    // UPDATE SAVED LOCATION
    case 'UPDATE_SAVED_LOCATION': {
      await resilientUpdate(
        'saved_locations',
        {
          status: payload.status,
          priority: payload.priority,
          target_categories: payload.targetCategories,
          notes: payload.notes,
          target_lead_count: Number(payload.targetLeadCount) || 40,
          assigned_outreacher_id: payload.assignedOutreacherId
            ? Number(payload.assignedOutreacherId)
            : null,
          last_researched_at: today,
          updated_at: new Date().toISOString(),
        },
        'id',
        Number(payload.id),
        userId
      );
      break;
    }

    // DELETE SAVED LOCATION
    case 'REMOVE_SAVED_LOCATION': {
      await supabase
        .from('saved_locations')
        .delete()
        .eq('id', Number(payload.id))
        .eq('user_id', userId);
      break;
    }

    // CREATE OR UPDATE PROJECT
    case 'UPSERT_PROJECT': {
      const projRow: Record<string, any> = {
        user_id: userId,
        lead_id: payload.leadId ? Number(payload.leadId) : null,
        client_name: payload.clientName || '',
        project_name: payload.projectName || '',
        project_title: payload.projectName || '',
        business_name: payload.projectName || payload.clientName || '',
        description: payload.description || '',
        requirements: payload.requirements || '',
        features_requested: payload.requirements || '',
        status: payload.status || 'Not Started',
        priority: payload.priority || 'Medium',
        assigned_developer_id: payload.assignedDeveloperId
          ? Number(payload.assignedDeveloperId)
          : null,
        collaborator_ids: payload.collaboratorIds || '',
        start_date: payload.startDate || today,
        due_date: payload.dueDate || '',
        deadline: payload.dueDate || '',
        agreed_price: Number(payload.agreedPrice) || 0,
        price: Number(payload.agreedPrice) || 0,
        agreed_developer_cost: Number(payload.agreedDeveloperCost) || 0,
        other_expenses: Number(payload.otherExpenses) || 0,
        client_feedback: payload.clientFeedback || '',
        revision_count: Number(payload.revisionCount) || 0,
        notes: payload.notes || '',
        internal_notes: payload.notes || '',
        updated_at: new Date().toISOString(),
      };

      if (payload.id) {
        await resilientUpdate('projects', projRow, 'id', Number(payload.id), userId);
      } else {
        await resilientInsert('projects', projRow);
      }
      break;
    }

    // DELETE PROJECT
    case 'DELETE_PROJECT': {
      if (payload.id) {
        await supabase
          .from('project_tasks')
          .delete()
          .eq('project_id', Number(payload.id))
          .eq('user_id', userId);
        await supabase
          .from('projects')
          .delete()
          .eq('id', Number(payload.id))
          .eq('user_id', userId);
      }
      break;
    }

    // CREATE OR UPDATE PROJECT TASK
    case 'UPSERT_PROJECT_TASK': {
      const taskRow: Record<string, any> = {
        user_id: userId,
        project_id: Number(payload.projectId),
        title: payload.title || '',
        description: payload.description || '',
        status: payload.status || 'To Do',
        is_completed: payload.status === 'Completed',
        priority: payload.priority || 'Medium',
        assigned_developer_id: payload.assignedDeveloperId
          ? Number(payload.assignedDeveloperId)
          : null,
        assigned_to: payload.assignedDeveloperId ? Number(payload.assignedDeveloperId) : null,
        due_date: payload.dueDate || '',
        completed_at: payload.status === 'Completed' ? today : null,
        updated_at: new Date().toISOString(),
      };

      if (payload.id) {
        await resilientUpdate('project_tasks', taskRow, 'id', Number(payload.id), userId);
      } else {
        await resilientInsert('project_tasks', taskRow);
      }
      break;
    }

    // DELETE PROJECT TASK
    case 'DELETE_PROJECT_TASK': {
      await supabase
        .from('project_tasks')
        .delete()
        .eq('id', Number(payload.id))
        .eq('user_id', userId);
      break;
    }

    // ADD PAYMENT
    case 'ADD_PAYMENT': {
      await resilientInsert('payments', {
        user_id: userId,
        project_id: payload.projectId ? Number(payload.projectId) : null,
        payer_or_payee: payload.payerOrPayee || 'Client',
        payment_direction: payload.paymentDirection || 'inbound_client',
        payment_type: payload.paymentType || 'Advance',
        amount: Math.round(Number(payload.amount) || 0),
        currency: payload.currency || 'INR',
        status: payload.status || 'Completed',
        paid_at: payload.paidAt || today,
        reference: payload.reference || `PAY-${Date.now()}`,
        notes: payload.notes || '',
      });
      break;
    }

    // CREATE OR UPDATE TEAM MEMBER
    case 'UPSERT_TEAM_MEMBER': {
      const memberRow: Record<string, any> = {
        user_id: userId,
        full_name: payload.fullName || '',
        email: payload.email || '',
        phone: payload.phone || '',
        role: payload.role || 'outreacher',
        account_status: payload.accountStatus || 'Active',
        status: payload.accountStatus || 'Active',
        languages_spoken: payload.languagesSpoken || 'English, Hindi',
        start_date: payload.startDate || today,
        assigned_locations: payload.assignedLocations || '',
        assigned_categories: payload.assignedCategories || '',
        commission_type: payload.commissionType || 'fixed',
        commission_rate: Number(payload.commissionRate) || 1000,
        skills: payload.skills || '',
        specialities: payload.specialities || '',
        specialization: payload.specialities || payload.skills || '',
        employment_status: payload.employmentStatus || 'Contractor',
        payment_arrangement: payload.paymentArrangement || '',
        notes: payload.notes || '',
        updated_at: new Date().toISOString(),
      };

      if (payload.id) {
        await resilientUpdate('team_members', memberRow, 'id', Number(payload.id), userId);
      } else {
        const { data: insertedMember } = await resilientInsert('team_members', memberRow);
        if (insertedMember?.id) {
          const latestLocal = getClientFallbackState();
          const memberIdx = latestLocal.users.findIndex(
            (u) => (u.email || '').toLowerCase() === (memberRow.email || '').toLowerCase()
          );
          if (memberIdx >= 0) {
            latestLocal.users[memberIdx].id = Number(insertedMember.id);
            saveStateToLocalStorage(latestLocal);
          }
        }
      }
      break;
    }

    // DELETE TEAM MEMBER (OUTREACHER OR DEVELOPER)
    case 'DELETE_TEAM_MEMBER': {
      if (payload.id) {
        await supabase
          .from('team_members')
          .delete()
          .eq('id', Number(payload.id))
          .eq('user_id', userId);
      }
      if (payload.email) {
        await supabase
          .from('team_members')
          .delete()
          .eq('email', String(payload.email))
          .eq('user_id', userId);
      }
      break;
    }

    // UPDATE COMMISSION STATUS
    case 'UPDATE_COMMISSION_STATUS': {
      await resilientUpdate(
        'commissions',
        {
          status: payload.status,
          paid_at: payload.status === 'Paid' ? today : null,
          admin_notes: payload.adminNotes || '',
          updated_at: new Date().toISOString(),
        },
        'id',
        Number(payload.id),
        userId
      );
      break;
    }

    // CREATE OR UPDATE CATEGORY
    case 'UPSERT_CATEGORY': {
      await resilientInsert('business_categories', {
        user_id: userId,
        name: payload.name,
        description: payload.description || '',
        is_active: true,
      });
      break;
    }

    default:
      return updatedLocalState;
  }

  return loadSupabaseCrmState();
}
