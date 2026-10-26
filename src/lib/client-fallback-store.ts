import { CrmState, GeoLocation } from '../types/crm';
import { INDIA_STATES_AND_PLACES } from './india-locations-seed';
import { calculateCommissionAmount, normalizeText } from './crm-logic';

const STORAGE_KEY = 'agency_command_center_static_state_v1';

const DEFAULT_LEAD_STATUSES = [
  'New Lead',
  'Not Contacted',
  'Contacted',
  'Interested',
  'Meeting Scheduled',
  'Proposal Sent',
  'Negotiation',
  'Deal Won',
  'Deal Lost',
  'Follow-up Required',
];

const DEFAULT_PROJECT_STATUSES = [
  'Not Started',
  'Requirements Collected',
  'Design in Progress',
  'Development in Progress',
  'Client Review',
  'Revisions',
  'Completed',
  'Delivered',
  'On Hold',
  'Cancelled',
];

function buildInitialStaticLocations(): GeoLocation[] {
  const list: GeoLocation[] = [];
  let nextId = 1;

  const makeSlug = (s: string) =>
    normalizeText(s)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toUpperCase();

  // Level 0: India
  const indiaId = nextId++;
  list.push({
    id: indiaId,
    parentLocationId: null,
    name: 'India',
    normalizedName: 'india',
    locationType: 'Country',
    administrativeLevel: 0,
    countryCode: 'IN',
    externalGeographicId: 'GN-IN',
    latitude: '20.5937',
    longitude: '78.9629',
    dataSource: 'GeoNames Authoritative Hierarchy',
  });

  for (const st of INDIA_STATES_AND_PLACES) {
    const stateId = nextId++;
    list.push({
      id: stateId,
      parentLocationId: indiaId,
      name: st.name,
      normalizedName: normalizeText(st.name),
      locationType: st.type === 'Union Territory' ? 'Union Territory' : 'State',
      administrativeLevel: 1,
      countryCode: 'IN',
      externalGeographicId: `GN-IN-${st.code}`,
      latitude: st.lat,
      longitude: st.lng,
      dataSource: 'India Administrative Census & GeoNames',
    });

    for (const dist of st.districts) {
      const distId = nextId++;
      list.push({
        id: distId,
        parentLocationId: stateId,
        name: dist.name,
        normalizedName: normalizeText(dist.name),
        locationType: 'District',
        administrativeLevel: 2,
        countryCode: 'IN',
        externalGeographicId: `GN-IN-${st.code}-D-${makeSlug(dist.name)}`,
        latitude: st.lat,
        longitude: st.lng,
        dataSource: 'India Administrative Census & GeoNames',
      });

      for (const city of dist.cities) {
        const cityId = nextId++;
        list.push({
          id: cityId,
          parentLocationId: distId,
          name: city.name,
          normalizedName: normalizeText(city.name),
          locationType: 'City',
          administrativeLevel: 3,
          countryCode: 'IN',
          externalGeographicId: `GN-IN-${st.code}-C-${makeSlug(city.name)}`,
          latitude: st.lat,
          longitude: st.lng,
          dataSource: 'India Administrative Census & GeoNames',
        });

        for (const placeName of city.places) {
          const placeId = nextId++;
          list.push({
            id: placeId,
            parentLocationId: cityId,
            name: placeName,
            normalizedName: normalizeText(placeName),
            locationType: 'Locality',
            administrativeLevel: 4,
            countryCode: 'IN',
            externalGeographicId: `GN-IN-${st.code}-L-${makeSlug(city.name)}-${makeSlug(placeName)}`,
            latitude: st.lat,
            longitude: st.lng,
            dataSource: 'India Administrative Census & GeoNames',
          });
        }
      }
    }
  }

  return list;
}

