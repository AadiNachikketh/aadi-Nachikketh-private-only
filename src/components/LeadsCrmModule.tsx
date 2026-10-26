'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Upload,
  Download,
  Filter,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  MapPin,
  Edit3,
  Trash2,
  Archive,
  CheckSquare,
  MessageSquare,
  Calendar,
  X,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  LeadRecord,
  LeadActivityRecord,
  GeoLocation,
  BusinessCategory,
  UserProfile,
  ProjectRecord,
} from '../types/crm';
import {
  autoMapSpreadsheetColumns,
  detectLeadDuplicate,
} from '../lib/crm-logic';
import {
  parseUploadedSpreadsheet,
  exportRecordsToFile,
  ExportColumnDef,
} from '../utils/spreadsheet';
import GmailNotifyModal, {
  GmailDraftPayload,
  buildOutreacherLeadEmailDraft,
} from './GmailNotifyModal';

interface LeadsCrmModuleProps {
  leads: LeadRecord[];
  activities: LeadActivityRecord[];
  locations: GeoLocation[];
  categories: BusinessCategory[];
  outreachers: UserProfile[];
  developers: UserProfile[];
  projects: ProjectRecord[];
  leadStatuses: string[];
  actorRole: string;
  actorUserId?: number;
  initialLocationFilter?: { country?: string; state?: string; district?: string; city?: string; locality?: string } | null;
  openAddLeadTrigger?: { open: boolean; prefill?: Partial<LeadRecord> } | null;
  onClearExternalTriggers?: () => void;
  onMutate: (action: string, payload: Record<string, unknown>, successMsg?: string) => Promise<void>;
  onCreateProjectFromLead: (lead: LeadRecord) => void;
}

const WEBSITE_STATUS_OPTIONS = [
  'No Website',
  'Has Website',
  'Website Needs Improvement',
  'Website Status Unknown',
];

const ACTIVITY_TYPES = [
  'Phone Call',
  'Email',
  'WhatsApp Message',
  'Meeting',
  'Proposal',
  'Follow-up',
  'Note',
];

const SAMPLE_IMPORT_ROWS: Record<string, string>[] = [
  {
    'Business Name': 'Aarav Diamonds & Bridal Gold',
    'Contact Person': 'Deepak Aarav',
    Mobile: '+91 98459 33210',
    Email: 'deepak@aaravdiamonds.in',
    Website: '',
    'Google Maps Profile': 'https://maps.google.com/?cid=55101',
    Category: 'Jewellery Stores',
    City: 'Bengaluru',
    Area: 'Whitefield',
    Address: 'ITPL Main Road, Whitefield, Bengaluru',
    'Website Status': 'No Website',
    'Estimated Value': '55000',
    Notes: 'Large 2-floor bridal showroom with zero web presence.',
  },
  {
    'Business Name': 'Sri Krishna Diamonds & Gold',
    'Contact Person': 'Rajeshwar Chetty',
    Mobile: '+91 98450 21901',
    Email: 'contact@srikrishnadiamonds.in',
    Website: '',
    'Google Maps Profile': 'https://maps.google.com/?cid=10293847561',
    Category: 'Jewellery Stores',
    City: 'Bengaluru',
    Area: 'Whitefield',
    Address: '42, ITPL Main Road, Whitefield',
    'Website Status': 'No Website',
    'Estimated Value': '60000',
    Notes: 'Existing lead in Whitefield to test duplicate detection.',
  },
  {
    'Business Name': 'Veda Fine Silver & Temple Jewellery',
    'Contact Person': 'Lakshmi Narayanan',
    Mobile: '+91 98804 71239',
    Email: 'veda.silver@gmail.com',
    Website: '',
    'Google Maps Profile': 'https://maps.google.com/?cid=55103',
    Category: 'Jewellery Stores',
    City: 'Bengaluru',
    Area: 'Indiranagar',
    Address: '100 Feet Road, Indiranagar, Bengaluru',
    'Website Status': 'No Website',
    'Estimated Value': '42000',
    Notes: 'High Instagram engagement, needs catalogue website.',
  },
];

