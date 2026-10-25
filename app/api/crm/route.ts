import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../src/db/index.ts';
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
} from '../../../src/db/schema.ts';
import { getAllCrmState, getOrCreateUser } from '../../../src/db/repository.ts';
import { adminAuth } from '../../../src/lib/firebase-admin.ts';
import { calculateCommissionAmount, canUserPerformAction, normalizeText } from '../../../src/lib/crm-logic.ts';
import { eq, inArray } from 'drizzle-orm';

async function verifyOptionalAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    if (token && token !== 'demo-token') {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        return decoded;
      } catch (err) {
        console.warn('Optional Firebase token verification warning:', err);
      }
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyOptionalAuth(req);
    if (decoded && decoded.uid && decoded.email) {
      await getOrCreateUser(decoded.uid, decoded.email, decoded.name);
    }
    const state = await getAllCrmState();
    return NextResponse.json(state);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch CRM data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyOptionalAuth(req);
    const rawBody = await req.text();
    if (!rawBody || !rawBody.trim()) {
      return NextResponse.json({ error: 'Request body cannot be empty' }, { status: 400 });
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload' }, { status: 400 });
    }
    const {
      action,
      payload = {},
      actorRole = 'admin',
      actorName = 'Aaditya Verma',
    } = body as {
      action?: string;
      payload?: Record<string, any>;
      actorRole?: string;
      actorName?: string;
    };

    if (decoded && decoded.uid && decoded.email) {
      await getOrCreateUser(decoded.uid, decoded.email, decoded.name);
    }

    switch (action) {
      case 'SYNC_AUTH_USER': {
        const { uid, email, fullName } = payload;
        if (!uid || !email) {
          return NextResponse.json({ error: 'UID and email are required' }, { status: 400 });
        }
        await getOrCreateUser(uid, email, fullName);
        break;
      }

      case 'SAVE_TARGET_LOCATION': {
        if (!canUserPerformAction(actorRole, 'manage_locations')) {
          return NextResponse.json({ error: 'Forbidden: Only administrators can manage target locations.' }, { status: 403 });
        }
        const {
          locationId,
          status = 'Not Started',
          priority = 'High',
          targetCategories = 'Jewellery Stores',
          notes = '',
          targetLeadCount = 40,
          assignedOutreacherId = null,
        } = payload;

        if (!locationId) {
          return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
        }

        const today = new Date().toISOString().slice(0, 10);
        await db
          .insert(savedLocations)
          .values({
            locationId: Number(locationId),
            status,
            priority,
            targetCategories,
            notes,
            targetLeadCount: Number(targetLeadCount) || 40,
            assignedOutreacherId: assignedOutreacherId ? Number(assignedOutreacherId) : null,
            lastResearchedAt: today,
            createdBy: actorName,
          })
          .onConflictDoUpdate({
            target: savedLocations.locationId,
            set: {
              status,
              priority,
              targetCategories,
              notes,
              targetLeadCount: Number(targetLeadCount) || 40,
              assignedOutreacherId: assignedOutreacherId ? Number(assignedOutreacherId) : null,
              lastResearchedAt: today,
              updatedAt: new Date(),
            },
          });

        await db.insert(auditLogs).values({
          actorName,
          actorRole,
          action: 'SAVED_LOCATION_TARGET',
          entityType: 'saved_location',
          entityId: String(locationId),
          details: `Saved location #${locationId} (${priority} priority, categories: ${targetCategories})`,
        });
        break;
      }

      case 'UPDATE_SAVED_LOCATION': {
        const { id, status, priority, targetCategories, notes, targetLeadCount, assignedOutreacherId } = payload;
        const today = new Date().toISOString().slice(0, 10);
        await db
          .update(savedLocations)
          .set({
            status,
            priority,
            targetCategories,
            notes,
            targetLeadCount: Number(targetLeadCount) || 40,
            assignedOutreacherId: assignedOutreacherId ? Number(assignedOutreacherId) : null,
            lastResearchedAt: today,
            updatedAt: new Date(),
          })
          .where(eq(savedLocations.id, Number(id)));
        break;
      }

      case 'REMOVE_SAVED_LOCATION': {
        if (!canUserPerformAction(actorRole, 'manage_locations')) {
          return NextResponse.json({ error: 'Forbidden: Only administrators can remove saved locations.' }, { status: 403 });
        }
        const { id } = payload;
        // Deletes only the savedLocations target record, never the underlying geographical location
        await db.delete(savedLocations).where(eq(savedLocations.id, Number(id)));
        break;
      }

      case 'IMPORT_GEO_LOCATIONS': {
        if (!canUserPerformAction(actorRole, 'manage_locations')) {
          return NextResponse.json({ error: 'Forbidden: Admin access required to import geographical datasets.' }, { status: 403 });
        }
        const { records = [], filename = 'geonames_batch.json' } = payload;
        let importedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        const existingAll = await db.select().from(locations);
        const extMap = new Map(existingAll.map((l) => [l.externalGeographicId, l.id]));
        const nameAndCountryMap = new Map(
          existingAll.map((l) => [`${l.normalizedName}:${l.countryCode}:${l.administrativeLevel}`, l.id])
        );

        // Sort by administrativeLevel ascending so parents are created before children
        const sorted = [...records].sort(
          (a, b) => (Number(a.administrativeLevel) || 0) - (Number(b.administrativeLevel) || 0)
        );

        for (const row of sorted) {
          const name = String(row.name || '').trim();
          const countryCode = String(row.countryCode || 'IN').trim().toUpperCase();
          const level = Number(row.administrativeLevel ?? 4);
          const locationType = String(row.locationType || 'Locality').trim();
          const extId = String(
            row.externalGeographicId || `GN-${countryCode}-${level}-${normalizeText(name).replace(/\s+/g, '-')}`
          ).trim();

          if (!name || !countryCode) {
            failedCount++;
            continue;
          }

          if (extMap.has(extId)) {
            skippedCount++;
            continue;
          }

          let parentId: number | null = row.parentLocationId ? Number(row.parentLocationId) : null;
          if (!parentId && row.parentExternalId && extMap.has(String(row.parentExternalId))) {
            parentId = extMap.get(String(row.parentExternalId)) || null;
          }
          if (!parentId && row.parentName) {
            const normParent = normalizeText(row.parentName);
            for (let pLevel = level - 1; pLevel >= 0; pLevel--) {
              const found = nameAndCountryMap.get(`${normParent}:${countryCode}:${pLevel}`);
              if (found) {
                parentId = found;
                break;
              }
            }
          }

          const [inserted] = await db
            .insert(locations)
            .values({
              parentLocationId: parentId,
              name,
              normalizedName: normalizeText(name),
              locationType,
              administrativeLevel: level,
              countryCode,
              externalGeographicId: extId,
              latitude: row.latitude ? String(row.latitude) : null,
              longitude: row.longitude ? String(row.longitude) : null,
              dataSource: row.dataSource || 'GeoNames Batch Import',
            })
            .onConflictDoNothing()
            .returning();

          if (inserted) {
            importedCount++;
            extMap.set(extId, inserted.id);
            nameAndCountryMap.set(`${inserted.normalizedName}:${countryCode}:${level}`, inserted.id);
          } else {
            skippedCount++;
          }
        }

        await db.insert(importJobs).values({
          filename,
          importType: 'Locations Dataset',
          status: 'Completed',
          rowsRead: records.length,
          rowsImported: importedCount,
          rowsSkipped: skippedCount,
          rowsFailed: failedCount,
          createdBy: actorName,
        });

        break;
      }

      case 'UPSERT_LEAD': {
        if (!canUserPerformAction(actorRole, 'update_lead')) {
          return NextResponse.json({ error: 'Forbidden: Insufficient permissions to modify leads.' }, { status: 403 });
        }
        const {
          id,
          businessName,
          contactName = '',
          phone = '',
          email = '',
          websiteUrl = '',
          googleMapsUrl = '',
          categoryId = null,
          categoryName = 'Jewellery Stores',
          country = 'India',
          state = '',
          district = '',
          city = '',
          locality = '',
          locationId = null,
          address = '',
          websiteStatus = 'Website Status Unknown',
          source = 'Manual Entry',
          status = 'New Lead',
          priority = 'Medium',
          assignedOutreacherId = null,
          assignedDeveloperId = null,
          estimatedDealValue = 0,
          agreedDealValue = 0,
          nextFollowUpAt = '',
          notes = '',
          tags = '',
        } = payload;

        if (!businessName || !String(businessName).trim()) {
          return NextResponse.json({ error: 'Business Name is required.' }, { status: 400 });
        }

        let targetLeadId = id ? Number(id) : null;
        let previousStatus = '';

        if (targetLeadId) {
          const existingRows = await db.select().from(leads).where(eq(leads.id, targetLeadId));
          if (existingRows[0]) {
            previousStatus = existingRows[0].status;
          }

          await db
            .update(leads)
            .set({
              businessName: String(businessName).trim(),
              contactName,
              phone,
              email,
              websiteUrl,
              googleMapsUrl,
              categoryId: categoryId ? Number(categoryId) : null,
              categoryName,
              country,
              state,
              district,
              city,
              locality,
              locationId: locationId ? Number(locationId) : null,
              address,
              websiteStatus,
              source,
              status,
              priority,
              assignedOutreacherId: assignedOutreacherId ? Number(assignedOutreacherId) : null,
              assignedDeveloperId: assignedDeveloperId ? Number(assignedDeveloperId) : null,
              estimatedDealValue: Math.max(0, Number(estimatedDealValue) || 0),
              agreedDealValue: Math.max(0, Number(agreedDealValue) || 0),
              nextFollowUpAt,
              notes,
              tags,
              updatedAt: new Date(),
            })
            .where(eq(leads.id, targetLeadId));

          if (previousStatus && previousStatus !== status) {
            await db.insert(leadActivities).values({
              leadId: targetLeadId,
              userName: actorName,
              activityType: 'Status Change',
              outcome: `${previousStatus} → ${status}`,
              notes: `Lead status updated from "${previousStatus}" to "${status}".`,
              occurredAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
              nextFollowUpAt: nextFollowUpAt || null,
            });
          }
        } else {
          const [inserted] = await db
            .insert(leads)
            .values({
              businessName: String(businessName).trim(),
              contactName,
              phone,
              email,
              websiteUrl,
              googleMapsUrl,
              categoryId: categoryId ? Number(categoryId) : null,
              categoryName,
              country,
              state,
              district,
              city,
              locality,
              locationId: locationId ? Number(locationId) : null,
              address,
              websiteStatus,
              source,
              status,
              priority,
              assignedOutreacherId: assignedOutreacherId ? Number(assignedOutreacherId) : null,
              assignedDeveloperId: assignedDeveloperId ? Number(assignedDeveloperId) : null,
              estimatedDealValue: Math.max(0, Number(estimatedDealValue) || 0),
              agreedDealValue: Math.max(0, Number(agreedDealValue) || 0),
              nextFollowUpAt,
              notes,
              tags,
              createdBy: actorName,
            })
            .returning();

          targetLeadId = inserted.id;

          await db.insert(leadActivities).values({
            leadId: targetLeadId,
            userName: actorName,
            activityType: 'Note',
            outcome: 'Lead Created',
            notes: `Created lead record for ${businessName} (${locality || city || country}).`,
            occurredAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            nextFollowUpAt: nextFollowUpAt || null,
          });
        }

        // If status is Deal Won, ensure Deal & Non-Duplicate Commission exist
        if (status === 'Deal Won' && targetLeadId) {
          const finalAgreed =
            Math.max(0, Number(agreedDealValue) || 0) || Math.max(0, Number(estimatedDealValue) || 35000);
          const today = new Date().toISOString().slice(0, 10);

          const [upsertedDeal] = await db
            .insert(deals)
            .values({
              leadId: targetLeadId,
              dealName: `${String(businessName).trim()} — Website Development`,
              status: 'Deal Won',
              agreedValue: finalAgreed,
              currency: 'INR',
              outreacherId: assignedOutreacherId ? Number(assignedOutreacherId) : null,
              wonAt: today,
            })
            .onConflictDoUpdate({
              target: deals.leadId,
              set: {
                agreedValue: finalAgreed,
                outreacherId: assignedOutreacherId ? Number(assignedOutreacherId) : null,
                updatedAt: new Date(),
              },
            })
            .returning();

          if (upsertedDeal && assignedOutreacherId) {
            const outreacherRows = await db
              .select()
              .from(users)
              .where(eq(users.id, Number(assignedOutreacherId)));
            const outreacher = outreacherRows[0];
            if (outreacher) {
              const commCalc = calculateCommissionAmount(
                finalAgreed,
                outreacher.commissionType,
                outreacher.commissionRate
              );
              await db
                .insert(commissions)
                .values({
                  dealId: upsertedDeal.id,
                  leadId: targetLeadId,
                  outreacherId: outreacher.id,
                  commissionType: outreacher.commissionType,
                  commissionRate: outreacher.commissionRate,
                  amount: commCalc.amount,
                  currency: 'INR',
                  calculationBasis: commCalc.calculationBasis,
                  status: 'Pending',
                })
                .onConflictDoUpdate({
                  target: commissions.dealId,
                  set: {
                    amount: commCalc.amount,
                    calculationBasis: commCalc.calculationBasis,
                    updatedAt: new Date(),
                  },
                });
            }
          }
        }
        break;
      }

      case 'BULK_UPDATE_LEADS': {
        const { leadIds = [], assignedOutreacherId, status, isArchived } = payload;
        const validIds = (leadIds as number[]).map((n) => Number(n)).filter(Boolean);
        if (validIds.length === 0) {
          return NextResponse.json({ error: 'No leads selected for bulk operation.' }, { status: 400 });
        }

        const updateFields: Record<string, unknown> = { updatedAt: new Date() };
        if (assignedOutreacherId !== undefined) {
          if (!canUserPerformAction(actorRole, 'assign_leads')) {
            return NextResponse.json({ error: 'Forbidden: Only administrators can reassign leads.' }, { status: 403 });
          }
          updateFields.assignedOutreacherId = assignedOutreacherId ? Number(assignedOutreacherId) : null;
        }
        if (status !== undefined) {
          updateFields.status = status;
        }
        if (isArchived !== undefined) {
          updateFields.isArchived = Boolean(isArchived);
        }

        await db.update(leads).set(updateFields).where(inArray(leads.id, validIds));

        if (assignedOutreacherId) {
          const assignRows = validIds.map((lid) => ({
            leadId: lid,
            assignedUserId: Number(assignedOutreacherId),
            assignedBy: actorName,
            notes: 'Bulk lead assignment',
          }));
          await db.insert(leadAssignments).values(assignRows);
        }

        await db.insert(auditLogs).values({
          actorName,
          actorRole,
          action: 'BULK_LEAD_UPDATE',
          entityType: 'leads',
          entityId: validIds.join(','),
          details: `Updated ${validIds.length} leads (${JSON.stringify(payload)})`,
        });
        break;
      }

      case 'DELETE_LEADS': {
        if (!canUserPerformAction(actorRole, 'update_lead')) {
          return NextResponse.json({ error: 'Forbidden: Insufficient permissions to delete leads.' }, { status: 403 });
        }
        const { leadIds = [] } = payload;
        const validIds = (leadIds as number[]).map((n) => Number(n)).filter(Boolean);
        if (validIds.length === 0) {
          return NextResponse.json({ error: 'No leads specified for deletion.' }, { status: 400 });
        }
        await db.update(projects).set({ leadId: null }).where(inArray(projects.leadId, validIds));
        await db.delete(leads).where(inArray(leads.id, validIds));
        await db.insert(auditLogs).values({
          actorName,
          actorRole,
          action: 'LEADS_DELETED',
          entityType: 'leads',
          entityId: validIds.join(','),
          details: `Deleted ${validIds.length} lead record(s)`,
        });
        break;
      }

      case 'CLEAR_ALL_LEADS': {
        if (!canUserPerformAction(actorRole, 'manage_settings')) {
          return NextResponse.json({ error: 'Forbidden: Only administrators can clear all leads.' }, { status: 403 });
        }
        await db.update(payments).set({ dealId: null });
        await db.update(projects).set({ leadId: null, dealId: null });
        await db.delete(leadActivities);
        await db.delete(leadAssignments);
        await db.delete(commissions);
        await db.delete(deals);
        await db.delete(leads);
        await db.insert(auditLogs).values({
          actorName,
          actorRole,
          action: 'ALL_LEADS_CLEARED',
          entityType: 'leads',
          entityId: 'all',
          details: 'Cleared all leads, lead activities, assignments, deals, and commissions.',
        });
        break;
      }

      case 'ADD_LEAD_ACTIVITY': {
        const {
          leadId,
          userId = null,
          activityType = 'Phone Call',
          outcome = 'Connected',
          notes = '',
          occurredAt,
          nextFollowUpAt = '',
          newLeadStatus = '',
        } = payload;

        if (!leadId) {
          return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
        }

        const timestamp = occurredAt || new Date().toISOString().slice(0, 16).replace('T', ' ');
        await db.insert(leadActivities).values({
          leadId: Number(leadId),
          userId: userId ? Number(userId) : null,
          userName: actorName,
          activityType,
          outcome,
          notes,
          occurredAt: timestamp,
          nextFollowUpAt: nextFollowUpAt || null,
          isVerifiedIntegration: false,
        });

        const leadUpdate: Record<string, unknown> = {
          lastContactedAt: timestamp.slice(0, 10),
          updatedAt: new Date(),
        };
        if (nextFollowUpAt) {
          leadUpdate.nextFollowUpAt = nextFollowUpAt;
        }
        if (newLeadStatus) {
          leadUpdate.status = newLeadStatus;
        }
        await db.update(leads).set(leadUpdate).where(eq(leads.id, Number(leadId)));
        break;
      }

      case 'BATCH_IMPORT_LEADS': {
        const { filename = 'imported_leads.csv', rowsRead = 0, rows = [] } = payload;
        let importedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        for (const item of rows) {
          if (item.resolution === 'skip') {
            skippedCount++;
            continue;
          }
          if (!item.businessName || !String(item.businessName).trim()) {
            failedCount++;
            continue;
          }

          if (item.resolution === 'update' && item.matchedLeadId) {
            await db
              .update(leads)
              .set({
                contactName: item.contactName || undefined,
                phone: item.phone || undefined,
                email: item.email || undefined,
                websiteUrl: item.websiteUrl || undefined,
                googleMapsUrl: item.googleMapsUrl || undefined,
                categoryName: item.categoryName || 'Jewellery Stores',
                city: item.city || undefined,
                locality: item.locality || undefined,
                address: item.address || undefined,
                notes: item.notes || undefined,
                updatedAt: new Date(),
              })
              .where(eq(leads.id, Number(item.matchedLeadId)));
            importedCount++;
          } else {
            await db.insert(leads).values({
              businessName: String(item.businessName).trim(),
              contactName: item.contactName || '',
              phone: item.phone || '',
              email: item.email || '',
              websiteUrl: item.websiteUrl || '',
              googleMapsUrl: item.googleMapsUrl || '',
              categoryName: item.categoryName || 'Jewellery Stores',
              country: item.country || 'India',
              state: item.state || 'Karnataka',
              district: item.district || '',
              city: item.city || 'Bengaluru',
              locality: item.locality || 'Whitefield',
              locationId: item.locationId ? Number(item.locationId) : null,
              address: item.address || '',
              websiteStatus: item.websiteStatus || 'Website Status Unknown',
              source: `Spreadsheet Import (${filename})`,
              status: 'Not Contacted',
              priority: 'Medium',
              estimatedDealValue: Number(item.estimatedDealValue) || 40000,
              notes: item.notes || '',
              createdBy: actorName,
            });
            importedCount++;
          }
        }

        await db.insert(importJobs).values({
          filename,
          importType: 'Leads CSV/XLSX',
          status: 'Completed',
          rowsRead: Number(rowsRead) || rows.length,
          rowsImported: importedCount,
          rowsSkipped: skippedCount,
          rowsFailed: failedCount,
          createdBy: actorName,
        });
        break;
      }

      case 'UPSERT_TEAM_MEMBER': {
        if (!canUserPerformAction(actorRole, 'manage_team')) {
          return NextResponse.json({ error: 'Forbidden: Only administrators can manage team members.' }, { status: 403 });
        }
        const {
          id,
          fullName,
          email,
          phone = '',
          role = 'outreacher',
          accountStatus = 'Active',
          languagesSpoken = 'English, Hindi',
          startDate = new Date().toISOString().slice(0, 10),
          assignedLocations = '',
          assignedCategories = '',
          commissionType = 'fixed',
          commissionRate = 1000,
          skills = '',
          specialities = '',
          employmentStatus = 'Contractor',
          paymentArrangement = '',
          notes = '',
        } = payload;

        if (!fullName || !email) {
          return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
        }

        if (id) {
          await db
            .update(users)
            .set({
              fullName,
              email,
              phone,
              role,
              accountStatus,
              languagesSpoken,
              startDate,
              assignedLocations,
              assignedCategories,
              commissionType,
              commissionRate: Number(commissionRate) || 0,
              skills,
              specialities,
              employmentStatus,
              paymentArrangement,
              notes,
              updatedAt: new Date(),
            })
            .where(eq(users.id, Number(id)));
        } else {
          const generatedUid = `${role}-${Date.now()}`;
          await db.insert(users).values({
            uid: generatedUid,
            fullName,
            email,
            phone,
            role,
            accountStatus,
            languagesSpoken,
            startDate,
            assignedLocations,
            assignedCategories,
            commissionType,
            commissionRate: Number(commissionRate) || 0,
            skills,
            specialities,
            employmentStatus,
            paymentArrangement,
            notes,
          });
        }
        break;
      }

      case 'UPDATE_COMMISSION_STATUS': {
        if (!canUserPerformAction(actorRole, 'approve_commission')) {
          return NextResponse.json(
            { error: 'Forbidden: Outreachers cannot approve or pay their own commissions. Administrator required.' },
            { status: 403 }
          );
        }
        const { id, status, adminNotes } = payload;
        const today = new Date().toISOString().slice(0, 10);

        const existingComm = await db.select().from(commissions).where(eq(commissions.id, Number(id)));
        const comm = existingComm[0];
        if (!comm) {
          return NextResponse.json({ error: 'Commission record not found.' }, { status: 404 });
        }

        await db
          .update(commissions)
          .set({
            status,
            approvedBy: status === 'Approved' || status === 'Paid' ? actorName : comm.approvedBy,
            approvedAt: status === 'Approved' || status === 'Paid' ? comm.approvedAt || today : comm.approvedAt,
            paidAt: status === 'Paid' ? today : status === 'Cancelled' ? null : comm.paidAt,
            adminNotes: adminNotes !== undefined ? adminNotes : comm.adminNotes,
            updatedAt: new Date(),
          })
          .where(eq(commissions.id, Number(id)));

        if (status === 'Paid' && comm.status !== 'Paid') {
          const outreacherRows = await db.select().from(users).where(eq(users.id, comm.outreacherId));
          const outreacherName = outreacherRows[0]?.fullName || `Outreacher #${comm.outreacherId}`;
          await db.insert(payments).values({
            dealId: comm.dealId,
            payerOrPayee: outreacherName,
            paymentDirection: 'outbound_commission',
            paymentType: 'Commission Payout',
            amount: comm.amount,
            currency: comm.currency,
            status: 'Completed',
            paidAt: today,
            reference: `COMM-PAY-${comm.id}-${Date.now().toString().slice(-4)}`,
            notes: `Commission payout for Deal #${comm.dealId}`,
            createdBy: actorName,
          });
        }
        break;
      }

      case 'UPSERT_PROJECT': {
        if (!canUserPerformAction(actorRole, 'update_project')) {
          return NextResponse.json({ error: 'Forbidden: Insufficient permissions to update projects.' }, { status: 403 });
        }
        const {
          id,
          leadId = null,
          dealId = null,
          clientName,
          projectName,
          description = '',
          requirements = '',
          status = 'Not Started',
          priority = 'Medium',
          assignedDeveloperId = null,
          collaboratorIds = '',
          startDate = '',
          dueDate = '',
          agreedPrice = 0,
          agreedDeveloperCost = 0,
          otherExpenses = 0,
          clientFeedback = '',
          revisionCount = 0,
          notes = '',
        } = payload;

        if (!projectName || !clientName) {
          return NextResponse.json({ error: 'Project Name and Client Name are required.' }, { status: 400 });
        }

        const today = new Date().toISOString().slice(0, 10);
        const completedAt = status === 'Completed' || status === 'Delivered' ? today : null;
        const deliveredAt = status === 'Delivered' ? today : null;

        if (id) {
          await db
            .update(projects)
            .set({
              leadId: leadId ? Number(leadId) : null,
              dealId: dealId ? Number(dealId) : null,
              clientName,
              projectName,
              description,
              requirements,
              status,
              priority,
              assignedDeveloperId: assignedDeveloperId ? Number(assignedDeveloperId) : null,
              collaboratorIds,
              startDate,
              dueDate,
              completedAt,
              deliveredAt,
              agreedPrice: Math.max(0, Number(agreedPrice) || 0),
              agreedDeveloperCost: Math.max(0, Number(agreedDeveloperCost) || 0),
              otherExpenses: Math.max(0, Number(otherExpenses) || 0),
              clientFeedback,
              revisionCount: Number(revisionCount) || 0,
              notes,
              updatedAt: new Date(),
            })
            .where(eq(projects.id, Number(id)));
        } else {
          await db.insert(projects).values({
            leadId: leadId ? Number(leadId) : null,
            dealId: dealId ? Number(dealId) : null,
            clientName,
            projectName,
            description,
            requirements,
            status,
            priority,
            assignedDeveloperId: assignedDeveloperId ? Number(assignedDeveloperId) : null,
            collaboratorIds,
            startDate: startDate || today,
            dueDate,
            completedAt,
            deliveredAt,
            agreedPrice: Math.max(0, Number(agreedPrice) || 0),
            agreedDeveloperCost: Math.max(0, Number(agreedDeveloperCost) || 0),
            otherExpenses: Math.max(0, Number(otherExpenses) || 0),
            clientFeedback,
            revisionCount: Number(revisionCount) || 0,
            notes,
            createdBy: actorName,
          });
        }

        await db.insert(auditLogs).values({
          actorName,
          actorRole,
          action: id ? 'PROJECT_UPDATED' : 'PROJECT_CREATED',
          entityType: 'project',
          entityId: String(id || projectName),
          details: `${projectName} (${status}) for ${clientName}`,
        });
        break;
      }

      case 'UPSERT_PROJECT_TASK': {
        const {
          id,
          projectId,
          title,
          description = '',
          status = 'To Do',
          priority = 'Medium',
          assignedDeveloperId = null,
          dueDate = '',
        } = payload;

        if (!projectId || !title) {
          return NextResponse.json({ error: 'Project ID and Task Title are required.' }, { status: 400 });
        }

        const completedAt = status === 'Completed' ? new Date().toISOString().slice(0, 10) : null;

        if (id) {
          await db
            .update(projectTasks)
            .set({
              projectId: Number(projectId),
              title,
              description,
              status,
              priority,
              assignedDeveloperId: assignedDeveloperId ? Number(assignedDeveloperId) : null,
              dueDate,
              completedAt,
              updatedAt: new Date(),
            })
            .where(eq(projectTasks.id, Number(id)));
        } else {
          await db.insert(projectTasks).values({
            projectId: Number(projectId),
            title,
            description,
            status,
            priority,
            assignedDeveloperId: assignedDeveloperId ? Number(assignedDeveloperId) : null,
            dueDate,
            completedAt,
          });
        }
        break;
      }

      case 'DELETE_PROJECT_TASK': {
        const { id } = payload;
        await db.delete(projectTasks).where(eq(projectTasks.id, Number(id)));
        break;
      }

      case 'ADD_PAYMENT': {
        if (!canUserPerformAction(actorRole, 'view_financials')) {
          return NextResponse.json({ error: 'Forbidden: Only administrators can record financial payments.' }, { status: 403 });
        }
        const {
          projectId = null,
          dealId = null,
          payerOrPayee,
          paymentDirection = 'inbound_client',
          paymentType = 'Advance',
          amount,
          currency = 'INR',
          status = 'Completed',
          paidAt = new Date().toISOString().slice(0, 10),
          reference,
          notes = '',
        } = payload;

        const numericAmount = Number(amount);
        if (!numericAmount || numericAmount <= 0) {
          return NextResponse.json(
            { error: 'Payment amount must be a positive number. Use paymentType="Refund" for refunds.' },
            { status: 400 }
          );
        }
        if (!payerOrPayee || !reference) {
          return NextResponse.json({ error: 'Payer/Payee and Payment Reference are required.' }, { status: 400 });
        }

        // Prevent duplicate payment records by reference
        const existingRef = await db.select().from(payments).where(eq(payments.reference, String(reference).trim()));
        if (existingRef.length > 0) {
          return NextResponse.json(
            { error: `Duplicate payment reference "${reference}" already exists.` },
            { status: 400 }
          );
        }

        await db.insert(payments).values({
          projectId: projectId ? Number(projectId) : null,
          dealId: dealId ? Number(dealId) : null,
          payerOrPayee: String(payerOrPayee).trim(),
          paymentDirection,
          paymentType,
          amount: Math.round(numericAmount),
          currency,
          status,
          paidAt,
          reference: String(reference).trim(),
          notes,
          createdBy: actorName,
        });

        await db.insert(auditLogs).values({
          actorName,
          actorRole,
          action: 'PAYMENT_RECORDED',
          entityType: 'payment',
          entityId: String(reference),
          details: `Recorded ₹${numericAmount.toLocaleString('en-IN')} (${paymentType}) — ${payerOrPayee}`,
        });
        break;
      }

      case 'UPSERT_CATEGORY': {
        if (!canUserPerformAction(actorRole, 'manage_settings')) {
          return NextResponse.json({ error: 'Forbidden: Administrator role required.' }, { status: 403 });
        }
        const { id, name, description = '', isActive = true } = payload;
        if (!name || !String(name).trim()) {
          return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
        }
        if (id) {
          await db
            .update(businessCategories)
            .set({ name: String(name).trim(), description, isActive: Boolean(isActive) })
            .where(eq(businessCategories.id, Number(id)));
        } else {
          await db
            .insert(businessCategories)
            .values({ name: String(name).trim(), description, isActive: Boolean(isActive) })
            .onConflictDoUpdate({
              target: businessCategories.name,
              set: { description, isActive: Boolean(isActive) },
            });
        }
        break;
      }

      case 'UPDATE_SETTINGS': {
        if (!canUserPerformAction(actorRole, 'manage_settings')) {
          return NextResponse.json({ error: 'Forbidden: Administrator role required.' }, { status: 403 });
        }
        const {
          id,
          agencyName,
          defaultCurrency,
          timezone,
          dateFormat,
          defaultCommissionType,
          defaultCommissionValue,
          leadStatuses,
          projectStatuses,
        } = payload;

        if (id) {
          await db
            .update(agencySettings)
            .set({
              agencyName,
              defaultCurrency,
              timezone,
              dateFormat,
              defaultCommissionType,
              defaultCommissionValue: Number(defaultCommissionValue) || 1000,
              leadStatuses: typeof leadStatuses === 'string' ? leadStatuses : JSON.stringify(leadStatuses),
              projectStatuses: typeof projectStatuses === 'string' ? projectStatuses : JSON.stringify(projectStatuses),
              updatedAt: new Date(),
            })
            .where(eq(agencySettings.id, Number(id)));
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const updatedState = await getAllCrmState();
    return NextResponse.json(updatedState);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to execute CRM operation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