function createDefaultStaticState(): CrmState {
  const locations = buildInitialStaticLocations();
  const whitefield = locations.find((l) => l.name === 'Whitefield');
  const indiranagar = locations.find((l) => l.name === 'Indiranagar');
  const bandraWest = locations.find((l) => l.name === 'Bandra West');
  const jpNagar = locations.find((l) => l.name === 'JP Nagar');

  return {
    users: [
      {
        id: 1,
        uid: 'admin-aaditya-01',
        email: 'aadipasso1@gmail.com',
        fullName: 'Aaditya Verma',
        phone: '+91 98450 10001',
        role: 'admin',
        accountStatus: 'Active',
        languagesSpoken: 'English, Hindi, Kannada',
        startDate: '2025-01-10',
        assignedLocations: 'All India',
        assignedCategories: 'All Categories',
        commissionType: 'fixed',
        commissionRate: 1000,
        skills: 'Management, Strategy',
        specialities: 'Agency Operations',
        employmentStatus: 'Full-Time',
        paymentArrangement: 'Founder',
        notes: 'Founder & Managing Director',
      },
      {
        id: 2,
        uid: 'outreacher-rohan-01',
        email: 'rohan.kulkarni@agencycommand.in',
        fullName: 'Rohan Kulkarni',
        phone: '+91 98452 33411',
        role: 'outreacher',
        accountStatus: 'Active',
        languagesSpoken: 'English, Hindi, Kannada, Marathi',
        startDate: '2025-03-15',
        assignedLocations: 'Whitefield, Indiranagar, Bandra West',
        assignedCategories: 'Jewellery Stores, Interior Designers',
        commissionType: 'fixed',
        commissionRate: 1000,
        skills: 'Cold Calling, Showrooms',
        specialities: 'High-ticket Retail',
        employmentStatus: 'Full-Time',
        paymentArrangement: '₹1,000 per won deal',
        notes: 'Senior outbound specialist for high-ticket retail showrooms',
      },
      {
        id: 3,
        uid: 'outreacher-priya-02',
        email: 'priya.nair@agencycommand.in',
        fullName: 'Priya Nair',
        phone: '+91 98201 77812',
        role: 'outreacher',
        accountStatus: 'Active',
        languagesSpoken: 'English, Hindi, Malayalam, Tamil',
        startDate: '2025-05-01',
        assignedLocations: 'Marathahalli, JP Nagar, Juhu, Koregaon Park',
        assignedCategories: 'Photography Studios, Furniture Stores, Dental & Aesthetic Clinics',
        commissionType: 'percentage',
        commissionRate: 5,
        skills: 'WhatsApp Outreach, Discovery Calls',
        specialities: 'Studios & Clinics',
        employmentStatus: 'Contractor',
        paymentArrangement: '5% of deal value',
        notes: 'Specializes in WhatsApp + consultative discovery calls',
      },
      {
        id: 4,
        uid: 'developer-vikram-01',
        email: 'vikram.rao@agencycommand.in',
        fullName: 'Vikram Rao',
        phone: '+91 99001 44210',
        role: 'developer',
        accountStatus: 'Active',
        languagesSpoken: 'English, Hindi, Kannada',
        startDate: '2025-02-01',
        assignedLocations: '',
        assignedCategories: '',
        commissionType: 'fixed',
        commissionRate: 0,
        skills: 'Next.js, React, TypeScript, Tailwind CSS, Shopify, PostgreSQL',
        specialities: 'Luxury E-commerce & Catalogue Showrooms',
        employmentStatus: 'Full-Time',
        paymentArrangement: '₹12,000 per standard project / ₹22,000 e-commerce',
        notes: 'Lead Full-Stack Architect',
      },
      {
        id: 5,
        uid: 'developer-ananya-02',
        email: 'ananya.desai@agencycommand.in',
        fullName: 'Ananya Desai',
        phone: '+91 98220 88914',
        role: 'developer',
        accountStatus: 'Active',
        languagesSpoken: 'English, Hindi, Marathi',
        startDate: '2025-04-12',
        assignedLocations: '',
        assignedCategories: '',
        commissionType: 'fixed',
        commissionRate: 0,
        skills: 'Figma, React, Framer Motion, Webflow, WordPress, SEO',
        specialities: 'High-Conversion Studio & Interior Design Portfolios',
        employmentStatus: 'Contractor',
        paymentArrangement: '₹10,000 per project milestone',
        notes: 'UI/UX & Frontend Specialist',
      },
    ],
    locations,
    savedLocations: [
      whitefield && {
        id: 1,
        locationId: whitefield.id,
        status: 'In Progress',
        priority: 'High',
        targetCategories: 'Jewellery Stores, Dental & Aesthetic Clinics',
        notes: 'High concentration of independent family-owned bridal jewellers on ITPL Main Road.',
        targetLeadCount: 40,
        assignedOutreacherId: 2,
        lastResearchedAt: '2026-10-20',
        createdBy: 'Aaditya Verma',
      },
      indiranagar && {
        id: 2,
        locationId: indiranagar.id,
        status: 'Ready for Outreach',
        priority: 'High',
        targetCategories: 'Interior Designers, Photography Studios',
        notes: '100 Feet Road design studios and luxury home decor boutiques.',
        targetLeadCount: 35,
        assignedOutreacherId: 2,
        lastResearchedAt: '2026-10-22',
        createdBy: 'Aaditya Verma',
      },
      bandraWest && {
        id: 3,
        locationId: bandraWest.id,
        status: 'Researching',
        priority: 'High',
        targetCategories: 'Jewellery Stores, Photography Studios, Furniture Stores',
        notes: 'Hill Road & Linking Road heritage showrooms needing catalogue websites.',
        targetLeadCount: 50,
        assignedOutreacherId: 3,
        lastResearchedAt: '2026-10-24',
        createdBy: 'Aaditya Verma',
      },
      jpNagar && {
        id: 4,
        locationId: jpNagar.id,
        status: 'Not Started',
        priority: 'Medium',
        targetCategories: 'Furniture Stores, Car Dealerships',
        notes: 'Outer Ring Road & 24th Main showrooms.',
        targetLeadCount: 25,
        assignedOutreacherId: 3,
        lastResearchedAt: '2026-10-18',
        createdBy: 'Aaditya Verma',
      },
    ].filter(Boolean) as CrmState['savedLocations'],
    categories: [
      { id: 1, name: 'Jewellery Stores', description: 'Retail gold, diamond, and bridal jewellery showrooms', isActive: true },
      { id: 2, name: 'Photography Studios', description: 'Wedding, commercial, and portrait photography studios', isActive: true },
      { id: 3, name: 'Interior Designers', description: 'Residential and commercial interior architecture studios', isActive: true },
      { id: 4, name: 'Furniture Stores', description: 'Bespoke furniture showrooms and modular home decor', isActive: true },
      { id: 5, name: 'Car Dealerships', description: 'Pre-owned luxury and multi-brand auto dealerships', isActive: true },
      { id: 6, name: 'SaaS Startups', description: 'Early and growth-stage software product companies', isActive: true },
      { id: 7, name: 'Coaches and Consultants', description: 'Executive coaches, financial advisors, and B2B consultants', isActive: true },
      { id: 8, name: 'Ecommerce Brands', description: 'D2C apparel, specialty food, and lifestyle brands', isActive: true },
      { id: 9, name: 'Marketing Agencies', description: 'Boutique performance and creative agencies', isActive: true },
      { id: 10, name: 'Dental & Aesthetic Clinics', description: 'Specialty healthcare, dermatology, and dental practices', isActive: true },
    ],
    leads: [],
    activities: [],
    assignments: [],
    deals: [],
    commissions: [],
    projects: [],
    tasks: [],
    payments: [],
    importJobs: [],
    auditLogs: [
      {
        id: 1,
        actorName: 'Aaditya Verma',
        actorRole: 'admin',
        action: 'WORKSPACE_READY',
        entityType: 'workspace',
        entityId: '1',
        details: 'Initialized all 36 Indian States/UTs, Districts, and Places.',
        createdAt: new Date().toISOString(),
      },
    ],
    settings: {
      id: 1,
      agencyName: 'Agency Command Center',
      defaultCurrency: 'INR',
      timezone: 'Asia/Kolkata',
      dateFormat: 'YYYY-MM-DD',
      defaultCommissionType: 'fixed',
      defaultCommissionValue: 1000,
      leadStatuses: JSON.stringify(DEFAULT_LEAD_STATUSES),
      projectStatuses: JSON.stringify(DEFAULT_PROJECT_STATUSES),
    },
  };
}