export default function LeadsCrmModule({
  leads,
  activities,
  locations,
  categories,
  outreachers,
  developers,
  projects,
  leadStatuses,
  actorRole,
  actorUserId,
  initialLocationFilter,
  openAddLeadTrigger,
  onClearExternalTriggers,
  onMutate,
  onCreateProjectFromLead,
}: LeadsCrmModuleProps) {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCountry, setFilterCountry] = useState('ALL');
  const [filterState, setFilterState] = useState('ALL');
  const [filterDistrict, setFilterDistrict] = useState('ALL');
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterLocality, setFilterLocality] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterWebsiteStatus, setFilterWebsiteStatus] = useState('ALL');
  const [filterOutreacher, setFilterOutreacher] = useState('ALL');
  const [minDealValue, setMinDealValue] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Table sorting & pagination
  const [sortField, setSortField] = useState<'updatedAt' | 'businessName' | 'estimatedDealValue'>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Single & Bulk Delete confirmation states
  const [leadToDelete, setLeadToDelete] = useState<LeadRecord | null>(null);
  const [confirmClearAllOpen, setConfirmClearAllOpen] = useState(false);

  // Bulk Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());
  const [bulkAssignUserId, setBulkAssignUserId] = useState('');
  const [bulkStatusValue, setBulkStatusValue] = useState('');
  const [confirmBulkAssignOpen, setConfirmBulkAssignOpen] = useState(false);

  // Add / Edit Lead Modal
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Partial<LeadRecord>>({
    businessName: '',
    contactName: '',
    phone: '',
    email: '',
    websiteUrl: '',
    googleMapsUrl: '',
    categoryName: categories[0]?.name || 'Jewellery Stores',
    country: 'India',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    city: 'Bengaluru',
    locality: 'Whitefield',
    address: '',
    websiteStatus: 'No Website',
    source: 'Manual Entry',
    status: 'New Lead',
    priority: 'High',
    assignedOutreacherId: outreachers[0]?.id || null,
    estimatedDealValue: 45000,
    agreedDealValue: 0,
    nextFollowUpAt: '',
    notes: '',
    tags: '',
  });
  const [formError, setFormError] = useState('');

  // Lead Detail Drawer
  const [detailLeadId, setDetailLeadId] = useState<number | null>(null);
  const [activityType, setActivityType] = useState('Phone Call');
  const [activityOutcome, setActivityOutcome] = useState('Connected - Interested');
  const [activityNotes, setActivityNotes] = useState('');
  const [activityNextFollowUp, setActivityNextFollowUp] = useState('');
  const [activityNewStatus, setActivityNewStatus] = useState('');

  // Spreadsheet Import Wizard
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3 | 4>(1);
  const [importFilename, setImportFilename] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [duplicateResolutions, setDuplicateResolutions] = useState<Record<number, 'skip' | 'create' | 'update'>>({});
  const [importSummary, setImportSummary] = useState<{
    rowsRead: number;
    imported: number;
    skipped: number;
    invalid: number;
    duplicates: number;
  } | null>(null);

  // Export Modal
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'filtered' | 'selected' | 'all'>('filtered');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [selectedExportCols, setSelectedExportCols] = useState<string[]>([
    'businessName',
    'contactName',
    'phone',
    'email',
    'websiteStatus',
    'websiteUrl',
    'googleMapsUrl',
    'categoryName',
    'city',
    'locality',
    'status',
    'estimatedDealValue',
  ]);

  // Apply external location filter or openAddLeadTrigger when passed from Locations Explorer or Dashboard
  useEffect(() => {
    if (initialLocationFilter) {
      setFilterCountry(initialLocationFilter.country || 'ALL');
      setFilterState(initialLocationFilter.state || 'ALL');
      setFilterDistrict(initialLocationFilter.district || 'ALL');
      setFilterCity(initialLocationFilter.city || 'ALL');
      setFilterLocality(initialLocationFilter.locality || 'ALL');
      onClearExternalTriggers?.();
    }
  }, [initialLocationFilter, onClearExternalTriggers]);

  useEffect(() => {
    if (openAddLeadTrigger?.open) {
      setEditingLead({
        businessName: '',
        contactName: '',
        phone: '',
        email: '',
        websiteUrl: '',
        googleMapsUrl: '',
        categoryName: openAddLeadTrigger.prefill?.categoryName || categories[0]?.name || 'Jewellery Stores',
        country: openAddLeadTrigger.prefill?.country || 'India',
        state: openAddLeadTrigger.prefill?.state || 'Karnataka',
        district:
          openAddLeadTrigger.prefill?.district ||
          (openAddLeadTrigger.prefill?.state ? '' : 'Bengaluru Urban'),
        city:
          openAddLeadTrigger.prefill?.city ||
          openAddLeadTrigger.prefill?.district ||
          (openAddLeadTrigger.prefill?.state ? '' : 'Bengaluru'),
        locality:
          openAddLeadTrigger.prefill?.locality ||
          openAddLeadTrigger.prefill?.city ||
          openAddLeadTrigger.prefill?.district ||
          (openAddLeadTrigger.prefill?.state ? '' : 'Whitefield'),
        locationId: openAddLeadTrigger.prefill?.locationId || null,
        address: '',
        websiteStatus: 'No Website',
        source: 'Manual Entry',
        status: 'New Lead',
        priority: 'High',
        assignedOutreacherId: outreachers[0]?.id || null,
        estimatedDealValue: 45000,
        agreedDealValue: 0,
        nextFollowUpAt: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
        notes: '',
        tags: '',
      });
      setFormError('');
      setLeadModalOpen(true);
      onClearExternalTriggers?.();
    }
  }, [openAddLeadTrigger, categories, outreachers, onClearExternalTriggers]);

  const outreacherMap = useMemo(
    () => new Map(outreachers.map((o) => [o.id, o.fullName])),
    [outreachers]
  );

  // Distinct location filter options from existing leads & locations
  const distinctCountries = useMemo(
    () => Array.from(new Set(leads.map((l) => l.country).filter(Boolean))),
    [leads]
  );
  const distinctStates = useMemo(
    () => Array.from(new Set(leads.map((l) => l.state).filter((x): x is string => Boolean(x)))),
    [leads]
  );
  const distinctCities = useMemo(
    () => Array.from(new Set(leads.map((l) => l.city).filter((x): x is string => Boolean(x)))),
    [leads]
  );
  const distinctLocalities = useMemo(
    () => Array.from(new Set(leads.map((l) => l.locality).filter((x): x is string => Boolean(x)))),
    [leads]
  );

  const activeFilters = useMemo(() => {
    const list: string[] = [];
    if (searchQuery.trim()) list.push(`Search: "${searchQuery}"`);
    if (filterCountry !== 'ALL') list.push(`Country: ${filterCountry}`);
    if (filterState !== 'ALL') list.push(`State: ${filterState}`);
    if (filterCity !== 'ALL') list.push(`City: ${filterCity}`);
    if (filterLocality !== 'ALL') list.push(`Locality: ${filterLocality}`);
    if (filterCategory !== 'ALL') list.push(`Category: ${filterCategory}`);
    if (filterStatus !== 'ALL') list.push(`Status: ${filterStatus}`);
    if (filterWebsiteStatus !== 'ALL') list.push(`Website: ${filterWebsiteStatus}`);
    if (filterOutreacher !== 'ALL') {
      const oName =
        filterOutreacher === 'UNASSIGNED'
          ? 'Unassigned Only'
          : outreacherMap.get(Number(filterOutreacher)) || filterOutreacher;
      list.push(`Outreacher: ${oName}`);
    }
    if (minDealValue) list.push(`Min Value: ₹${Number(minDealValue).toLocaleString('en-IN')}`);
    if (showArchived) list.push('Viewing Archived');
    return list;
  }, [
    searchQuery,
    filterCountry,
    filterState,
    filterCity,
    filterLocality,
    filterCategory,
    filterStatus,
    filterWebsiteStatus,
    filterOutreacher,
    minDealValue,
    showArchived,
    outreacherMap,
  ]);

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leads
      .filter((lead) => {
        if (!showArchived && lead.isArchived) return false;
        if (showArchived && !lead.isArchived) return false;

        // Role-based visibility: if role is outreacher, only show leads assigned to that outreacher (if actorUserId is set)
        if (actorRole === 'outreacher' && actorUserId && lead.assignedOutreacherId !== actorUserId) {
          return false;
        }

        if (filterCountry !== 'ALL' && lead.country.toLowerCase() !== filterCountry.toLowerCase()) return false;
        if (filterState !== 'ALL' && (lead.state || '').toLowerCase() !== filterState.toLowerCase()) return false;
        if (filterDistrict !== 'ALL' && (lead.district || '').toLowerCase() !== filterDistrict.toLowerCase()) return false;
        if (filterCity !== 'ALL' && (lead.city || '').toLowerCase() !== filterCity.toLowerCase()) return false;
        if (filterLocality !== 'ALL' && (lead.locality || '').toLowerCase() !== filterLocality.toLowerCase()) return false;
        if (filterCategory !== 'ALL' && lead.categoryName !== filterCategory) return false;
        if (filterStatus !== 'ALL' && lead.status !== filterStatus) return false;
        if (filterWebsiteStatus !== 'ALL' && lead.websiteStatus !== filterWebsiteStatus) return false;
        if (filterOutreacher === 'UNASSIGNED' && lead.assignedOutreacherId !== null) return false;
        if (
          filterOutreacher !== 'ALL' &&
          filterOutreacher !== 'UNASSIGNED' &&
          String(lead.assignedOutreacherId) !== filterOutreacher
        ) {
          return false;
        }
        if (minDealValue && lead.estimatedDealValue < Number(minDealValue)) return false;

        if (q) {
          const hay = [
            lead.businessName,
            lead.contactName,
            lead.phone,
            lead.email,
            lead.locality,
            lead.city,
            lead.categoryName,
            lead.notes,
            lead.tags,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === 'businessName') {
          return sortDir === 'asc'
            ? a.businessName.localeCompare(b.businessName)
            : b.businessName.localeCompare(a.businessName);
        }
        if (sortField === 'estimatedDealValue') {
          return sortDir === 'asc'
            ? a.estimatedDealValue - b.estimatedDealValue
            : b.estimatedDealValue - a.estimatedDealValue;
        }
        return sortDir === 'asc' ? a.id - b.id : b.id - a.id;
      });
  }, [
    leads,
    showArchived,
    actorRole,
    actorUserId,
    filterCountry,
    filterState,
    filterDistrict,
    filterCity,
    filterLocality,
    filterCategory,
    filterStatus,
    filterWebsiteStatus,
    filterOutreacher,
    minDealValue,
    searchQuery,
    sortField,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterCountry('ALL');
    setFilterState('ALL');
    setFilterDistrict('ALL');
    setFilterCity('ALL');
    setFilterLocality('ALL');
    setFilterCategory('ALL');
    setFilterStatus('ALL');
    setFilterWebsiteStatus('ALL');
    setFilterOutreacher('ALL');
    setMinDealValue('');
    setCurrentPage(1);
  };

  const toggleSelectLead = (id: number) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    const allIds = paginatedLeads.map((l) => l.id);
    const allSelected = allIds.every((id) => selectedLeadIds.has(id));
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allIds.forEach((id) => next.delete(id));
      } else {
        allIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleOpenCreateModal = () => {
    setEditingLead({
      businessName: '',
      contactName: '',
      phone: '',
      email: '',
      websiteUrl: '',
      googleMapsUrl: '',
      categoryName: categories[0]?.name || 'Jewellery Stores',
      country: filterCountry !== 'ALL' ? filterCountry : 'India',
      state: filterState !== 'ALL' ? filterState : 'Karnataka',
      district: filterDistrict !== 'ALL' ? filterDistrict : 'Bengaluru Urban',
      city: filterCity !== 'ALL' ? filterCity : 'Bengaluru',
      locality: filterLocality !== 'ALL' ? filterLocality : 'Whitefield',
      address: '',
      websiteStatus: 'No Website',
      source: 'Manual Entry',
      status: 'New Lead',
      priority: 'High',
      assignedOutreacherId: outreachers[0]?.id || null,
      estimatedDealValue: 45000,
      agreedDealValue: 0,
      nextFollowUpAt: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
      notes: '',
      tags: '',
    });
    setFormError('');
    setLeadModalOpen(true);
  };

  const handleOpenEditModal = (lead: LeadRecord) => {
    setEditingLead({ ...lead });
    setFormError('');
    setLeadModalOpen(true);
  };

  const handleSaveLeadForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead.businessName || !editingLead.businessName.trim()) {
      setFormError('Business Name is required.');
      return;
    }
    if (editingLead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingLead.email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    await onMutate(
      'UPSERT_LEAD',
      editingLead as Record<string, unknown>,
      editingLead.id
        ? `Updated lead ${editingLead.businessName}`
        : `Added new lead ${editingLead.businessName} to CRM`
    );
    if (!editingLead.id) {
      clearAllFilters();
    }
    setLeadModalOpen(false);
    if (editingLead.assignedOutreacherId) {
      const assignedOutreacher = outreachers.find(
        (o) => Number(o.id) === Number(editingLead.assignedOutreacherId)
      );
      if (assignedOutreacher) {
        setGmailDraft(
          buildOutreacherLeadEmailDraft(assignedOutreacher, [
            {
              businessName: editingLead.businessName || '',
              contactName: editingLead.contactName,
              phone: editingLead.phone,
              email: editingLead.email,
              categoryName: editingLead.categoryName,
              locality: editingLead.locality,
              city: editingLead.city,
              websiteStatus: editingLead.websiteStatus,
              googleMapsUrl: editingLead.googleMapsUrl,
              estimatedDealValue: editingLead.estimatedDealValue,
              nextFollowUpAt: editingLead.nextFollowUpAt,
              notes: editingLead.notes,
            },
          ])
        );
      }
    }
  };

  const [gmailDraft, setGmailDraft] = useState<GmailDraftPayload | null>(null);

  const detailLead = useMemo(
    () => (detailLeadId ? leads.find((l) => l.id === detailLeadId) || null : null),
    [detailLeadId, leads]
  );

  const detailActivities = useMemo(
    () => (detailLeadId ? activities.filter((a) => a.leadId === detailLeadId) : []),
    [detailLeadId, activities]
  );

  const detailProjects = useMemo(
    () => (detailLeadId ? projects.filter((p) => p.leadId === detailLeadId) : []),
    [detailLeadId, projects]
  );

  const handleRecordActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailLead) return;
    await onMutate(
      'ADD_LEAD_ACTIVITY',
      {
        leadId: detailLead.id,
        activityType,
        outcome: activityOutcome,
        notes: activityNotes,
        nextFollowUpAt: activityNextFollowUp,
        newLeadStatus: activityNewStatus,
      },
      `Recorded ${activityType} for ${detailLead.businessName}`
    );
    setActivityNotes('');
    setActivityNewStatus('');
  };

  // Spreadsheet Import Wizard logic
  const startImportWithParsedData = (filename: string, headers: string[], rows: Record<string, string>[]) => {
    setImportFilename(filename);
    setRawHeaders(headers);
    setRawRows(rows);
    const autoMapped = autoMapSpreadsheetColumns(headers);
    setColumnMapping(autoMapped);
    setDuplicateResolutions({});
    setImportSummary(null);
    setImportStep(2);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseUploadedSpreadsheet(file);
      startImportWithParsedData(file.name, parsed.headers, parsed.rows);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to parse spreadsheet');
    }
  };

  const handleLoadSampleImport = () => {
    const headers = Object.keys(SAMPLE_IMPORT_ROWS[0]);
    startImportWithParsedData('whitefield_jewellery_prospects.csv', headers, SAMPLE_IMPORT_ROWS);
  };

  const mappedImportPreview = useMemo(() => {
    return rawRows.map((row, idx) => {
      const mapped: Record<string, string> = {};
      const unmappedParts: string[] = [];

      for (const [header, val] of Object.entries(row)) {
        const targetField = columnMapping[header];
        if (targetField && targetField !== 'unmapped') {
          mapped[targetField] = val;
        } else if (val) {
          unmappedParts.push(`${header}: ${val}`);
        }
      }

      const combinedNotes = [mapped.notes, ...unmappedParts].filter(Boolean).join(' | ');
      const dupCheck = detectLeadDuplicate(
        {
          businessName: mapped.businessName,
          phone: mapped.phone,
          websiteUrl: mapped.websiteUrl,
          googleMapsUrl: mapped.googleMapsUrl,
          locality: mapped.locality,
          city: mapped.city,
        },
        leads
      );

      const isValid = Boolean(mapped.businessName && mapped.businessName.trim());
      const resolution =
        duplicateResolutions[idx] || (dupCheck.isDuplicate ? 'skip' : 'create');

      return {
        rowIndex: idx,
        businessName: mapped.businessName || '',
        contactName: mapped.contactName || '',
        phone: mapped.phone || '',
        email: mapped.email || '',
        websiteUrl: mapped.websiteUrl || '',
        googleMapsUrl: mapped.googleMapsUrl || '',
        categoryName: mapped.categoryName || 'Jewellery Stores',
        country: mapped.country || 'India',
        state: mapped.state || 'Karnataka',
        district: mapped.district || '',
        city: mapped.city || 'Bengaluru',
        locality: mapped.locality || 'Whitefield',
        address: mapped.address || '',
        websiteStatus: mapped.websiteStatus || 'Website Status Unknown',
        estimatedDealValue: Number(mapped.estimatedDealValue) || 45000,
        notes: combinedNotes,
        isValid,
        isDuplicate: dupCheck.isDuplicate,
        matchedLeadId: dupCheck.matchedLead?.id,
        matchReason: dupCheck.matchReason,
        resolution,
      };
    });
  }, [rawRows, columnMapping, leads, duplicateResolutions]);

  const handleConfirmBatchImport = async () => {
    const validRows = mappedImportPreview.filter((r) => r.isValid);
    const invalidCount = mappedImportPreview.filter((r) => !r.isValid).length;
    const duplicateCount = mappedImportPreview.filter((r) => r.isDuplicate).length;
    const skippedCount = validRows.filter((r) => r.resolution === 'skip').length;
    const importedCount = validRows.filter((r) => r.resolution !== 'skip').length;

    await onMutate(
      'BATCH_IMPORT_LEADS',
      {
        filename: importFilename,
        rowsRead: rawRows.length,
        rows: validRows,
      },
      `Imported ${importedCount} leads from ${importFilename}`
    );

    setImportSummary({
      rowsRead: rawRows.length,
      imported: importedCount,
      skipped: skippedCount,
      invalid: invalidCount,
      duplicates: duplicateCount,
    });
    setImportStep(4);
  };

  // Export columns & handler
  const allExportColumns: ExportColumnDef<LeadRecord>[] = [
    { key: 'businessName', label: 'Business Name', getValue: (r) => r.businessName },
    { key: 'contactName', label: 'Contact Person', getValue: (r) => r.contactName || '' },
    { key: 'phone', label: 'Phone Number', getValue: (r) => r.phone || '' },
    { key: 'email', label: 'Email', getValue: (r) => r.email || '' },
    { key: 'websiteStatus', label: 'Website Status', getValue: (r) => r.websiteStatus },
    { key: 'websiteUrl', label: 'Website URL', getValue: (r) => r.websiteUrl || '' },
    { key: 'googleMapsUrl', label: 'Google Maps Profile', getValue: (r) => r.googleMapsUrl || '' },
    { key: 'categoryName', label: 'Category', getValue: (r) => r.categoryName },
    { key: 'country', label: 'Country', getValue: (r) => r.country },
    { key: 'state', label: 'State', getValue: (r) => r.state || '' },
    { key: 'city', label: 'City', getValue: (r) => r.city || '' },
    { key: 'locality', label: 'Locality', getValue: (r) => r.locality || '' },
    { key: 'status', label: 'Lead Status', getValue: (r) => r.status },
    {
      key: 'outreacher',
      label: 'Assigned Outreacher',
      getValue: (r) => (r.assignedOutreacherId ? outreacherMap.get(r.assignedOutreacherId) || '' : 'Unassigned'),
    },
    { key: 'estimatedDealValue', label: 'Estimated Deal Value (INR)', getValue: (r) => r.estimatedDealValue },
    { key: 'agreedDealValue', label: 'Agreed Deal Value (INR)', getValue: (r) => r.agreedDealValue },
    { key: 'nextFollowUpAt', label: 'Follow-up Date', getValue: (r) => r.nextFollowUpAt || '' },
    { key: 'notes', label: 'Notes', getValue: (r) => r.notes || '' },
  ];

  const handleRunExport = () => {
    const recordsToExport =
      exportScope === 'selected'
        ? leads.filter((l) => selectedLeadIds.has(l.id))
        : exportScope === 'all'
        ? leads.filter((l) => !l.isArchived)
        : filteredLeads;

    const chosenCols = allExportColumns.filter((c) => selectedExportCols.includes(c.key));
    const catPart = filterCategory !== 'ALL' ? filterCategory : 'all_leads';
    const locPart = filterLocality !== 'ALL' ? filterLocality : filterCity !== 'ALL' ? filterCity : 'crm';
    exportRecordsToFile(recordsToExport, chosenCols, `${catPart}_${locPart}`, exportFormat);
    setExportModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Toolbar: Search + Primary CRM Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search leads by business name, contact person, phone, email, locality, or tags..."
              aria-label="Search CRM leads"
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Lead
            </button>

            <button
              type="button"
              onClick={() => {
                setImportStep(1);
                setImportWizardOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV / XLSX
            </button>

            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export Spreadsheet
            </button>

            {selectedLeadIds.size > 0 ? (
              <button
                type="button"
                onClick={async () => {
                  const count = selectedLeadIds.size;
                  await onMutate(
                    'DELETE_LEADS',
                    { leadIds: Array.from(selectedLeadIds) },
                    `Deleted ${count} selected lead${count === 1 ? '' : 's'}`
                  );
                  setSelectedLeadIds(new Set());
                }}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-md animate-pulse"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected Leads ({selectedLeadIds.size})
              </button>
            ) : leads.length > 0 ? (
              <button
                type="button"
                onClick={() => setConfirmClearAllOpen(true)}
                className="px-3 py-2 bg-slate-800/80 hover:bg-red-950/60 text-slate-400 hover:text-red-300 border border-slate-700/60 hover:border-red-500/40 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                title="Delete all leads in database"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                Delete All Leads
              </button>
            ) : null}
          </div>
        </div>

        {/* Composable Multi-Criteria Filter Strip (Section 6.5) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2 border-t border-slate-800/80">
          <select
            aria-label="Filter by Country"
            value={filterCountry}
            onChange={(e) => {
              setFilterCountry(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="ALL">Country: All</option>
            {distinctCountries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by State"
            value={filterState}
            onChange={(e) => {
              setFilterState(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="ALL">State: All</option>
            {distinctStates.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by City"
            value={filterCity}
            onChange={(e) => {
              setFilterCity(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="ALL">City: All</option>
            {distinctCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Locality"
            value={filterLocality}
            onChange={(e) => {
              setFilterLocality(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="ALL">Locality: All</option>
            {distinctLocalities.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Category"
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="ALL">Category: All</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Website Status"
            value={filterWebsiteStatus}
            onChange={(e) => {
              setFilterWebsiteStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="ALL">Website: All</option>
            {WEBSITE_STATUS_OPTIONS.map((ws) => (
              <option key={ws} value={ws}>
                {ws}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Lead Status"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="ALL">Status: All</option>
            {leadStatuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Outreacher"
            value={filterOutreacher}
            onChange={(e) => {
              setFilterOutreacher(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="ALL">Outreacher: All</option>
            <option value="UNASSIGNED">Unassigned Only</option>
            {outreachers.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.fullName}
              </option>
            ))}
          </select>
        </div>

        {/* Active filter summary & Clear Filters button */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono tabular-nums font-medium text-slate-300">
              Showing {filteredLeads.length} of {leads.length} leads {showArchived ? '(Archived)' : ''}
            </span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-blue-500"
              />
              <span>View Archived Leads</span>
            </label>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-amber-400 font-medium">
                {activeFilters.length} filter{activeFilters.length === 1 ? '' : 's'} active
              </span>
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded text-xs font-semibold transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {/* Active Filters List Chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
            <span className="text-[11px] text-slate-500">Active Filters:</span>
            {activeFilters.map((filt, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 rounded text-[11px] font-mono"
              >
                {filt}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Prominent Lead Alert if leads exist but are hidden by filters */}
      {leads.length > 0 && filteredLeads.length === 0 && (
        <div className="bg-amber-950/60 border border-amber-500/50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-200 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
            <div>
              <div className="font-bold text-sm text-amber-300">
                You have {leads.length} lead{leads.length === 1 ? '' : 's'} saved in your CRM, but 0 match your current filters.
              </div>
              <div className="text-xs text-amber-200/80 mt-0.5">
                Your leads are securely saved and haven&apos;t disappeared. Reset your filters to view all leads immediately.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors whitespace-nowrap shadow shrink-0"
          >
            Reset Filters &amp; View All {leads.length} Leads
          </button>
        </div>
      )}

      {/* Bulk Action Bar when rows are checked */}
      {selectedLeadIds.size > 0 && (
        <div className="bg-blue-950/50 border border-blue-500/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-medium text-blue-200 font-mono tabular-nums">
            {selectedLeadIds.size} leads selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actorRole === 'admin' && (
              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Bulk assign outreacher"
                  value={bulkAssignUserId}
                  onChange={(e) => setBulkAssignUserId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                >
                  <option value="">Assign Outreacher...</option>
                  {outreachers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.fullName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!bulkAssignUserId}
                  onClick={() => setConfirmBulkAssignOpen(true)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium rounded"
                >
                  Apply Assignment
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <select
                aria-label="Bulk status update"
                value={bulkStatusValue}
                onChange={(e) => setBulkStatusValue(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
              >
                <option value="">Change Status...</option>
                {leadStatuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!bulkStatusValue}
                onClick={async () => {
                  await onMutate(
                    'BULK_UPDATE_LEADS',
                    {
                      leadIds: Array.from(selectedLeadIds),
                      status: bulkStatusValue,
                    },
                    `Updated status to ${bulkStatusValue} for ${selectedLeadIds.size} leads`
                  );
                  setSelectedLeadIds(new Set());
                  setBulkStatusValue('');
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-medium rounded"
              >
                Update Status
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setExportScope('selected');
                setExportModalOpen(true);
              }}
              className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs rounded"
            >
              Export Selected
            </button>

            <button
              type="button"
              onClick={async () => {
                await onMutate(
                  'BULK_UPDATE_LEADS',
                  {
                    leadIds: Array.from(selectedLeadIds),
                    isArchived: !showArchived,
                  },
                  `${showArchived ? 'Restored' : 'Archived'} ${selectedLeadIds.size} leads`
                );
                setSelectedLeadIds(new Set());
              }}
              className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs rounded"
            >
              {showArchived ? 'Restore Selected' : 'Archive Selected'}
            </button>

            <button
              type="button"
              onClick={async () => {
                const count = selectedLeadIds.size;
                await onMutate(
                  'DELETE_LEADS',
                  {
                    leadIds: Array.from(selectedLeadIds),
                  },
                  `Deleted ${count} lead${count === 1 ? '' : 's'}`
                );
                setSelectedLeadIds(new Set());
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* High-Density CRM Lead Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="py-14 text-center space-y-3 px-4">
            <div className="text-base font-semibold text-slate-200">No Matching Leads Found</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No business leads match your current filter combination. Add a new lead manually, import a CSV/XLSX spreadsheet, or clear your filters.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
              >
                + Add Lead
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportStep(1);
                  setImportWizardOpen(true);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg"
              >
                Import Spreadsheet
              </button>
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs text-slate-400">
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all leads on page"
                      checked={
                        paginatedLeads.length > 0 &&
                        paginatedLeads.every((l) => selectedLeadIds.has(l.id))
                      }
                      onChange={toggleSelectAllOnPage}
                      className="rounded border-slate-700 bg-slate-900 text-blue-500"
                    />
                  </th>
                  <th className="py-3 px-3 font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        setSortField('businessName');
                        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                      }}
                      className="hover:text-white"
                    >
                      Business & Contact
                    </button>
                  </th>
                  <th className="py-3 px-3 font-medium">Category & Website</th>
                  <th className="py-3 px-3 font-medium">Location</th>
                  <th className="py-3 px-3 font-medium">Outreacher</th>
                  <th className="py-3 px-3 font-medium">Lead Status</th>
                  <th className="py-3 px-3 font-medium text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSortField('estimatedDealValue');
                        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                      }}
                      className="hover:text-white"
                    >
                      Deal Value
                    </button>
                  </th>
                  <th className="py-3 px-3 font-medium">Follow-up</th>
                  <th className="py-3 px-4 font-semibold text-right sticky right-0 bg-slate-950 text-white border-l border-slate-800 shadow-xl min-w-[200px] z-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {paginatedLeads.map((lead) => {
                  const isChecked = selectedLeadIds.has(lead.id);
                  const outreacherName = lead.assignedOutreacherId
                    ? outreacherMap.get(lead.assignedOutreacherId) || 'Assigned'
                    : 'Unassigned';

                  return (
                    <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${lead.businessName}`}
                          checked={isChecked}
                          onChange={() => toggleSelectLead(lead.id)}
                          className="rounded border-slate-700 bg-slate-900 text-blue-500"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailLeadId(lead.id)}
                            className="font-semibold text-white hover:text-blue-400 text-left block"
                          >
                            {lead.businessName}
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${lead.businessName}`}
                            title="Delete this lead"
                            onClick={() => setLeadToDelete(lead)}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold flex items-center gap-1 shrink-0 transition-colors shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                          {lead.contactName && <span>{lead.contactName}</span>}
                          {lead.phone && (
                            <>
                              <span>·</span>
                              <span className="font-mono tabular-nums">{lead.phone}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-xs text-slate-200">{lead.categoryName}</div>
                        <div
                          className={`text-xs mt-0.5 ${
                            lead.websiteStatus === 'No Website'
                              ? 'text-amber-400'
                              : lead.websiteStatus === 'Website Needs Improvement'
                              ? 'text-blue-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {lead.websiteStatus}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-300">
                        <div className="font-medium text-slate-200">{lead.locality || lead.city || lead.country}</div>
                        <div className="text-slate-500">
                          {[lead.city, lead.state, lead.country].filter(Boolean).join(', ')}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <select
                            aria-label={`Assign Outreacher for ${lead.businessName}`}
                            value={lead.assignedOutreacherId ? String(lead.assignedOutreacherId) : ''}
                            onChange={async (e) => {
                              const nextOutreacherId = e.target.value ? Number(e.target.value) : null;
                              const targetOutreacher = outreachers.find(
                                (o) => Number(o.id) === Number(nextOutreacherId)
                              );
                              await onMutate(
                                'UPSERT_LEAD',
                                {
                                  ...lead,
                                  assignedOutreacherId: nextOutreacherId,
                                },
                                targetOutreacher
                                  ? `Assigned ${lead.businessName} to ${targetOutreacher.fullName}`
                                  : `Unassigned ${lead.businessName}`
                              );
                              if (targetOutreacher) {
                                setGmailDraft(
                                  buildOutreacherLeadEmailDraft(targetOutreacher, [lead])
                                );
                              }
                            }}
                            className={`bg-slate-950 border rounded px-2 py-1 text-xs font-medium ${
                              lead.assignedOutreacherId
                                ? 'border-blue-500/40 text-blue-300'
                                : 'border-slate-800 text-slate-400'
                            }`}
                          >
                            <option value="">Unassigned</option>
                            {outreachers.map((o) => (
                              <option key={o.id} value={String(o.id)}>
                                {o.fullName}
                              </option>
                            ))}
                          </select>

                          {lead.assignedOutreacherId && (
                            <button
                              type="button"
                              onClick={() => {
                                const targetOutreacher = outreachers.find(
                                  (o) => Number(o.id) === Number(lead.assignedOutreacherId)
                                );
                                if (targetOutreacher) {
                                  setGmailDraft(
                                    buildOutreacherLeadEmailDraft(targetOutreacher, [lead])
                                  );
                                }
                              }}
                              className="px-2 py-0.5 bg-red-950/50 hover:bg-red-900/70 text-red-300 border border-red-500/30 rounded text-[10px] font-medium flex items-center justify-center gap-1"
                            >
                              <Mail className="w-2.5 h-2.5" />
                              Send to Gmail
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          aria-label={`Status for ${lead.businessName}`}
                          value={lead.status}
                          onChange={(e) =>
                            onMutate(
                              'UPSERT_LEAD',
                              {
                                ...lead,
                                status: e.target.value,
                                agreedDealValue:
                                  e.target.value === 'Deal Won' && !lead.agreedDealValue
                                    ? lead.estimatedDealValue
                                    : lead.agreedDealValue,
                              },
                              `Updated ${lead.businessName} status to ${e.target.value}`
                            )
                          }
                          className={`bg-slate-950 border rounded px-2 py-1 text-xs font-medium ${
                            lead.status === 'Deal Won'
                              ? 'border-emerald-500/40 text-emerald-400'
                              : lead.status === 'Deal Lost'
                              ? 'border-red-500/40 text-red-400'
                              : 'border-slate-800 text-slate-200'
                          }`}
                        >
                          {leadStatuses.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-xs">
                        <div className="text-white font-semibold">
                          ₹{(lead.agreedDealValue || lead.estimatedDealValue || 0).toLocaleString('en-IN')}
                        </div>
                        {lead.agreedDealValue > 0 && (
                          <div className="text-[11px] text-emerald-400">Agreed Deal</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs font-mono tabular-nums text-slate-300">
                        {lead.nextFollowUpAt || '—'}
                      </td>
                      <td className="py-3 px-4 text-right sticky right-0 bg-slate-900 border-l border-slate-800 shadow-xl min-w-[200px] z-10">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailLeadId(lead.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition-colors"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            aria-label={`Edit ${lead.businessName}`}
                            title="Edit Lead"
                            onClick={() => handleOpenEditModal(lead)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded flex items-center gap-1 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${lead.businessName}`}
                            title="Delete Lead"
                            onClick={() => setLeadToDelete(lead)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded flex items-center gap-1 shadow-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredLeads.length > pageSize && (
          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-slate-800 disabled:opacity-40 rounded text-slate-200"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-slate-800 disabled:opacity-40 rounded text-slate-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Bulk Reassignment */}
      {confirmBulkAssignOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Confirm Bulk Lead Assignment"
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-semibold text-white">Confirm Bulk Lead Assignment</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to assign {selectedLeadIds.size} selected leads to{' '}
              <span className="text-white font-semibold">
                {outreacherMap.get(Number(bulkAssignUserId)) || 'Selected Outreacher'}
              </span>
              ? This will be recorded in the assignment audit history.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmBulkAssignOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetOutreacher = outreachers.find(
                    (o) => Number(o.id) === Number(bulkAssignUserId)
                  );
                  const assignedLeadsList = leads.filter((l) => selectedLeadIds.has(l.id));
                  await onMutate(
                    'BULK_UPDATE_LEADS',
                    {
                      leadIds: Array.from(selectedLeadIds),
                      assignedOutreacherId: Number(bulkAssignUserId),
                    },
                    `Assigned ${selectedLeadIds.size} leads to ${outreacherMap.get(Number(bulkAssignUserId))}`
                  );
                  setConfirmBulkAssignOpen(false);
                  setSelectedLeadIds(new Set());
                  setBulkAssignUserId('');
                  if (targetOutreacher && assignedLeadsList.length > 0) {
                    setGmailDraft(
                      buildOutreacherLeadEmailDraft(targetOutreacher, assignedLeadsList)
                    );
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
              >
                Confirm &amp; Notify via Gmail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Lead Modal (Section 6.2) */}
      {leadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-label={editingLead.id ? 'Edit Business Lead' : 'Add Business Lead'}
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-semibold text-white">
                {editingLead.id ? `Edit Lead: ${editingLead.businessName}` : 'Add Business Lead'}
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setLeadModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg text-xs text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveLeadForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Business Name *</label>
                  <input
                    type="text"
                    required
                    aria-label="Business Name"
                    value={editingLead.businessName || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, businessName: e.target.value })}
                    placeholder="e.g. Aarav Diamonds & Gold"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    aria-label="Contact Person Name"
                    value={editingLead.contactName || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, contactName: e.target.value })}
                    placeholder="e.g. Deepak Aarav"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    aria-label="Phone Number"
                    value={editingLead.phone || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                    placeholder="+91 98450 00000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    aria-label="Email Address"
                    value={editingLead.email || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                    placeholder="owner@business.in"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Business Category</label>
                  <select
                    aria-label="Business Category"
                    value={editingLead.categoryName || 'Jewellery Stores'}
                    onChange={(e) => setEditingLead({ ...editingLead, categoryName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Searchable Location Selector backed by Database */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">
                    Geographical Location Selector (Backed by Location Database)
                  </label>
                  <select
                    aria-label="Quick Fill from Indexed Locality"
                    onChange={(e) => {
                      const loc = locations.find((l) => l.id === Number(e.target.value));
                      if (loc) {
                        const parentCity = locations.find((p) => p.id === loc.parentLocationId);
                        const parentDist = parentCity
                          ? locations.find((p) => p.id === parentCity.parentLocationId)
                          : undefined;
                        const parentState = parentDist
                          ? locations.find((p) => p.id === parentDist.parentLocationId)
                          : undefined;
                        setEditingLead({
                          ...editingLead,
                          locationId: loc.id,
                          locality: loc.administrativeLevel === 4 ? loc.name : editingLead.locality,
                          city:
                            loc.administrativeLevel === 3
                              ? loc.name
                              : parentCity?.name || editingLead.city,
                          district: parentDist?.name || editingLead.district,
                          state: parentState?.name || editingLead.state,
                          country: loc.countryCode === 'IN' ? 'India' : loc.countryCode,
                        });
                      }
                    }}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-blue-300"
                  >
                    <option value="">Select Indexed Locality / City...</option>
                    {locations
                      .filter((l) => l.administrativeLevel >= 3)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.locationType} · {l.countryCode})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    aria-label="Country"
                    value={editingLead.country || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, country: e.target.value })}
                    placeholder="Country"
                    className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    aria-label="State"
                    value={editingLead.state || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, state: e.target.value })}
                    placeholder="State / Province"
                    className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    aria-label="City"
                    value={editingLead.city || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })}
                    placeholder="City / Town"
                    className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    aria-label="Locality"
                    value={editingLead.locality || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, locality: e.target.value })}
                    placeholder="Locality (e.g. Whitefield)"
                    className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Website Status</label>
                  <select
                    aria-label="Website Status"
                    value={editingLead.websiteStatus || 'Website Status Unknown'}
                    onChange={(e) => setEditingLead({ ...editingLead, websiteStatus: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {WEBSITE_STATUS_OPTIONS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Website URL (if any)</label>
                  <input
                    type="text"
                    aria-label="Website URL"
                    value={editingLead.websiteUrl || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, websiteUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Google Maps Profile URL</label>
                  <input
                    type="text"
                    aria-label="Google Maps URL"
                    value={editingLead.googleMapsUrl || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, googleMapsUrl: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Lead Status</label>
                  <select
                    aria-label="Lead Status"
                    value={editingLead.status || 'New Lead'}
                    onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {leadStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Assigned Outreacher</label>
                  <select
                    aria-label="Assigned Outreacher"
                    value={editingLead.assignedOutreacherId ? String(editingLead.assignedOutreacherId) : ''}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        assignedOutreacherId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">Unassigned</option>
                    {outreachers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Estimated Deal (₹)</label>
                  <input
                    type="number"
                    min={0}
                    aria-label="Estimated Deal Value"
                    value={editingLead.estimatedDealValue ?? 45000}
                    onChange={(e) =>
                      setEditingLead({ ...editingLead, estimatedDealValue: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    aria-label="Follow-up Date"
                    value={editingLead.nextFollowUpAt || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, nextFollowUpAt: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes & Discovery Context</label>
                <textarea
                  rows={2}
                  aria-label="Notes"
                  value={editingLead.notes || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  placeholder="Record showroom size, decision-maker notes, or website requirements..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <div>
                  {editingLead.id && (
                    <button
                      type="button"
                      onClick={async () => {
                        const leadId = editingLead.id;
                        const leadName = editingLead.businessName || 'Lead';
                        setLeadModalOpen(false);
                        await onMutate(
                          'DELETE_LEADS',
                          { leadIds: [leadId] },
                          `Deleted lead: ${leadName}`
                        );
                        if (detailLeadId === leadId) {
                          setDetailLeadId(null);
                        }
                      }}
                      className="px-3.5 py-2 bg-red-950/60 hover:bg-red-900/70 text-red-300 border border-red-500/40 text-xs font-medium rounded-lg flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Lead
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLeadModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
                  >
                    {editingLead.id ? 'Save Changes' : 'Create Lead Record'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail Drawer / Modal with Activity Tracking (Sections 6.7 & 6.8) */}
      {detailLead && (
        <div className="fixed inset-0 z-50 bg-black/75 flex justify-end">
          <div
            role="dialog"
            aria-label={`Lead Details for ${detailLead.businessName}`}
            className="bg-slate-900 border-l border-slate-800 w-full max-w-2xl h-full overflow-y-auto p-6 space-y-6"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs text-slate-400">
                  {detailLead.categoryName} · {[detailLead.locality, detailLead.city, detailLead.state].filter(Boolean).join(', ')}
                </div>
                <h3 className="text-xl font-bold text-white mt-0.5">{detailLead.businessName}</h3>
                <div className="text-xs text-slate-400 mt-1">
                  Contact: <span className="text-slate-200">{detailLead.contactName || 'Not Recorded'}</span> ·
                  Phone: <span className="text-slate-200 font-mono">{detailLead.phone || 'N/A'}</span> ·
                  Website Status: <span className="text-amber-400">{detailLead.websiteStatus}</span>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close lead details"
                onClick={() => setDetailLeadId(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* External Safe Links & Deal Conversion Action */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {detailLead.googleMapsUrl && (
                  <a
                    href={detailLead.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Open Google Maps Profile
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {detailLead.websiteUrl && (
                  <a
                    href={detailLead.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Open Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                {detailLead.status !== 'Deal Won' && (
                  <button
                    type="button"
                    onClick={() =>
                      onMutate(
                        'UPSERT_LEAD',
                        {
                          ...detailLead,
                          status: 'Deal Won',
                          agreedDealValue: detailLead.agreedDealValue || detailLead.estimatedDealValue || 45000,
                        },
                        `Marked ${detailLead.businessName} as Deal Won and generated commission!`
                      )
                    }
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg"
                  >
                    Mark as Deal Won (₹{(detailLead.estimatedDealValue || 45000).toLocaleString('en-IN')})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDetailLeadId(null);
                    onCreateProjectFromLead(detailLead);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
                >
                  + Create Website Project
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const idToDelete = detailLead.id;
                    const nameToDelete = detailLead.businessName;
                    setDetailLeadId(null);
                    await onMutate(
                      'DELETE_LEADS',
                      { leadIds: [idToDelete] },
                      `Deleted lead: ${nameToDelete}`
                    );
                  }}
                  className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/70 text-red-300 border border-red-500/40 text-xs font-medium rounded-lg flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>

            {/* Record Outreach Activity Form (Section 6.8) */}
            <form
              onSubmit={handleRecordActivity}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white">Record Outreach Activity</h4>
                <span className="text-[11px] text-slate-500">
                  Logged as manual outreach record (no automated dialer spoofing)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Activity Type</label>
                  <select
                    aria-label="Activity Type"
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Outcome</label>
                  <input
                    type="text"
                    aria-label="Activity Outcome"
                    value={activityOutcome}
                    onChange={(e) => setActivityOutcome(e.target.value)}
                    placeholder="e.g. Connected - Demo Booked"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Update Lead Status (Optional)</label>
                  <select
                    aria-label="Optional New Lead Status"
                    value={activityNewStatus}
                    onChange={(e) => setActivityNewStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="">Keep ({detailLead.status})</option>
                    {leadStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    aria-label="Activity Notes"
                    value={activityNotes}
                    onChange={(e) => setActivityNotes(e.target.value)}
                    placeholder="Enter call summary, client objections, or WhatsApp pitch details..."
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    aria-label="Next Follow-up Date"
                    value={activityNextFollowUp}
                    onChange={(e) => setActivityNextFollowUp(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded whitespace-nowrap"
                  >
                    Log Activity
                  </button>
                </div>
              </div>
            </form>

            {/* Related Website Projects */}
            {detailProjects.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">Linked Website Projects</h4>
                {detailProjects.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{p.projectName}</div>
                      <div className="text-slate-400">
                        Status: {p.status} · Due: {p.dueDate || 'TBD'}
                      </div>
                    </div>
                    <div className="font-mono tabular-nums text-emerald-400 font-semibold">
                      ₹{p.agreedPrice.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Activity & Status History Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-300">
                Chronological Activity & Status History ({detailActivities.length})
              </h4>
              {detailActivities.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-950 border border-slate-800 rounded-lg">
                  No outreach activities recorded for this lead yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {detailActivities.map((act) => (
                    <div key={act.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">
                          {act.activityType} · <span className="text-blue-400">{act.outcome}</span>
                        </span>
                        <span className="text-slate-500 font-mono tabular-nums">
                          {act.occurredAt} · by {act.userName}
                        </span>
                      </div>
                      {act.notes && <p className="text-xs text-slate-300">{act.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet Import Wizard Modal (Section 7.2) */}
      {importWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-label="Spreadsheet Import Wizard"
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full p-6 space-y-5 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  CSV & XLSX Lead Import Wizard (Step {importStep} of 4)
                </h3>
                <p className="text-xs text-slate-400">
                  Supports column mapping, unmapped column preservation, and multi-signal duplicate detection.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportWizardOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importStep === 1 && (
              <div className="space-y-4 py-4">
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center space-y-3">
                  <FileSpreadsheet className="w-10 h-10 text-blue-400 mx-auto" />
                  <div className="text-sm font-medium text-white">
                    Select a .CSV or .XLSX spreadsheet file to import
                  </div>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    aria-label="Upload CSV or XLSX file"
                    onChange={handleFileUpload}
                    className="block mx-auto text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Test with Sample Whitefield & Indiranagar Jewellery Leads Batch
                    </div>
                    <div className="text-xs text-slate-400">
                      Loads 3 realistic rows (including 1 intentional duplicate of Sri Krishna Diamonds) to inspect column mapping & duplicate review.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadSampleImport}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 text-xs font-medium rounded-lg whitespace-nowrap"
                  >
                    Load Sample CSV Batch
                  </button>
                </div>
              </div>
            )}

            {importStep === 2 && (
              <div className="space-y-4">
                <div className="text-xs text-slate-300">
                  File: <span className="text-white font-semibold">{importFilename}</span> ({rawRows.length} rows read). Map spreadsheet headers to CRM fields below. Unmapped columns are automatically preserved in lead notes.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-1">
                  {rawHeaders.map((hdr) => (
                    <div key={hdr} className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                      <div className="text-xs font-medium text-white truncate mb-1">{hdr}</div>
                      <select
                        aria-label={`Map column ${hdr}`}
                        value={columnMapping[hdr] || 'unmapped'}
                        onChange={(e) =>
                          setColumnMapping({ ...columnMapping, [hdr]: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-blue-300"
                      >
                        <option value="unmapped">Preserve in Notes (Unmapped)</option>
                        <option value="businessName">Business Name</option>
                        <option value="contactName">Contact Person</option>
                        <option value="phone">Phone Number</option>
                        <option value="email">Email Address</option>
                        <option value="websiteUrl">Website URL</option>
                        <option value="googleMapsUrl">Google Maps Profile</option>
                        <option value="categoryName">Business Category</option>
                        <option value="city">City / Town</option>
                        <option value="locality">Locality / Neighborhood</option>
                        <option value="address">Full Address</option>
                        <option value="websiteStatus">Website Status</option>
                        <option value="estimatedDealValue">Estimated Deal Value</option>
                        <option value="notes">Notes</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setImportStep(1)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportStep(3)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
                  >
                    Review Validation & Duplicates →
                  </button>
                </div>
              </div>
            )}

            {importStep === 3 && (
              <div className="space-y-4">
                <div className="overflow-x-auto max-h-72 border border-slate-800 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                        <th className="py-2 px-3">Business Name</th>
                        <th className="py-2 px-3">Phone</th>
                        <th className="py-2 px-3">Locality / City</th>
                        <th className="py-2 px-3">Validation & Duplicate Check</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {mappedImportPreview.map((row) => (
                        <tr key={row.rowIndex}>
                          <td className="py-2 px-3 font-medium text-white">{row.businessName || '(Empty)'}</td>
                          <td className="py-2 px-3 font-mono text-slate-300">{row.phone || '—'}</td>
                          <td className="py-2 px-3 text-slate-300">
                            {row.locality}, {row.city}
                          </td>
                          <td className="py-2 px-3">
                            {!row.isValid ? (
                              <span className="text-red-400">Invalid: Missing Business Name</span>
                            ) : row.isDuplicate ? (
                              <span className="text-amber-400">
                                Duplicate Detected: {row.matchReason}
                              </span>
                            ) : (
                              <span className="text-emerald-400">Valid New Record</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {row.isValid && (
                              <select
                                aria-label={`Resolution for ${row.businessName}`}
                                value={row.resolution}
                                onChange={(e) =>
                                  setDuplicateResolutions({
                                    ...duplicateResolutions,
                                    [row.rowIndex]: e.target.value as 'skip' | 'create' | 'update',
                                  })
                                }
                                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                              >
                                <option value="create">Import as New Record</option>
                                <option value="skip">Skip Record</option>
                                {row.isDuplicate && <option value="update">Update Existing Record</option>}
                              </select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setImportStep(2)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
                  >
                    Back to Mapping
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBatchImport}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg"
                  >
                    Confirm & Execute Import
                  </button>
                </div>
              </div>
            )}

            {importStep === 4 && importSummary && (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl">
                  <h4 className="text-sm font-semibold text-emerald-300">
                    Spreadsheet Import Completed Successfully
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 text-center">
                    <div className="bg-slate-950 p-3 rounded-lg">
                      <div className="text-lg font-bold text-white font-mono tabular-nums">
                        {importSummary.rowsRead}
                      </div>
                      <div className="text-[11px] text-slate-400">Rows Read</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg">
                      <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
                        {importSummary.imported}
                      </div>
                      <div className="text-[11px] text-slate-400">Imported</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg">
                      <div className="text-lg font-bold text-amber-400 font-mono tabular-nums">
                        {importSummary.skipped}
                      </div>
                      <div className="text-[11px] text-slate-400">Skipped</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg">
                      <div className="text-lg font-bold text-red-400 font-mono tabular-nums">
                        {importSummary.invalid}
                      </div>
                      <div className="text-[11px] text-slate-400">Invalid</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg">
                      <div className="text-lg font-bold text-blue-400 font-mono tabular-nums">
                        {importSummary.duplicates}
                      </div>
                      <div className="text-[11px] text-slate-400">Duplicates Found</div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setImportWizardOpen(false)}
                    className="px-5 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spreadsheet Export Configuration Modal (Sections 7.5 & 7.6) */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Export Leads to Spreadsheet"
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold text-white">Export CRM Records</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Export Scope</label>
                <select
                  value={exportScope}
                  onChange={(e) => setExportScope(e.target.value as 'filtered' | 'selected' | 'all')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="filtered">Current Filter Results ({filteredLeads.length})</option>
                  <option value="selected">Selected Leads ({selectedLeadIds.size})</option>
                  <option value="all">All Active Leads ({leads.filter((l) => !l.isArchived).length})</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Spreadsheet Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'xlsx' | 'csv')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="xlsx">Excel Workbook (.XLSX)</option>
                  <option value="csv">UTF-8 Comma Separated (.CSV)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Select Columns to Include (Formula-injection safe & phone numbers preserved as text)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-slate-950 p-3 rounded-lg border border-slate-800">
                {allExportColumns.map((col) => {
                  const checked = selectedExportCols.includes(col.key);
                  return (
                    <label key={col.key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedExportCols((prev) =>
                            checked ? prev.filter((k) => k !== col.key) : [...prev, col.key]
                          )
                        }
                        className="rounded border-slate-700 bg-slate-900 text-blue-500"
                      />
                      <span>{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunExport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lead Confirmation Modal */}
      {leadToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div
            role="alertdialog"
            aria-label="Confirm Lead Deletion"
            className="bg-slate-900 border border-red-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-950/80 border border-red-500/60 rounded-xl text-red-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Lead</h3>
                <p className="text-xs text-red-400">Permanently remove from database &amp; CRM</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <span className="font-bold text-white">&ldquo;{leadToDelete.businessName}&rdquo;</span>?
              All associated outreach activities, notes, and deal information will be wiped.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setLeadToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = leadToDelete;
                  setLeadToDelete(null);
                  if (detailLeadId === target.id) {
                    setDetailLeadId(null);
                  }
                  await onMutate(
                    'DELETE_LEADS',
                    { leadIds: [target.id] },
                    `Permanently deleted lead: ${target.businessName}`
                  );
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Leads Confirmation Modal */}
      {confirmClearAllOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div
            role="alertdialog"
            aria-label="Confirm Clear All Leads"
            className="bg-slate-900 border border-red-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-950/80 border border-red-500/60 rounded-xl text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete All Leads?</h3>
                <p className="text-xs text-red-400">Total leads to remove: {leads.length}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently delete all <span className="font-bold text-white">{leads.length} leads</span> from your CRM and database.
              This operation cannot be reversed.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearAllOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmClearAllOpen(false);
                  setDetailLeadId(null);
                  setSelectedLeadIds(new Set());
                  await onMutate(
                    'CLEAR_ALL_LEADS',
                    {},
                    `Cleared all ${leads.length} leads from database`
                  );
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Yes, Delete All Leads
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gmail Assignment Notification Modal */}
      <GmailNotifyModal draft={gmailDraft} onClose={() => setGmailDraft(null)} />
    </div>
  );
}
