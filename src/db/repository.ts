import { db, withDbRetry } from './index.ts';
import {
  users,
  locations,
  savedLocations,
  businessCategories,
  leads,
  leadActivities,
  leadAssignments,
  deals,
  commissions,
  projects,
  projectTasks,
  payments,
  importJobs,
  auditLogs,
  agencySettings,
} from './schema.ts';
import { eq, desc, asc } from 'drizzle-orm';
import { calculateCommissionAmount, normalizeText } from '../lib/crm-logic.ts';
import { INDIA_STATES_AND_PLACES } from '../lib/india-locations-seed.ts';

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

let isSeeding = false;

export async function getOrCreateUser(uid: string, email: string, fullName?: string) {
  try {
    const result = await withDbRetry(() =>
      db
        .insert(users)
        .values({
          uid,
          email,
          fullName: fullName || email.split('@')[0] || 'Agency Operator',
          role: 'admin',
          accountStatus: 'Active',
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email,
            updatedAt: new Date(),
          },
        })
        .returning()
    );

    return result[0];
  } catch (error) {
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function ensureSeeded() {
  if (isSeeding) return;
  try {
    const existingLocs = await db.select().from(locations).limit(1);
    if (existingLocs.length > 0) {
      return;
    }
    isSeeding = true;

    // 1. Agency Settings
    await db.insert(agencySettings).values({
      agencyName: 'Agency Command Center',
      defaultCurrency: 'INR',
      timezone: 'Asia/Kolkata',
      dateFormat: 'YYYY-MM-DD',
      defaultCommissionType: 'fixed',
      defaultCommissionValue: 1000,
      leadStatuses: JSON.stringify(DEFAULT_LEAD_STATUSES),
      projectStatuses: JSON.stringify(DEFAULT_PROJECT_STATUSES),
    });

    // 2. Business Categories
    const categorySeed = [
      { name: 'Jewellery Stores', description: 'Retail gold, diamond, and bridal jewellery showrooms' },
      { name: 'Photography Studios', description: 'Wedding, commercial, and portrait photography studios' },
      { name: 'Interior Designers', description: 'Residential and commercial interior architecture studios' },
      { name: 'Furniture Stores', description: 'Bespoke furniture showrooms and modular home decor' },
      { name: 'Car Dealerships', description: 'Pre-owned luxury and multi-brand auto dealerships' },
      { name: 'SaaS Startups', description: 'Early and growth-stage software product companies' },
      { name: 'Coaches and Consultants', description: 'Executive coaches, financial advisors, and B2B consultants' },
      { name: 'Ecommerce Brands', description: 'D2C apparel, specialty food, and lifestyle brands' },
      { name: 'Marketing Agencies', description: 'Boutique performance and creative agencies' },
      { name: 'Dental & Aesthetic Clinics', description: 'Specialty healthcare, dermatology, and dental practices' },
    ];
    const insertedCategories = await db
      .insert(businessCategories)
      .values(categorySeed)
      .onConflictDoNothing()
      .returning();

    const catMap = new Map(insertedCategories.map((c) => [c.name, c.id]));

    // 3. Team Profiles (Admin, Outreachers, Developers)
    const teamSeed = [
      {
        uid: 'admin-aaditya-01',
        email: 'aadipasso1@gmail.com',
        fullName: 'Aaditya Verma',
        phone: '+91 98450 10001',
        role: 'admin',
        accountStatus: 'Active',
        languagesSpoken: 'English, Hindi, Kannada',
        startDate: '2025-01-10',
        commissionType: 'fixed',
        commissionRate: 1000,
        notes: 'Founder & Managing Director',
      },
      {
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
        notes: 'Senior outbound specialist for high-ticket retail showrooms',
      },
      {
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
        notes: 'Specializes in WhatsApp + consultative discovery calls',
      },
      {
        uid: 'outreacher-kabir-03',
        email: 'kabir.mehta@agencycommand.in',
        fullName: 'Kabir Mehta',
        phone: '+91 98114 55902',
        role: 'outreacher',
        accountStatus: 'Active',
        languagesSpoken: 'English, Hindi, Gujarati',
        startDate: '2025-07-20',
        assignedLocations: 'Connaught Place, Banjara Hills, SoHo',
        assignedCategories: 'Car Dealerships, Ecommerce Brands, SaaS Startups',
        commissionType: 'fixed',
        commissionRate: 1500,
        notes: 'Handles North India & international outbound campaigns',
      },
      {
        uid: 'developer-vikram-01',
        email: 'vikram.rao@agencycommand.in',
        fullName: 'Vikram Rao',
        phone: '+91 99001 44210',
        role: 'developer',
        accountStatus: 'Active',
        skills: 'Next.js, React, TypeScript, Tailwind CSS, Shopify, PostgreSQL',
        specialities: 'Luxury E-commerce & Catalogue Showrooms',
        employmentStatus: 'Full-Time',
        paymentArrangement: '₹12,000 per standard project / ₹22,000 e-commerce',
        startDate: '2025-02-01',
        notes: 'Lead Full-Stack Architect',
      },
      {
        uid: 'developer-ananya-02',
        email: 'ananya.desai@agencycommand.in',
        fullName: 'Ananya Desai',
        phone: '+91 98220 88914',
        role: 'developer',
        accountStatus: 'Active',
        skills: 'Figma, React, Framer Motion, Webflow, WordPress, SEO',
        specialities: 'High-Conversion Studio & Interior Design Portfolios',
        employmentStatus: 'Contractor',
        paymentArrangement: '₹10,000 per project milestone',
        startDate: '2025-04-12',
        notes: 'UI/UX & Frontend Specialist',
      },
      {
        uid: 'developer-devansh-03',
        email: 'devansh.iyer@agencycommand.in',
        fullName: 'Devansh Iyer',
        phone: '+91 97405 61239',
        role: 'developer',
        accountStatus: 'Active',
        skills: 'Node.js, Next.js, Stripe, Razorpay, Booking Systems',
        specialities: 'Custom Booking & Dealership Inventory Portals',
        employmentStatus: 'Contractor',
        paymentArrangement: '₹15,000 per custom web app',
        startDate: '2025-06-01',
        notes: 'Backend & Integrations Engineer',
      },
    ];

    const insertedUsers = await db.insert(users).values(teamSeed).onConflictDoNothing().returning();
    const userByUid = new Map(insertedUsers.map((u) => [u.uid, u]));
    const rohan = userByUid.get('outreacher-rohan-01') || insertedUsers[1];
    const priya = userByUid.get('outreacher-priya-02') || insertedUsers[2];
    const kabir = userByUid.get('outreacher-kabir-03') || insertedUsers[3];
    const vikram = userByUid.get('developer-vikram-01') || insertedUsers[4];
    const ananya = userByUid.get('developer-ananya-02') || insertedUsers[5];
    const devansh = userByUid.get('developer-devansh-03') || insertedUsers[6];

    // 4. Geographical Location Hierarchy
    type LocDef = {
      extId: string;
      name: string;
      type: string;
      level: number;
      cc: string;
      lat: string;
      lng: string;
      parentExtId?: string;
    };

    const locDefs: LocDef[] = [
      // Countries (Level 0)
      { extId: 'GN-IN', name: 'India', type: 'Country', level: 0, cc: 'IN', lat: '20.5937', lng: '78.9629' },
      { extId: 'GN-US', name: 'United States', type: 'Country', level: 0, cc: 'US', lat: '37.0902', lng: '-95.7129' },
      { extId: 'GN-GB', name: 'United Kingdom', type: 'Country', level: 0, cc: 'GB', lat: '55.3781', lng: '-3.4360' },
      { extId: 'GN-AE', name: 'United Arab Emirates', type: 'Country', level: 0, cc: 'AE', lat: '23.4241', lng: '53.8478' },

      // States / First-level Admin (Level 1)
      { extId: 'GN-IN-KA', name: 'Karnataka', type: 'State / Union Territory', level: 1, cc: 'IN', lat: '15.3173', lng: '75.7139', parentExtId: 'GN-IN' },
      { extId: 'GN-IN-MH', name: 'Maharashtra', type: 'State / Union Territory', level: 1, cc: 'IN', lat: '19.7515', lng: '75.7139', parentExtId: 'GN-IN' },
      { extId: 'GN-IN-DL', name: 'Delhi', type: 'State / Union Territory', level: 1, cc: 'IN', lat: '28.7041', lng: '77.1025', parentExtId: 'GN-IN' },
      { extId: 'GN-IN-TG', name: 'Telangana', type: 'State / Union Territory', level: 1, cc: 'IN', lat: '18.1124', lng: '79.0193', parentExtId: 'GN-IN' },
      { extId: 'GN-US-CA', name: 'California', type: 'State', level: 1, cc: 'US', lat: '36.7783', lng: '-119.4179', parentExtId: 'GN-US' },
      { extId: 'GN-US-NY', name: 'New York', type: 'State', level: 1, cc: 'US', lat: '40.7128', lng: '-74.0060', parentExtId: 'GN-US' },
      { extId: 'GN-GB-ENG', name: 'England', type: 'Country / Nation', level: 1, cc: 'GB', lat: '52.3555', lng: '-1.1743', parentExtId: 'GN-GB' },
      { extId: 'GN-AE-DU', name: 'Dubai Emirate', type: 'Emirate', level: 1, cc: 'AE', lat: '25.2048', lng: '55.2708', parentExtId: 'GN-AE' },

      // Districts / Counties (Level 2)
      { extId: 'GN-IN-KA-BLR-U', name: 'Bengaluru Urban', type: 'District', level: 2, cc: 'IN', lat: '12.9716', lng: '77.5946', parentExtId: 'GN-IN-KA' },
      { extId: 'GN-IN-KA-MYS', name: 'Mysuru District', type: 'District', level: 2, cc: 'IN', lat: '12.2958', lng: '76.6394', parentExtId: 'GN-IN-KA' },
      { extId: 'GN-IN-MH-MUM-S', name: 'Mumbai Suburban', type: 'District', level: 2, cc: 'IN', lat: '19.1136', lng: '72.8697', parentExtId: 'GN-IN-MH' },
      { extId: 'GN-IN-MH-PUN', name: 'Pune District', type: 'District', level: 2, cc: 'IN', lat: '18.5204', lng: '73.8567', parentExtId: 'GN-IN-MH' },
      { extId: 'GN-IN-DL-ND', name: 'New Delhi District', type: 'District', level: 2, cc: 'IN', lat: '28.6139', lng: '77.2090', parentExtId: 'GN-IN-DL' },
      { extId: 'GN-IN-TG-HYD', name: 'Hyderabad District', type: 'District', level: 2, cc: 'IN', lat: '17.3850', lng: '78.4867', parentExtId: 'GN-IN-TG' },
      { extId: 'GN-US-CA-SCC', name: 'Santa Clara County', type: 'County', level: 2, cc: 'US', lat: '37.3541', lng: '-121.9552', parentExtId: 'GN-US-CA' },
      { extId: 'GN-US-NY-NYC', name: 'New York County', type: 'County', level: 2, cc: 'US', lat: '40.7831', lng: '-73.9712', parentExtId: 'GN-US-NY' },
      { extId: 'GN-GB-ENG-LDN', name: 'Greater London', type: 'Metropolitan County', level: 2, cc: 'GB', lat: '51.5072', lng: '-0.1276', parentExtId: 'GN-GB-ENG' },
      { extId: 'GN-AE-DU-MUN', name: 'Dubai Municipality', type: 'Municipality', level: 2, cc: 'AE', lat: '25.2048', lng: '55.2708', parentExtId: 'GN-AE-DU' },

      // Cities / Towns (Level 3)
      { extId: 'GN-CITY-BLR', name: 'Bengaluru', type: 'City', level: 3, cc: 'IN', lat: '12.9716', lng: '77.5946', parentExtId: 'GN-IN-KA-BLR-U' },
      { extId: 'GN-CITY-MYS', name: 'Mysuru', type: 'City', level: 3, cc: 'IN', lat: '12.2958', lng: '76.6394', parentExtId: 'GN-IN-KA-MYS' },
      { extId: 'GN-CITY-MUM', name: 'Mumbai', type: 'City', level: 3, cc: 'IN', lat: '19.0760', lng: '72.8777', parentExtId: 'GN-IN-MH-MUM-S' },
      { extId: 'GN-CITY-PUN', name: 'Pune', type: 'City', level: 3, cc: 'IN', lat: '18.5204', lng: '73.8567', parentExtId: 'GN-IN-MH-PUN' },
      { extId: 'GN-CITY-NDL', name: 'New Delhi', type: 'City', level: 3, cc: 'IN', lat: '28.6139', lng: '77.2090', parentExtId: 'GN-IN-DL-ND' },
      { extId: 'GN-CITY-HYD', name: 'Hyderabad', type: 'City', level: 3, cc: 'IN', lat: '17.3850', lng: '78.4867', parentExtId: 'GN-IN-TG-HYD' },
      { extId: 'GN-CITY-SJC', name: 'San Jose', type: 'City', level: 3, cc: 'US', lat: '37.3382', lng: '-121.8863', parentExtId: 'GN-US-CA-SCC' },
      { extId: 'GN-CITY-NYC', name: 'New York City', type: 'City', level: 3, cc: 'US', lat: '40.7128', lng: '-74.0060', parentExtId: 'GN-US-NY-NYC' },
      { extId: 'GN-CITY-LDN', name: 'London', type: 'City', level: 3, cc: 'GB', lat: '51.5072', lng: '-0.1276', parentExtId: 'GN-GB-ENG-LDN' },
      { extId: 'GN-CITY-DXB', name: 'Dubai', type: 'City', level: 3, cc: 'AE', lat: '25.2048', lng: '55.2708', parentExtId: 'GN-AE-DU-MUN' },

      // Localities / Neighborhoods (Level 4)
      { extId: 'GN-LOC-WHITEFIELD', name: 'Whitefield', type: 'Locality', level: 4, cc: 'IN', lat: '12.9698', lng: '77.7500', parentExtId: 'GN-CITY-BLR' },
      { extId: 'GN-LOC-MARATHAHALLI', name: 'Marathahalli', type: 'Locality', level: 4, cc: 'IN', lat: '12.9591', lng: '77.6974', parentExtId: 'GN-CITY-BLR' },
      { extId: 'GN-LOC-JPNAGAR', name: 'JP Nagar', type: 'Locality', level: 4, cc: 'IN', lat: '12.9063', lng: '77.5857', parentExtId: 'GN-CITY-BLR' },
      { extId: 'GN-LOC-INDIRANAGAR', name: 'Indiranagar', type: 'Locality', level: 4, cc: 'IN', lat: '12.9784', lng: '77.6408', parentExtId: 'GN-CITY-BLR' },
      { extId: 'GN-LOC-KORAMANGALA', name: 'Koramangala', type: 'Locality', level: 4, cc: 'IN', lat: '12.9352', lng: '77.6245', parentExtId: 'GN-CITY-BLR' },
      { extId: 'GN-LOC-HSRLAYOUT', name: 'HSR Layout', type: 'Locality', level: 4, cc: 'IN', lat: '12.9121', lng: '77.6446', parentExtId: 'GN-CITY-BLR' },
      { extId: 'GN-LOC-JAYANAGAR', name: 'Jayanagar', type: 'Locality', level: 4, cc: 'IN', lat: '12.9308', lng: '77.5838', parentExtId: 'GN-CITY-BLR' },
      { extId: 'GN-LOC-BANDRAWEST', name: 'Bandra West', type: 'Locality', level: 4, cc: 'IN', lat: '19.0596', lng: '72.8295', parentExtId: 'GN-CITY-MUM' },
      { extId: 'GN-LOC-ANDHERIWEST', name: 'Andheri West', type: 'Locality', level: 4, cc: 'IN', lat: '19.1364', lng: '72.8296', parentExtId: 'GN-CITY-MUM' },
      { extId: 'GN-LOC-JUHU', name: 'Juhu', type: 'Locality', level: 4, cc: 'IN', lat: '19.1075', lng: '72.8263', parentExtId: 'GN-CITY-MUM' },
      { extId: 'GN-LOC-POWAI', name: 'Powai', type: 'Locality', level: 4, cc: 'IN', lat: '19.1176', lng: '72.9060', parentExtId: 'GN-CITY-MUM' },
      { extId: 'GN-LOC-KOREGAONPARK', name: 'Koregaon Park', type: 'Locality', level: 4, cc: 'IN', lat: '18.5362', lng: '73.8940', parentExtId: 'GN-CITY-PUN' },
      { extId: 'GN-LOC-BANER', name: 'Baner', type: 'Locality', level: 4, cc: 'IN', lat: '18.5590', lng: '73.7868', parentExtId: 'GN-CITY-PUN' },
      { extId: 'GN-LOC-CONNAUGHT', name: 'Connaught Place', type: 'Locality', level: 4, cc: 'IN', lat: '28.6315', lng: '77.2167', parentExtId: 'GN-CITY-NDL' },
      { extId: 'GN-LOC-HAUZKHAS', name: 'Hauz Khas', type: 'Locality', level: 4, cc: 'IN', lat: '28.5494', lng: '77.2001', parentExtId: 'GN-CITY-NDL' },
      { extId: 'GN-LOC-BANJARAHILLS', name: 'Banjara Hills', type: 'Locality', level: 4, cc: 'IN', lat: '17.4156', lng: '78.4347', parentExtId: 'GN-CITY-HYD' },
      { extId: 'GN-LOC-JUBILEEHILLS', name: 'Jubilee Hills', type: 'Locality', level: 4, cc: 'IN', lat: '17.4326', lng: '78.4071', parentExtId: 'GN-CITY-HYD' },
      { extId: 'GN-LOC-WILLOWGLEN', name: 'Willow Glen', type: 'Locality', level: 4, cc: 'US', lat: '37.3058', lng: '-121.8988', parentExtId: 'GN-CITY-SJC' },
      { extId: 'GN-LOC-SOHO-NY', name: 'SoHo', type: 'Locality', level: 4, cc: 'US', lat: '40.7233', lng: '-74.0030', parentExtId: 'GN-CITY-NYC' },
      { extId: 'GN-LOC-MAYFAIR', name: 'Mayfair', type: 'Locality', level: 4, cc: 'GB', lat: '51.5116', lng: '-0.1478', parentExtId: 'GN-CITY-LDN' },
      { extId: 'GN-LOC-SHOREDITCH', name: 'Shoreditch', type: 'Locality', level: 4, cc: 'GB', lat: '51.5229', lng: '-0.0777', parentExtId: 'GN-CITY-LDN' },
      { extId: 'GN-LOC-BUSINESSBAY', name: 'Business Bay', type: 'Locality', level: 4, cc: 'AE', lat: '25.1850', lng: '55.2650', parentExtId: 'GN-CITY-DXB' },
    ];

    const extToId = new Map<string, number>();
    for (const level of [0, 1, 2, 3, 4]) {
      const batch = locDefs.filter((l) => l.level === level);
      for (const item of batch) {
        const parentId = item.parentExtId ? extToId.get(item.parentExtId) ?? null : null;
        const [inserted] = await db
          .insert(locations)
          .values({
            parentLocationId: parentId,
            name: item.name,
            normalizedName: normalizeText(item.name),
            locationType: item.type,
            administrativeLevel: item.level,
            countryCode: item.cc,
            externalGeographicId: item.extId,
            latitude: item.lat,
            longitude: item.lng,
            dataSource: 'GeoNames Authoritative Hierarchy',
          })
          .onConflictDoNothing()
          .returning();
        if (inserted) {
          extToId.set(item.extId, inserted.id);
        }
      }
    }

    const whitefieldId = extToId.get('GN-LOC-WHITEFIELD');
    const indiranagarId = extToId.get('GN-LOC-INDIRANAGAR');
    const bandraWestId = extToId.get('GN-LOC-BANDRAWEST');
    const jpnagarId = extToId.get('GN-LOC-JPNAGAR');

    // 5. Saved Target Locations
    if (whitefieldId && indiranagarId && bandraWestId && jpnagarId) {
      await db
        .insert(savedLocations)
        .values([
          {
            locationId: whitefieldId,
            status: 'In Progress',
            priority: 'High',
            targetCategories: 'Jewellery Stores, Dental & Aesthetic Clinics',
            notes: 'High concentration of independent family-owned bridal jewellers on ITPL Main Road without modern websites.',
            targetLeadCount: 40,
            assignedOutreacherId: rohan?.id,
            lastResearchedAt: '2026-10-20',
            createdBy: 'Aaditya Verma',
          },
          {
            locationId: indiranagarId,
            status: 'Ready for Outreach',
            priority: 'High',
            targetCategories: 'Interior Designers, Photography Studios',
            notes: '100 Feet Road design studios and luxury home decor boutiques.',
            targetLeadCount: 35,
            assignedOutreacherId: rohan?.id,
            lastResearchedAt: '2026-10-22',
            createdBy: 'Aaditya Verma',
          },
          {
            locationId: bandraWestId,
            status: 'Researching',
            priority: 'High',
            targetCategories: 'Jewellery Stores, Photography Studios, Furniture Stores',
            notes: 'Hill Road & Linking Road heritage showrooms needing catalogue websites.',
            targetLeadCount: 50,
            assignedOutreacherId: priya?.id,
            lastResearchedAt: '2026-10-24',
            createdBy: 'Aaditya Verma',
          },
          {
            locationId: jpnagarId,
            status: 'Not Started',
            priority: 'Medium',
            targetCategories: 'Furniture Stores, Car Dealerships',
            notes: 'Outer Ring Road & 24th Main showrooms.',
            targetLeadCount: 25,
            assignedOutreacherId: priya?.id,
            lastResearchedAt: '2026-10-18',
            createdBy: 'Aaditya Verma',
          },
        ])
        .onConflictDoNothing();
    }

    await db.insert(auditLogs).values([
      {
        actorName: 'Aaditya Verma',
        actorRole: 'admin',
        action: 'SEED_INITIALIZED',
        entityType: 'workspace',
        entityId: '1',
        details: 'Initialized GeoNames location hierarchy, categories, outreachers, and developers.',
      },
    ]);
  } catch (error) {
    console.warn('Warning seeding initial database:', error);
  } finally {
    isSeeding = false;
  }
}

let isSeedingIndia = false;

export async function ensureFullIndiaHierarchy() {
  if (isSeedingIndia) return;
  try {
    const existing = await db.select().from(locations);
    if (existing.length >= 300) {
      return;
    }
    isSeedingIndia = true;

    let currentLocs = existing;
    let indiaNode = currentLocs.find(
      (l) => l.externalGeographicId === 'GN-IN' || (l.administrativeLevel === 0 && l.countryCode === 'IN')
    );

    if (!indiaNode) {
      const [insertedIndia] = await db
        .insert(locations)
        .values({
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
        })
        .onConflictDoNothing()
        .returning();
      indiaNode = insertedIndia;
      currentLocs = await db.select().from(locations);
      indiaNode = currentLocs.find((l) => l.externalGeographicId === 'GN-IN') || indiaNode;
    }

    if (!indiaNode) return;

    const makeSlug = (s: string) =>
      normalizeText(s)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toUpperCase();

    // 1. Batch insert Level 1 (All 36 States & Union Territories of India)
    const existingLevel1ByNorm = new Map(
      currentLocs
        .filter((l) => l.administrativeLevel === 1 && l.countryCode === 'IN')
        .map((l) => [l.normalizedName, l])
    );
    const existingExtIds = new Set(currentLocs.map((l) => l.externalGeographicId));

    const statesToInsert = [];
    for (const st of INDIA_STATES_AND_PLACES) {
      const norm = normalizeText(st.name);
      const extId = `GN-IN-${st.code}`;
      if (!existingLevel1ByNorm.has(norm) && !existingExtIds.has(extId)) {
        statesToInsert.push({
          parentLocationId: indiaNode.id,
          name: st.name,
          normalizedName: norm,
          locationType: st.type === 'Union Territory' ? 'Union Territory' : 'State',
          administrativeLevel: 1,
          countryCode: 'IN',
          externalGeographicId: extId,
          latitude: st.lat,
          longitude: st.lng,
          dataSource: 'India Administrative Census & GeoNames',
        });
        existingExtIds.add(extId);
      }
    }

    if (statesToInsert.length > 0) {
      await db.insert(locations).values(statesToInsert).onConflictDoNothing();
      currentLocs = await db.select().from(locations);
    }

    const stateNodeByCode = new Map<string, typeof currentLocs[0]>();
    for (const st of INDIA_STATES_AND_PLACES) {
      const norm = normalizeText(st.name);
      const extId = `GN-IN-${st.code}`;
      const found = currentLocs.find(
        (l) =>
          l.countryCode === 'IN' &&
          l.administrativeLevel === 1 &&
          (l.externalGeographicId === extId || l.normalizedName === norm || (st.code === 'DL' && l.normalizedName === 'delhi'))
      );
      if (found) {
        stateNodeByCode.set(st.code, found);
      }
    }

    // 2. Batch insert Level 2 (Districts)
    const districtsToInsert = [];
    for (const st of INDIA_STATES_AND_PLACES) {
      const stateNode = stateNodeByCode.get(st.code);
      if (!stateNode) continue;
      for (const dist of st.districts) {
        const normDist = normalizeText(dist.name);
        const extId = `GN-IN-${st.code}-D-${makeSlug(dist.name)}`;
        const alreadyExists = currentLocs.some(
          (l) =>
            l.administrativeLevel === 2 &&
            l.parentLocationId === stateNode.id &&
            (l.normalizedName === normDist || l.externalGeographicId === extId)
        );
        if (!alreadyExists && !existingExtIds.has(extId)) {
          districtsToInsert.push({
            parentLocationId: stateNode.id,
            name: dist.name,
            normalizedName: normDist,
            locationType: 'District',
            administrativeLevel: 2,
            countryCode: 'IN',
            externalGeographicId: extId,
            latitude: st.lat,
            longitude: st.lng,
            dataSource: 'India Administrative Census & GeoNames',
          });
          existingExtIds.add(extId);
        }
      }
    }

    if (districtsToInsert.length > 0) {
      await db.insert(locations).values(districtsToInsert).onConflictDoNothing();
      currentLocs = await db.select().from(locations);
    }

    // 3. Batch insert Level 3 (Cities / Towns)
    const citiesToInsert = [];
    for (const st of INDIA_STATES_AND_PLACES) {
      const stateNode = stateNodeByCode.get(st.code);
      if (!stateNode) continue;
      for (const dist of st.districts) {
        const normDist = normalizeText(dist.name);
        const distNode = currentLocs.find(
          (l) => l.administrativeLevel === 2 && l.parentLocationId === stateNode.id && l.normalizedName === normDist
        );
        if (!distNode) continue;

        for (const city of dist.cities) {
          const normCity = normalizeText(city.name);
          const extId = `GN-IN-${st.code}-C-${makeSlug(city.name)}`;
          const alreadyExists = currentLocs.some(
            (l) =>
              l.administrativeLevel === 3 &&
              l.parentLocationId === distNode.id &&
              (l.normalizedName === normCity || l.externalGeographicId === extId)
          );
          if (!alreadyExists && !existingExtIds.has(extId)) {
            citiesToInsert.push({
              parentLocationId: distNode.id,
              name: city.name,
              normalizedName: normCity,
              locationType: 'City',
              administrativeLevel: 3,
              countryCode: 'IN',
              externalGeographicId: extId,
              latitude: st.lat,
              longitude: st.lng,
              dataSource: 'India Administrative Census & GeoNames',
            });
            existingExtIds.add(extId);
          }
        }
      }
    }

    if (citiesToInsert.length > 0) {
      await db.insert(locations).values(citiesToInsert).onConflictDoNothing();
      currentLocs = await db.select().from(locations);
    }

    // 4. Batch insert Level 4 (Localities / Places)
    const placesToInsert = [];
    for (const st of INDIA_STATES_AND_PLACES) {
      const stateNode = stateNodeByCode.get(st.code);
      if (!stateNode) continue;
      for (const dist of st.districts) {
        const normDist = normalizeText(dist.name);
        const distNode = currentLocs.find(
          (l) => l.administrativeLevel === 2 && l.parentLocationId === stateNode.id && l.normalizedName === normDist
        );
        if (!distNode) continue;

        for (const city of dist.cities) {
          const normCity = normalizeText(city.name);
          const cityNode = currentLocs.find(
            (l) => l.administrativeLevel === 3 && l.parentLocationId === distNode.id && l.normalizedName === normCity
          );
          if (!cityNode) continue;

          for (const placeName of city.places) {
            const normPlace = normalizeText(placeName);
            const extId = `GN-IN-${st.code}-L-${makeSlug(city.name)}-${makeSlug(placeName)}`;
            const alreadyExists = currentLocs.some(
              (l) =>
                l.administrativeLevel === 4 &&
                l.parentLocationId === cityNode.id &&
                (l.normalizedName === normPlace || l.externalGeographicId === extId)
            );
            if (!alreadyExists && !existingExtIds.has(extId)) {
              placesToInsert.push({
                parentLocationId: cityNode.id,
                name: placeName,
                normalizedName: normPlace,
                locationType: 'Locality',
                administrativeLevel: 4,
                countryCode: 'IN',
                externalGeographicId: extId,
                latitude: st.lat,
                longitude: st.lng,
                dataSource: 'India Administrative Census & GeoNames',
              });
              existingExtIds.add(extId);
            }
          }
        }
      }
    }

    if (placesToInsert.length > 0) {
      // Insert in chunks of 100 to keep SQL parameter counts small
      for (let i = 0; i < placesToInsert.length; i += 100) {
        await db.insert(locations).values(placesToInsert.slice(i, i + 100)).onConflictDoNothing();
      }
    }
  } catch (err) {
    console.warn('Warning seeding full India hierarchy:', err);
  } finally {
    isSeedingIndia = false;
  }
}

export async function getAllCrmState() {
  return withDbRetry(async () => {
    await ensureSeeded();
    await ensureFullIndiaHierarchy();

    const [allUsers, allLocations, allSavedLocations, allCategories, allLeads] = await Promise.all([
      db.select().from(users).orderBy(asc(users.id)),
      db.select().from(locations).orderBy(asc(locations.administrativeLevel), asc(locations.name)),
      db.select().from(savedLocations).orderBy(desc(savedLocations.id)),
      db.select().from(businessCategories).orderBy(asc(businessCategories.name)),
      db.select().from(leads).orderBy(desc(leads.updatedAt), desc(leads.id)),
    ]);

    const [allActivities, allAssignments, allDeals, allCommissions, allProjects] = await Promise.all([
      db.select().from(leadActivities).orderBy(desc(leadActivities.id)),
      db.select().from(leadAssignments).orderBy(desc(leadAssignments.id)),
      db.select().from(deals).orderBy(desc(deals.id)),
      db.select().from(commissions).orderBy(desc(commissions.id)),
      db.select().from(projects).orderBy(desc(projects.id)),
    ]);

    const [allTasks, allPayments, allImports, allLogs, settingsRows] = await Promise.all([
      db.select().from(projectTasks).orderBy(asc(projectTasks.id)),
      db.select().from(payments).orderBy(desc(payments.id)),
      db.select().from(importJobs).orderBy(desc(importJobs.id)),
      db.select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(50),
      db.select().from(agencySettings).limit(1),
    ]);

    return {
      users: allUsers,
      locations: allLocations,
      savedLocations: allSavedLocations,
      categories: allCategories,
      leads: allLeads,
      activities: allActivities,
      assignments: allAssignments,
      deals: allDeals,
      commissions: allCommissions,
      projects: allProjects,
      tasks: allTasks,
      payments: allPayments,
      importJobs: allImports,
      auditLogs: allLogs,
      settings: settingsRows[0] || null,
    };
  });
}