const STORAGE_KEY_V2 = 'agency_command_center_crm_data_v2';
const STORAGE_KEY_V1 = 'agency_command_center_static_state_v1';

let inMemoryCrmState: CrmState | null = null;
let staticLocationsCache: GeoLocation[] | null = null;

export function getCachedStaticLocations(): GeoLocation[] {
  if (!staticLocationsCache) {
    staticLocationsCache = buildInitialStaticLocations();
  }
  return staticLocationsCache;
}

export function saveClientFallbackState(state: CrmState): void {
  inMemoryCrmState = {
    ...state,
    locations: getCachedStaticLocations(),
  };

  try {
    if (typeof window !== 'undefined') {
      // Store compact representation without serializing the massive static locations array
      const compactPayload = {
        users: state.users,
        savedLocations: state.savedLocations,
        categories: state.categories,
        leads: state.leads,
        activities: state.activities,
        assignments: state.assignments,
        deals: state.deals,
        commissions: state.commissions,
        projects: state.projects,
        tasks: state.tasks,
        payments: state.payments,
        importJobs: state.importJobs,
        auditLogs: state.auditLogs,
        settings: state.settings,
      };
      window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(compactPayload));
    }
  } catch (err) {
    console.warn('Failed to persist CRM state to localStorage:', err);
  }
}

