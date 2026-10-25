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

/**
 * Maps snake_case rows from Supabase to the camelCase interfaces used by the UI components.
 */
function mapLeadFromRow(row: any): LeadRecord {
  return {
    id: Number(row.id),
    businessName: row.business_name || '',
    contactName: row.contact_name || '',
    phone: row.phone || '',
    email: row.email || '',
    websiteUrl: row.website_url || '',
    googleMapsUrl: row.google_maps_url || '',
    externalPlaceId: null,
    categoryId: null,
    categoryName: row.category_name || 'Jewellery Stores',
    country: row.country || 'India',
    state: row.state || '',
    district: row.district || '',
    city: row.city || '',
    locality: row.locality || '',
    locationId: row.location_id ? Number(row.location_id) : null,
    address: row.address || '',
    websiteStatus: row.website_status || 'No Website',
    source: row.source || 'Manual Entry',
    status: row.status || 'New Lead',
    priority: row.priority || 'Medium',
    assignedOutreacherId: row.assigned_outreacher_id ? Number(row.assigned_outreacher_id) : null,
    assignedDeveloperId: row.assigned_developer_id ? Number(row.assigned_developer_id) : null,
    estimatedDealValue: Number(row.estimated_deal_value) || 0,
    agreedDealValue: Number(row.agreed_deal_value) || 0,
    nextFollowUpAt: row.next_follow_up_at || '',
    lastContactedAt: row.last_contacted_at || '',
    notes: row.notes || '',
    tags: row.tags || '',
    isArchived: Boolean(row.is_archived),
    createdBy: null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapActivityFromRow(row: any): LeadActivityRecord {
  return {
    id: Number(row.id),
    leadId: Number(row.lead_id),
    userId: null,
    userName: row.user_name || 'Operator',
    activityType: row.activity_type || 'Phone Call',
    outcome: row.outcome || '',
    notes: row.notes || '',
    occurredAt: row.occurred_at || '',
    nextFollowUpAt: row.next_follow_up_at || null,
    isVerifiedIntegration: false,
  };
}

function mapSavedLocFromRow(row: any): SavedLocationRecord {
  return {
    id: Number(row.id),
    locationId: Number(row.location_id),
    status: row.status || 'Not Started',
    priority: row.priority || 'High',
    targetCategories: row.target_categories || 'Jewellery Stores',
    notes: row.notes || '',
    targetLeadCount: Number(row.target_lead_count) || 40,
    assignedOutreacherId: row.assigned_outreacher_id ? Number(row.assigned_outreacher_id) : null,
    lastResearchedAt: row.last_researched_at || '',
    createdBy: null,
  };
}

function mapProjectFromRow(row: any): ProjectRecord {
  return {
    id: Number(row.id),
    leadId: row.lead_id ? Number(row.lead_id) : null,
    dealId: null,
    clientName: row.client_name || '',
    projectName: row.project_name || '',
    description: row.description || '',
    requirements: row.requirements || '',
    status: row.status || 'Not Started',
    priority: row.priority || 'Medium',
    assignedDeveloperId: row.assigned_developer_id ? Number(row.assigned_developer_id) : null,
    collaboratorIds: row.collaborator_ids || '',
    startDate: row.start_date || '',
    dueDate: row.due_date || '',
    completedAt: row.completed_at || null,
    deliveredAt: row.delivered_at || null,
    agreedPrice: Number(row.agreed_price) || 0,
    currency: row.currency || 'INR',
    agreedDeveloperCost: Number(row.agreed_developer_cost) || 0,
    otherExpenses: Number(row.other_expenses) || 0,
    clientFeedback: row.client_feedback || '',
    revisionCount: Number(row.revision_count) || 0,
    notes: row.notes || '',
  };
}

function mapTaskFromRow(row: any): ProjectTaskRecord {
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    title: row.title || '',
    description: row.description || '',
    status: row.status || 'To Do',
    priority: row.priority || 'Medium',
    assignedDeveloperId: row.assigned_developer_id ? Number(row.assigned_developer_id) : null,
    dueDate: row.due_date || '',
    completedAt: row.completed_at || null,
  };
}

function mapPaymentFromRow(row: any): PaymentRecord {
  return {
    id: Number(row.id),
    projectId: row.project_id ? Number(row.project_id) : null,
    dealId: null,
    payerOrPayee: row.payer_or_payee || '',
    paymentDirection: row.payment_direction || 'inbound_client',
    paymentType: row.payment_type || 'Advance',
    amount: Number(row.amount) || 0,
    currency: row.currency || 'INR',
    status: row.status || 'Completed',
    paidAt: row.paid_at || '',
    reference: row.reference || '',
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
    accountStatus: row.account_status || 'Active',
    languagesSpoken: row.languages_spoken || '',
    startDate: row.start_date || '',
    assignedLocations: row.assigned_locations || '',
    assignedCategories: row.assigned_categories || '',
    commissionType: row.commission_type || 'fixed',
    commissionRate: Number(row.commission_rate) || 0,
    skills: row.skills || '',
    specialities: row.specialities || '',
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
    commissionRate: Number(row.commission_rate) || 0,
    amount: Number(row.amount) || 0,
    currency: row.currency || 'INR',
    calculationBasis: row.calculation_basis || '',
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

  // Query all user-owned tables in parallel (RLS filters by auth.uid() = user_id)
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
    supabase.from('leads').select('*').order('updated_at', { ascending: false }),
    supabase.from('lead_activities').select('*').order('id', { ascending: false }),
    supabase.from('saved_locations').select('*').order('id', { ascending: false }),
    supabase.from('projects').select('*').order('id', { ascending: false }),
    supabase.from('project_tasks').select('*').order('id', { ascending: true }),
    supabase.from('payments').select('*').order('id', { ascending: false }),
    supabase.from('team_members').select('*').order('id', { ascending: true }),
    supabase.from('commissions').select('*').order('id', { ascending: false }),
    supabase.from('business_categories').select('*').order('name', { ascending: true }),
  ]);

  // If the 'leads' table hasn't been created in Supabase SQL Editor yet, return the local state gracefully
  if (leadsRes.error) {
    return baseState;
  }

  const leads = (leadsRes.data || []).map(mapLeadFromRow);
  const wonLeads = leads.filter((l) => l.status === 'Deal Won');

  return {
    ...baseState,
    leads,
    activities: activitiesRes.error ? baseState.activities : (activitiesRes.data || []).map(mapActivityFromRow),
    savedLocations: savedLocsRes.error
      ? baseState.savedLocations
      : (savedLocsRes.data || []).map(mapSavedLocFromRow),
    projects: projectsRes.error ? baseState.projects : (projectsRes.data || []).map(mapProjectFromRow),
    tasks: tasksRes.error ? baseState.tasks : (tasksRes.data || []).map(mapTaskFromRow),
    payments: paymentsRes.error ? baseState.payments : (paymentsRes.data || []).map(mapPaymentFromRow),
    users:
      !teamRes.error && teamRes.data && teamRes.data.length > 0
        ? teamRes.data.map(mapTeamMemberFromRow)
        : baseState.users,
    commissions: commissionsRes.error ? baseState.commissions : (commissionsRes.data || []).map(mapCommissionFromRow),
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
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return executeClientFallbackMutation(action, payload, actorRole, actorName);
  }

  const userId = session.user.id;
  const today = new Date().toISOString().slice(0, 10);

  switch (action) {
    // CREATE OR UPDATE A LEAD
    case 'UPSERT_LEAD': {
      const leadRow = {
        user_id: userId,
        business_name: String(payload.businessName || '').trim(),
        contact_name: payload.contactName || '',
        phone: payload.phone || '',
        email: payload.email || '',
        website_url: payload.websiteUrl || '',
        google_maps_url: payload.googleMapsUrl || '',
        category_name: payload.categoryName || 'Jewellery Stores',
        country: payload.country || 'India',
        state: payload.state || '',
        district: payload.district || '',
        city: payload.city || '',
        locality: payload.locality || '',
        location_id: payload.locationId ? Number(payload.locationId) : null,
        address: payload.address || '',
        website_status: payload.websiteStatus || 'No Website',
        source: payload.source || 'Manual Entry',
        status: payload.status || 'New Lead',
        priority: payload.priority || 'Medium',
        assigned_outreacher_id: payload.assignedOutreacherId ? Number(payload.assignedOutreacherId) : null,
        assigned_developer_id: payload.assignedDeveloperId ? Number(payload.assignedDeveloperId) : null,
        estimated_deal_value: Number(payload.estimatedDealValue) || 0,
        agreed_deal_value: Number(payload.agreedDealValue) || 0,
        next_follow_up_at: payload.nextFollowUpAt || '',
        notes: payload.notes || '',
        tags: payload.tags || '',
        updated_at: new Date().toISOString(),
      };

      if (payload.id) {
        const { error } = await supabase
          .from('leads')
          .update(leadRow)
          .eq('id', Number(payload.id))
          .eq('user_id', userId);
        if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      } else {
        const { data: inserted, error } = await supabase
          .from('leads')
          .insert([leadRow])
          .select()
          .single();
        if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);

        if (inserted && payload.status === 'Deal Won' && payload.assignedOutreacherId) {
          const finalAgreed = Number(payload.agreedDealValue) || Number(payload.estimatedDealValue) || 35000;
          const commCalc = calculateCommissionAmount(finalAgreed, 'fixed', 1000);
          await supabase.from('commissions').insert([
            {
              user_id: userId,
              lead_id: inserted.id,
              outreacher_id: Number(payload.assignedOutreacherId),
              commission_type: 'fixed',
              commission_rate: 1000,
              amount: commCalc.amount,
              currency: 'INR',
              calculation_basis: commCalc.calculationBasis,
              status: 'Pending',
            },
          ]);
        }
      }
      break;
    }

    // BULK UPDATE LEADS
    case 'BULK_UPDATE_LEADS': {
      const validIds = (payload.leadIds || []).map((n: unknown) => Number(n)).filter(Boolean);
      const updateObj: Record<string, any> = { updated_at: new Date().toISOString() };
      if (payload.assignedOutreacherId !== undefined) {
        updateObj.assigned_outreacher_id = payload.assignedOutreacherId ? Number(payload.assignedOutreacherId) : null;
      }
      if (payload.status !== undefined) updateObj.status = payload.status;
      if (payload.isArchived !== undefined) updateObj.is_archived = Boolean(payload.isArchived);

      const { error } = await supabase
        .from('leads')
        .update(updateObj)
        .in('id', validIds)
        .eq('user_id', userId);
      if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      break;
    }

    // DELETE LEADS
    case 'DELETE_LEADS': {
      const validIds = (payload.leadIds || []).map((n: unknown) => Number(n)).filter(Boolean);
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', validIds)
        .eq('user_id', userId);
      if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      break;
    }

    // CLEAR ALL LEADS
    case 'CLEAR_ALL_LEADS': {
      const { error } = await supabase.from('leads').delete().eq('user_id', userId);
      if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      break;
    }

    // ADD LEAD ACTIVITY
    case 'ADD_LEAD_ACTIVITY': {
      const timestamp = payload.occurredAt || new Date().toISOString().slice(0, 16).replace('T', ' ');
      const { error } = await supabase.from('lead_activities').insert([
        {
          user_id: userId,
          lead_id: Number(payload.leadId),
          user_name: actorName,
          activity_type: payload.activityType || 'Phone Call',
          outcome: payload.outcome || 'Connected',
          notes: payload.notes || '',
          occurred_at: timestamp,
          next_follow_up_at: payload.nextFollowUpAt || '',
        },
      ]);
      if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);

      const leadUpdate: Record<string, any> = {
        last_contacted_at: timestamp.slice(0, 10),
        updated_at: new Date().toISOString(),
      };
      if (payload.nextFollowUpAt) leadUpdate.next_follow_up_at = payload.nextFollowUpAt;
      if (payload.newLeadStatus) leadUpdate.status = payload.newLeadStatus;

      await supabase
        .from('leads')
        .update(leadUpdate)
        .eq('id', Number(payload.leadId))
        .eq('user_id', userId);
      break;
    }

    // BATCH IMPORT LEADS
    case 'BATCH_IMPORT_LEADS': {
      const rows = (payload.rows || []).filter(
        (r: any) => r.resolution !== 'skip' && r.businessName && String(r.businessName).trim()
      );
      if (rows.length > 0) {
        const toInsert = rows.map((item: any) => ({
          user_id: userId,
          business_name: String(item.businessName).trim(),
          contact_name: item.contactName || '',
          phone: item.phone || '',
          email: item.email || '',
          website_url: item.websiteUrl || '',
          google_maps_url: item.googleMapsUrl || '',
          category_name: item.categoryName || 'Jewellery Stores',
          country: item.country || 'India',
          state: item.state || 'Karnataka',
          district: item.district || '',
          city: item.city || 'Bengaluru',
          locality: item.locality || 'Whitefield',
          address: item.address || '',
          website_status: item.websiteStatus || 'Website Status Unknown',
          source: `Spreadsheet Import (${payload.filename || 'import.csv'})`,
          status: 'Not Contacted',
          priority: 'Medium',
          estimated_deal_value: Number(item.estimatedDealValue) || 40000,
          notes: item.notes || '',
        }));
        const { error } = await supabase.from('leads').insert(toInsert);
        if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      }
      break;
    }

    // SAVE TARGET LOCATION
    case 'SAVE_TARGET_LOCATION': {
      const { error } = await supabase.from('saved_locations').insert([
        {
          user_id: userId,
          location_id: Number(payload.locationId),
          status: payload.status || 'Not Started',
          priority: payload.priority || 'High',
          target_categories: payload.targetCategories || 'Jewellery Stores',
          notes: payload.notes || '',
          target_lead_count: Number(payload.targetLeadCount) || 40,
          assigned_outreacher_id: payload.assignedOutreacherId ? Number(payload.assignedOutreacherId) : null,
          last_researched_at: today,
        },
      ]);
      if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      break;
    }

    // UPDATE SAVED LOCATION
    case 'UPDATE_SAVED_LOCATION': {
      const { error } = await supabase
        .from('saved_locations')
        .update({
          status: payload.status,
          priority: payload.priority,
          target_categories: payload.targetCategories,
          notes: payload.notes,
          target_lead_count: Number(payload.targetLeadCount) || 40,
          assigned_outreacher_id: payload.assignedOutreacherId ? Number(payload.assignedOutreacherId) : null,
          last_researched_at: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', Number(payload.id))
        .eq('user_id', userId);
      if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      break;
    }

    // DELETE SAVED LOCATION
    case 'REMOVE_SAVED_LOCATION': {
      const { error } = await supabase
        .from('saved_locations')
        .delete()
        .eq('id', Number(payload.id))
        .eq('user_id', userId);
      if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      break;
    }

    // CREATE OR UPDATE PROJECT
    case 'UPSERT_PROJECT': {
      const projRow = {
        user_id: userId,
        lead_id: payload.leadId ? Number(payload.leadId) : null,
        client_name: payload.clientName,
        project_name: payload.projectName,
        description: payload.description || '',
        requirements: payload.requirements || '',
        status: payload.status || 'Not Started',
        priority: payload.priority || 'Medium',
        assigned_developer_id: payload.assignedDeveloperId ? Number(payload.assignedDeveloperId) : null,
        collaborator_ids: payload.collaboratorIds || '',
        start_date: payload.startDate || today,
        due_date: payload.dueDate || '',
        agreed_price: Number(payload.agreedPrice) || 0,
        agreed_developer_cost: Number(payload.agreedDeveloperCost) || 0,
        other_expenses: Number(payload.otherExpenses) || 0,
        client_feedback: payload.clientFeedback || '',
        revision_count: Number(payload.revisionCount) || 0,
        notes: payload.notes || '',
        updated_at: new Date().toISOString(),
      };

      if (payload.id) {
        const { error } = await supabase
          .from('projects')
          .update(projRow)
          .eq('id', Number(payload.id))
          .eq('user_id', userId);
        if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      } else {
        const { error } = await supabase.from('projects').insert([projRow]);
        if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      }
      break;
    }

    // CREATE OR UPDATE PROJECT TASK
    case 'UPSERT_PROJECT_TASK': {
      const taskRow = {
        user_id: userId,
        project_id: Number(payload.projectId),
        title: payload.title,
        description: payload.description || '',
        status: payload.status || 'To Do',
        priority: payload.priority || 'Medium',
        assigned_developer_id: payload.assignedDeveloperId ? Number(payload.assignedDeveloperId) : null,
        due_date: payload.dueDate || '',
        completed_at: payload.status === 'Completed' ? today : null,
        updated_at: new Date().toISOString(),
      };

      if (payload.id) {
        const { error } = await supabase
          .from('project_tasks')
          .update(taskRow)
          .eq('id', Number(payload.id))
          .eq('user_id', userId);
        if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      } else {
        const { error } = await supabase.from('project_tasks').insert([taskRow]);
        if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      }
      break;
    }

    // DELETE PROJECT TASK
    case 'DELETE_PROJECT_TASK': {
      const { error } = await supabase
        .from('project_tasks')
        .delete()
        .eq('id', Number(payload.id))
        .eq('user_id', userId);
      if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      break;
    }

    // ADD PAYMENT
    case 'ADD_PAYMENT': {
      const { error } = await supabase.from('payments').insert([
        {
          user_id: userId,
          project_id: payload.projectId ? Number(payload.projectId) : null,
          payer_or_payee: payload.payerOrPayee,
          payment_direction: payload.paymentDirection || 'inbound_client',
          payment_type: payload.paymentType || 'Advance',
          amount: Math.round(Number(payload.amount) || 0),
          currency: payload.currency || 'INR',
          status: payload.status || 'Completed',
          paid_at: payload.paidAt || today,
          reference: payload.reference,
          notes: payload.notes || '',
        },
      ]);
      if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      break;
    }

    // CREATE OR UPDATE TEAM MEMBER
    case 'UPSERT_TEAM_MEMBER': {
      const memberRow = {
        user_id: userId,
        full_name: payload.fullName,
        email: payload.email,
        phone: payload.phone || '',
        role: payload.role || 'outreacher',
        account_status: payload.accountStatus || 'Active',
        languages_spoken: payload.languagesSpoken || 'English, Hindi',
        start_date: payload.startDate || today,
        assigned_locations: payload.assignedLocations || '',
        assigned_categories: payload.assignedCategories || '',
        commission_type: payload.commissionType || 'fixed',
        commission_rate: Number(payload.commissionRate) || 1000,
        skills: payload.skills || '',
        specialities: payload.specialities || '',
        employment_status: payload.employmentStatus || 'Contractor',
        payment_arrangement: payload.paymentArrangement || '',
        notes: payload.notes || '',
        updated_at: new Date().toISOString(),
      };

      if (payload.id) {
        const { error } = await supabase
          .from('team_members')
          .update(memberRow)
          .eq('id', Number(payload.id))
          .eq('user_id', userId);
        if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      } else {
        const { error } = await supabase.from('team_members').insert([memberRow]);
        if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      }
      break;
    }

    // UPDATE COMMISSION STATUS
    case 'UPDATE_COMMISSION_STATUS': {
      const { error } = await supabase
        .from('commissions')
        .update({
          status: payload.status,
          paid_at: payload.status === 'Paid' ? today : null,
          admin_notes: payload.adminNotes || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', Number(payload.id))
        .eq('user_id', userId);
      if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      break;
    }

    // CREATE OR UPDATE CATEGORY
    case 'UPSERT_CATEGORY': {
      const { error } = await supabase.from('business_categories').insert([
        {
          user_id: userId,
          name: payload.name,
          description: payload.description || '',
          is_active: true,
        },
      ]);
      if (error) return executeClientFallbackMutation(action, payload, actorRole, actorName);
      break;
    }

    default:
      return executeClientFallbackMutation(action, payload, actorRole, actorName);
  }

  return loadSupabaseCrmState();
}