export function getClientFallbackState(): CrmState {
  if (inMemoryCrmState && Array.isArray(inMemoryCrmState.leads)) {
    return inMemoryCrmState;
  }

  const staticLocations = getCachedStaticLocations();
  const defaultBase = createDefaultStaticState();

  if (typeof window === 'undefined') {
    return defaultBase;
  }

  try {
    // 1. Try V2 compact storage
    const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (parsed && typeof parsed === 'object') {
        const resolved: CrmState = {
          ...defaultBase,
          ...parsed,
          locations: staticLocations,
          leads: Array.isArray(parsed.leads) ? parsed.leads : [],
          users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : defaultBase.users,
          categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : defaultBase.categories,
        };
        inMemoryCrmState = resolved;
        return resolved;
      }
    }

    // 2. Fallback to legacy V1 storage if migrating
    const rawV1 = window.localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const parsedV1 = JSON.parse(rawV1);
      if (parsedV1 && typeof parsedV1 === 'object') {
        const resolvedV1: CrmState = {
          ...defaultBase,
          ...parsedV1,
          locations: staticLocations,
          leads: Array.isArray(parsedV1.leads) ? parsedV1.leads : [],
        };
        saveClientFallbackState(resolvedV1);
        return resolvedV1;
      }
    }
  } catch (err) {
    console.warn('Error reading CRM fallback state from localStorage:', err);
  }

  inMemoryCrmState = defaultBase;
  saveClientFallbackState(defaultBase);
  return defaultBase;
}

export function executeClientFallbackMutation(
  action: string,
  payload: Record<string, any>,
  actorRole: string,
  actorName: string
): CrmState {
  const state = getClientFallbackState();
  const today = new Date().toISOString().slice(0, 10);

  switch (action) {
    case 'SAVE_TARGET_LOCATION': {
      const locId = Number(payload.locationId);
      const existingIdx = state.savedLocations.findIndex((s) => s.locationId === locId);
      const record = {
        id: existingIdx >= 0 ? state.savedLocations[existingIdx].id : Date.now(),
        locationId: locId,
        status: payload.status || 'Not Started',
        priority: payload.priority || 'High',
        targetCategories: payload.targetCategories || 'Jewellery Stores',
        notes: payload.notes || '',
        targetLeadCount: Number(payload.targetLeadCount) || 40,
        assignedOutreacherId: payload.assignedOutreacherId ? Number(payload.assignedOutreacherId) : null,
        lastResearchedAt: today,
        createdBy: actorName,
      };
      if (existingIdx >= 0) {
        state.savedLocations[existingIdx] = record;
      } else {
        state.savedLocations.unshift(record);
      }
      break;
    }

    case 'UPDATE_SAVED_LOCATION': {
      const idx = state.savedLocations.findIndex((s) => s.id === Number(payload.id));
      if (idx >= 0) {
        state.savedLocations[idx] = {
          ...state.savedLocations[idx],
          status: payload.status ?? state.savedLocations[idx].status,
          priority: payload.priority ?? state.savedLocations[idx].priority,
          targetCategories: payload.targetCategories ?? state.savedLocations[idx].targetCategories,
          notes: payload.notes ?? state.savedLocations[idx].notes,
          targetLeadCount: Number(payload.targetLeadCount) || state.savedLocations[idx].targetLeadCount,
          assignedOutreacherId: payload.assignedOutreacherId ? Number(payload.assignedOutreacherId) : null,
          lastResearchedAt: today,
        };
      }
      break;
    }

    case 'REMOVE_SAVED_LOCATION': {
      state.savedLocations = state.savedLocations.filter((s) => s.id !== Number(payload.id));
      break;
    }

    case 'UPSERT_LEAD': {
      const id = payload.id ? Number(payload.id) : null;
      if (id) {
        const idx = state.leads.findIndex((l) => l.id === id);
        if (idx >= 0) {
          state.leads[idx] = {
            ...state.leads[idx],
            ...payload,
            id,
            assignedOutreacherId:
              payload.assignedOutreacherId !== undefined
                ? payload.assignedOutreacherId
                  ? Number(payload.assignedOutreacherId)
                  : null
                : state.leads[idx].assignedOutreacherId,
            assignedDeveloperId:
              payload.assignedDeveloperId !== undefined
                ? payload.assignedDeveloperId
                  ? Number(payload.assignedDeveloperId)
                  : null
                : state.leads[idx].assignedDeveloperId,
            estimatedDealValue: Number(payload.estimatedDealValue) || 0,
            agreedDealValue: Number(payload.agreedDealValue) || 0,
            updatedAt: new Date().toISOString(),
          };
        }
      } else {
        const newLeadId = Date.now();
        state.leads.unshift({
          id: newLeadId,
          businessName: String(payload.businessName || '').trim(),
          contactName: payload.contactName || '',
          phone: payload.phone || '',
          email: payload.email || '',
          websiteUrl: payload.websiteUrl || '',
          googleMapsUrl: payload.googleMapsUrl || '',
          externalPlaceId: null,
          categoryId: payload.categoryId ? Number(payload.categoryId) : null,
          categoryName: payload.categoryName || 'Jewellery Stores',
          country: payload.country || 'India',
          state: payload.state || 'Karnataka',
          district: payload.district || '',
          city: payload.city || 'Bengaluru',
          locality: payload.locality || 'Whitefield',
          locationId: payload.locationId ? Number(payload.locationId) : null,
          address: payload.address || '',
          websiteStatus: payload.websiteStatus || 'No Website',
          source: payload.source || 'Manual Entry',
          status: payload.status || 'New Lead',
          priority: payload.priority || 'Medium',
          assignedOutreacherId: payload.assignedOutreacherId ? Number(payload.assignedOutreacherId) : null,
          assignedDeveloperId: payload.assignedDeveloperId ? Number(payload.assignedDeveloperId) : null,
          estimatedDealValue: Number(payload.estimatedDealValue) || 0,
          agreedDealValue: Number(payload.agreedDealValue) || 0,
          nextFollowUpAt: payload.nextFollowUpAt || '',
          lastContactedAt: '',
          notes: payload.notes || '',
          tags: payload.tags || '',
          isArchived: false,
          createdBy: actorName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      break;
    }

    case 'DELETE_LEADS': {
      const ids = new Set((payload.leadIds || []).map((n: unknown) => Number(n)));
      state.leads = state.leads.filter((l) => !ids.has(l.id));
      state.activities = state.activities.filter((a) => !ids.has(a.leadId));
      state.assignments = state.assignments.filter((a) => !ids.has(a.leadId));
      state.deals = state.deals.filter((d) => !ids.has(d.leadId));
      state.commissions = state.commissions.filter((c) => !c.leadId || !ids.has(c.leadId));
      break;
    }

    case 'CLEAR_ALL_LEADS': {
      state.leads = [];
      state.activities = [];
      state.assignments = [];
      state.deals = [];
      state.commissions = [];
      break;
    }

    case 'BULK_UPDATE_LEADS': {
      const ids = new Set((payload.leadIds || []).map((n: unknown) => Number(n)));
      state.leads = state.leads.map((l) => {
        if (!ids.has(l.id)) return l;
        return {
          ...l,
          assignedOutreacherId:
            payload.assignedOutreacherId !== undefined
              ? payload.assignedOutreacherId
                ? Number(payload.assignedOutreacherId)
                : null
              : l.assignedOutreacherId,
          status: payload.status !== undefined ? payload.status : l.status,
          isArchived: payload.isArchived !== undefined ? Boolean(payload.isArchived) : l.isArchived,
          updatedAt: new Date().toISOString(),
        };
      });
      break;
    }

    case 'ADD_LEAD_ACTIVITY': {
      const leadId = Number(payload.leadId);
      const timestamp = payload.occurredAt || new Date().toISOString().slice(0, 16).replace('T', ' ');
      state.activities.unshift({
        id: Date.now(),
        leadId,
        userId: payload.userId ? Number(payload.userId) : null,
        userName: actorName,
        activityType: payload.activityType || 'Phone Call',
        outcome: payload.outcome || 'Connected',
        notes: payload.notes || '',
        occurredAt: timestamp,
        nextFollowUpAt: payload.nextFollowUpAt || null,
        isVerifiedIntegration: false,
      });
      const leadIdx = state.leads.findIndex((l) => l.id === leadId);
      if (leadIdx >= 0) {
        state.leads[leadIdx].lastContactedAt = timestamp.slice(0, 10);
        if (payload.nextFollowUpAt) state.leads[leadIdx].nextFollowUpAt = payload.nextFollowUpAt;
        if (payload.newLeadStatus) state.leads[leadIdx].status = payload.newLeadStatus;
        state.leads[leadIdx].updatedAt = new Date().toISOString();
      }
      break;
    }

    case 'BATCH_IMPORT_LEADS': {
      const rows = payload.rows || [];
      let importedCount = 0;
      for (const item of rows) {
        if (item.resolution === 'skip' || !item.businessName) continue;
        state.leads.unshift({
          id: Date.now() + importedCount,
          businessName: String(item.businessName).trim(),
          contactName: item.contactName || '',
          phone: item.phone || '',
          email: item.email || '',
          websiteUrl: item.websiteUrl || '',
          googleMapsUrl: item.googleMapsUrl || '',
          externalPlaceId: null,
          categoryId: null,
          categoryName: item.categoryName || 'Jewellery Stores',
          country: item.country || 'India',
          state: item.state || 'Karnataka',
          district: item.district || '',
          city: item.city || 'Bengaluru',
          locality: item.locality || 'Whitefield',
          locationId: null,
          address: item.address || '',
          websiteStatus: item.websiteStatus || 'Website Status Unknown',
          source: `Spreadsheet Import (${payload.filename || 'import.csv'})`,
          status: 'Not Contacted',
          priority: 'Medium',
          assignedOutreacherId: null,
          assignedDeveloperId: null,
          estimatedDealValue: Number(item.estimatedDealValue) || 40000,
          agreedDealValue: 0,
          nextFollowUpAt: '',
          lastContactedAt: '',
          notes: item.notes || '',
          tags: '',
          isArchived: false,
          createdBy: actorName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        importedCount++;
      }
      break;
    }

    case 'UPSERT_PROJECT': {
      const id = payload.id ? Number(payload.id) : null;
      if (id) {
        const idx = state.projects.findIndex((p) => p.id === id);
        if (idx >= 0) {
          state.projects[idx] = {
            ...state.projects[idx],
            ...payload,
            id,
            assignedDeveloperId:
              payload.assignedDeveloperId !== undefined
                ? payload.assignedDeveloperId
                  ? Number(payload.assignedDeveloperId)
                  : null
                : state.projects[idx].assignedDeveloperId,
          };
        }
      } else {
        state.projects.unshift({
          id: Date.now(),
          leadId: payload.leadId ? Number(payload.leadId) : null,
          dealId: payload.dealId ? Number(payload.dealId) : null,
          clientName: payload.clientName,
          projectName: payload.projectName,
          description: payload.description || '',
          requirements: payload.requirements || '',
          status: payload.status || 'Not Started',
          priority: payload.priority || 'Medium',
          assignedDeveloperId: payload.assignedDeveloperId ? Number(payload.assignedDeveloperId) : null,
          collaboratorIds: payload.collaboratorIds || '',
          startDate: payload.startDate || today,
          dueDate: payload.dueDate || '',
          completedAt: null,
          deliveredAt: null,
          agreedPrice: Number(payload.agreedPrice) || 0,
          currency: 'INR',
          agreedDeveloperCost: Number(payload.agreedDeveloperCost) || 0,
          otherExpenses: Number(payload.otherExpenses) || 0,
          clientFeedback: payload.clientFeedback || '',
          revisionCount: Number(payload.revisionCount) || 0,
          notes: payload.notes || '',
        });
      }
      break;
    }

    case 'DELETE_PROJECT': {
      const projId = Number(payload.id);
      state.projects = state.projects.filter((p) => p.id !== projId);
      state.tasks = state.tasks.filter((t) => t.projectId !== projId);
      break;
    }

    case 'UPSERT_PROJECT_TASK': {
      const id = payload.id ? Number(payload.id) : null;
      if (id) {
        const idx = state.tasks.findIndex((t) => t.id === id);
        if (idx >= 0) {
          state.tasks[idx] = {
            ...state.tasks[idx],
            ...payload,
            id,
            assignedDeveloperId:
              payload.assignedDeveloperId !== undefined
                ? payload.assignedDeveloperId
                  ? Number(payload.assignedDeveloperId)
                  : null
                : state.tasks[idx].assignedDeveloperId,
          };
        }
      } else {
        state.tasks.push({
          id: Date.now(),
          projectId: Number(payload.projectId),
          title: payload.title,
          description: payload.description || '',
          status: payload.status || 'To Do',
          priority: payload.priority || 'Medium',
          assignedDeveloperId: payload.assignedDeveloperId ? Number(payload.assignedDeveloperId) : null,
          dueDate: payload.dueDate || '',
          completedAt: payload.status === 'Completed' ? today : null,
        });
      }
      break;
    }

    case 'DELETE_PROJECT_TASK': {
      state.tasks = state.tasks.filter((t) => t.id !== Number(payload.id));
      break;
    }

    case 'ADD_PAYMENT': {
      state.payments.unshift({
        id: Date.now(),
        projectId: payload.projectId ? Number(payload.projectId) : null,
        dealId: payload.dealId ? Number(payload.dealId) : null,
        payerOrPayee: payload.payerOrPayee,
        paymentDirection: payload.paymentDirection || 'inbound_client',
        paymentType: payload.paymentType || 'Advance',
        amount: Math.round(Number(payload.amount) || 0),
        currency: 'INR',
        status: payload.status || 'Completed',
        paidAt: payload.paidAt || today,
        reference: payload.reference,
        notes: payload.notes || '',
      });
      break;
    }

    case 'UPSERT_TEAM_MEMBER': {
      const id = payload.id ? Number(payload.id) : null;
      if (id) {
        const idx = state.users.findIndex((u) => u.id === id);
        if (idx >= 0) {
          state.users[idx] = { ...state.users[idx], ...payload, id };
        }
      } else {
        state.users.push({
          id: Date.now(),
          uid: `${payload.role || 'outreacher'}-${Date.now()}`,
          fullName: payload.fullName,
          email: payload.email,
          phone: payload.phone || '',
          role: payload.role || 'outreacher',
          accountStatus: payload.accountStatus || 'Active',
          languagesSpoken: payload.languagesSpoken || 'English, Hindi',
          startDate: payload.startDate || today,
          assignedLocations: payload.assignedLocations || '',
          assignedCategories: payload.assignedCategories || '',
          commissionType: payload.commissionType || 'fixed',
          commissionRate: Number(payload.commissionRate) || 1000,
          skills: payload.skills || '',
          specialities: payload.specialities || '',
          employmentStatus: payload.employmentStatus || 'Contractor',
          paymentArrangement: payload.paymentArrangement || '',
          notes: payload.notes || '',
        });
      }
      break;
    }

    case 'DELETE_TEAM_MEMBER': {
      const memberId = Number(payload.id);
      const memberEmail = payload.email ? String(payload.email).trim().toLowerCase() : '';
      state.users = state.users.filter(
        (u) =>
          u.id !== memberId &&
          (!memberEmail || (u.email || '').trim().toLowerCase() !== memberEmail)
      );
      state.leads = state.leads.map((l) => ({
        ...l,
        assignedOutreacherId: l.assignedOutreacherId === memberId ? null : l.assignedOutreacherId,
        assignedDeveloperId: l.assignedDeveloperId === memberId ? null : l.assignedDeveloperId,
      }));
      state.savedLocations = state.savedLocations.map((s) => ({
        ...s,
        assignedOutreacherId: s.assignedOutreacherId === memberId ? null : s.assignedOutreacherId,
      }));
      state.projects = state.projects.map((p) => ({
        ...p,
        assignedDeveloperId: p.assignedDeveloperId === memberId ? null : p.assignedDeveloperId,
      }));
      state.tasks = state.tasks.map((t) => ({
        ...t,
        assignedDeveloperId: t.assignedDeveloperId === memberId ? null : t.assignedDeveloperId,
      }));
      break;
    }

    case 'UPDATE_COMMISSION_STATUS': {
      const idx = state.commissions.findIndex((c) => c.id === Number(payload.id));
      if (idx >= 0) {
        state.commissions[idx].status = payload.status;
        if (payload.status === 'Paid') state.commissions[idx].paidAt = today;
      }
      break;
    }

    case 'UPSERT_CATEGORY': {
      state.categories.push({
        id: Date.now(),
        name: payload.name,
        description: payload.description || '',
        isActive: true,
      });
      break;
    }

    case 'UPDATE_SETTINGS': {
      if (state.settings) {
        state.settings = {
          ...state.settings,
          ...payload,
        };
      }
      break;
    }
  }

  saveClientFallbackState(state);
  return state;
}
