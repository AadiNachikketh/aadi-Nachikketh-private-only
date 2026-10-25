'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Bookmark,
  BookmarkCheck,
  Plus,
  Upload,
  ExternalLink,
  Trash2,
  MapPin,
  Filter,
  FolderTree,
} from 'lucide-react';
import {
  GeoLocation,
  SavedLocationRecord,
  UserProfile,
  BusinessCategory,
  LeadRecord,
} from '../types/crm';

interface LocationsModuleProps {
  locations: GeoLocation[];
  savedLocations: SavedLocationRecord[];
  outreachers: UserProfile[];
  categories: BusinessCategory[];
  leads: LeadRecord[];
  actorRole: string;
  onMutate: (action: string, payload: Record<string, unknown>, successMsg?: string) => Promise<void>;
  onViewLeadsInLocation: (location: GeoLocation, hierarchyPath: GeoLocation[]) => void;
  onAddLeadInLocation: (location: GeoLocation, hierarchyPath: GeoLocation[]) => void;
}

const SAVED_STATUSES = [
  'Not Started',
  'Researching',
  'Ready for Outreach',
  'In Progress',
  'Completed',
  'Paused',
];

const REGIONAL_GEO_PACKS: Record<string, Array<Record<string, unknown>>> = {
  'Tamil Nadu (Chennai & Localities)': [
    { externalGeographicId: 'GN-IN-TN', name: 'Tamil Nadu', locationType: 'State / Union Territory', administrativeLevel: 1, countryCode: 'IN', parentExternalId: 'GN-IN', latitude: '11.1271', longitude: '78.6569' },
    { externalGeographicId: 'GN-IN-TN-CHN', name: 'Chennai District', locationType: 'District', administrativeLevel: 2, countryCode: 'IN', parentExternalId: 'GN-IN-TN', latitude: '13.0827', longitude: '80.2707' },
    { externalGeographicId: 'GN-CITY-CHN', name: 'Chennai', locationType: 'City', administrativeLevel: 3, countryCode: 'IN', parentExternalId: 'GN-IN-TN-CHN', latitude: '13.0827', longitude: '80.2707' },
    { externalGeographicId: 'GN-LOC-TNAGAR', name: 'T. Nagar', locationType: 'Locality', administrativeLevel: 4, countryCode: 'IN', parentExternalId: 'GN-CITY-CHN', latitude: '13.0418', longitude: '80.2341' },
    { externalGeographicId: 'GN-LOC-ADYAR', name: 'Adyar', locationType: 'Locality', administrativeLevel: 4, countryCode: 'IN', parentExternalId: 'GN-CITY-CHN', latitude: '13.0012', longitude: '80.2565' },
    { externalGeographicId: 'GN-LOC-ANNANAGAR', name: 'Anna Nagar', locationType: 'Locality', administrativeLevel: 4, countryCode: 'IN', parentExternalId: 'GN-CITY-CHN', latitude: '13.0850', longitude: '80.2101' },
  ],
  'Gujarat (Ahmedabad & Surat)': [
    { externalGeographicId: 'GN-IN-GJ', name: 'Gujarat', locationType: 'State / Union Territory', administrativeLevel: 1, countryCode: 'IN', parentExternalId: 'GN-IN', latitude: '22.2587', longitude: '71.1924' },
    { externalGeographicId: 'GN-IN-GJ-AMD', name: 'Ahmedabad District', locationType: 'District', administrativeLevel: 2, countryCode: 'IN', parentExternalId: 'GN-IN-GJ', latitude: '23.0225', longitude: '72.5714' },
    { externalGeographicId: 'GN-CITY-AMD', name: 'Ahmedabad', locationType: 'City', administrativeLevel: 3, countryCode: 'IN', parentExternalId: 'GN-IN-GJ-AMD', latitude: '23.0225', longitude: '72.5714' },
    { externalGeographicId: 'GN-LOC-CGROAD', name: 'C.G. Road Navrangpura', locationType: 'Locality', administrativeLevel: 4, countryCode: 'IN', parentExternalId: 'GN-CITY-AMD', latitude: '23.0300', longitude: '72.5600' },
    { externalGeographicId: 'GN-LOC-SATELLITE', name: 'Satellite', locationType: 'Locality', administrativeLevel: 4, countryCode: 'IN', parentExternalId: 'GN-CITY-AMD', latitude: '23.0260', longitude: '72.5240' },
  ],
};

export default function LocationsModule({
  locations,
  savedLocations,
  outreachers,
  categories,
  leads,
  actorRole,
  onMutate,
  onViewLeadsInLocation,
  onAddLeadInLocation,
}: LocationsModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('IN');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [savedFilter, setSavedFilter] = useState('ALL');
  const [workStatusFilter, setWorkStatusFilter] = useState('ALL');

  // Quick India State -> District -> Place navigator state inside the Geographical Hierarchy panel
  const [quickStateId, setQuickStateId] = useState<string>('');
  const [quickDistrictId, setQuickDistrictId] = useState<string>('');
  const [quickPlaceId, setQuickPlaceId] = useState<string>('');

  // Default expanded nodes: India -> Karnataka -> Bengaluru Urban -> Bengaluru
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    for (const loc of locations) {
      if (
        loc.countryCode === 'IN' &&
        (loc.administrativeLevel === 0 ||
          ['GN-IN', 'GN-IN-KA', 'GN-IN-KA-BLR-U', 'GN-CITY-BLR'].includes(loc.externalGeographicId))
      ) {
        initial.add(loc.id);
      }
    }
    return initial;
  });

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(() => {
    const wf = locations.find((l) => l.name === 'Whitefield');
    return wf ? wf.id : locations[0]?.id || null;
  });

  const [checkedLocationIds, setCheckedLocationIds] = useState<Set<number>>(new Set());
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<number[]>([]);

  // Save Target Modal State
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [targetPriority, setTargetPriority] = useState('High');
  const [targetStatus, setTargetStatus] = useState('Not Started');
  const [targetCategoriesInput, setTargetCategoriesInput] = useState('Jewellery Stores');
  const [targetLeadCount, setTargetLeadCount] = useState(40);
  const [targetOutreacherId, setTargetOutreacherId] = useState<string>('');
  const [targetNotes, setTargetNotes] = useState('');

  // Geo Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedGeoPack, setSelectedGeoPack] = useState(Object.keys(REGIONAL_GEO_PACKS)[0]);
  const [customLocName, setCustomLocName] = useState('');
  const [customLocType, setCustomLocType] = useState('Locality');
  const [customLocLevel, setCustomLocLevel] = useState(4);
  const [customParentId, setCustomParentId] = useState<string>('');

  const locById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const savedByLocId = useMemo(
    () => new Map(savedLocations.map((s) => [s.locationId, s])),
    [savedLocations]
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<number | null, GeoLocation[]>();
    for (const loc of locations) {
      const pid = loc.parentLocationId ?? null;
      const list = map.get(pid) || [];
      list.push(loc);
      map.set(pid, list);
    }
    return map;
  }, [locations]);

  const getHierarchyPath = (locId: number | null): GeoLocation[] => {
    const path: GeoLocation[] = [];
    let curr = locId ? locById.get(locId) : undefined;
    let safety = 0;
    while (curr && safety < 10) {
      path.unshift(curr);
      curr = curr.parentLocationId ? locById.get(curr.parentLocationId) : undefined;
      safety++;
    }
    return path;
  };

  const selectedLocation = selectedLocationId ? locById.get(selectedLocationId) || null : null;
  const selectedHierarchy = useMemo(
    () => getHierarchyPath(selectedLocationId),
    [selectedLocationId, locById]
  );
  const selectedSavedRecord = selectedLocationId ? savedByLocId.get(selectedLocationId) : undefined;

  const selectLocationNode = (loc: GeoLocation) => {
    setSelectedLocationId(loc.id);
    setRecentlyViewedIds((prev) => [loc.id, ...prev.filter((id) => id !== loc.id)].slice(0, 6));
    const existingSaved = savedByLocId.get(loc.id);
    if (existingSaved) {
      setTargetPriority(existingSaved.priority);
      setTargetStatus(existingSaved.status);
      setTargetCategoriesInput(existingSaved.targetCategories || 'Jewellery Stores');
      setTargetLeadCount(existingSaved.targetLeadCount || 40);
      setTargetOutreacherId(
        existingSaved.assignedOutreacherId ? String(existingSaved.assignedOutreacherId) : ''
      );
      setTargetNotes(existingSaved.notes || '');
    } else {
      setTargetPriority('High');
      setTargetStatus('Not Started');
      setTargetCategoriesInput('Jewellery Stores');
      setTargetLeadCount(40);
      setTargetOutreacherId(outreachers[0] ? String(outreachers[0].id) : '');
      setTargetNotes('');
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCheckLocation = (id: number) => {
    setCheckedLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredFlatLocations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return locations.filter((loc) => {
      if (countryFilter !== 'ALL' && loc.countryCode !== countryFilter) return false;
      if (levelFilter !== 'ALL' && String(loc.administrativeLevel) !== levelFilter) return false;
      const isSaved = savedByLocId.has(loc.id);
      if (savedFilter === 'SAVED' && !isSaved) return false;
      if (savedFilter === 'UNSAVED' && isSaved) return false;
      if (workStatusFilter !== 'ALL') {
        const sRec = savedByLocId.get(loc.id);
        if (!sRec || sRec.status !== workStatusFilter) return false;
      }
      if (q && !loc.normalizedName.includes(q) && !loc.name.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [locations, searchQuery, countryFilter, levelFilter, savedFilter, workStatusFilter, savedByLocId]);

  const isFilteringFlat =
    searchQuery.trim() !== '' ||
    levelFilter !== 'ALL' ||
    savedFilter !== 'ALL' ||
    workStatusFilter !== 'ALL';

  const leadsInSelectedLocation = useMemo(() => {
    if (!selectedLocation) return [];
    return leads.filter(
      (l) =>
        !l.isArchived &&
        (l.locationId === selectedLocation.id ||
          l.locality?.toLowerCase() === selectedLocation.name.toLowerCase() ||
          l.city?.toLowerCase() === selectedLocation.name.toLowerCase() ||
          l.district?.toLowerCase() === selectedLocation.name.toLowerCase() ||
          l.state?.toLowerCase() === selectedLocation.name.toLowerCase() ||
          l.country?.toLowerCase() === selectedLocation.name.toLowerCase())
    );
  }, [selectedLocation, leads]);

  const handleSaveSelectedToTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) return;
    await onMutate(
      'SAVE_TARGET_LOCATION',
      {
        locationId: selectedLocation.id,
        status: targetStatus,
        priority: targetPriority,
        targetCategories: targetCategoriesInput,
        targetLeadCount,
        assignedOutreacherId: targetOutreacherId ? Number(targetOutreacherId) : null,
        notes: targetNotes,
      },
      `Saved ${selectedLocation.name} to target locations.`
    );
    setSaveModalOpen(false);
  };

  const handleBulkSaveChecked = async () => {
    for (const locId of checkedLocationIds) {
      await onMutate('SAVE_TARGET_LOCATION', {
        locationId: locId,
        status: 'Not Started',
        priority: 'Medium',
        targetCategories: 'Jewellery Stores',
        targetLeadCount: 30,
      });
    }
    setCheckedLocationIds(new Set());
  };

  const handleImportGeoPack = async () => {
    const pack = REGIONAL_GEO_PACKS[selectedGeoPack];
    if (!pack) return;
    await onMutate(
      'IMPORT_GEO_LOCATIONS',
      {
        filename: `${selectedGeoPack.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.json`,
        records: pack,
      },
      `Imported geographical hierarchy pack: ${selectedGeoPack}`
    );
    setImportModalOpen(false);
  };

  const handleAddCustomLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLocName.trim()) return;
    const parentLoc = customParentId ? locById.get(Number(customParentId)) : null;
    await onMutate(
      'IMPORT_GEO_LOCATIONS',
      {
        filename: 'manual_location_entry.json',
        records: [
          {
            name: customLocName.trim(),
            locationType: customLocType,
            administrativeLevel: customLocLevel,
            countryCode: parentLoc?.countryCode || 'IN',
            parentLocationId: parentLoc ? parentLoc.id : null,
            dataSource: 'Custom Administrative Entry',
          },
        ],
      },
      `Added ${customLocName.trim()} to geographical database.`
    );
    setCustomLocName('');
    setImportModalOpen(false);
  };

  // Computed lists for India States -> Districts -> Places selector in Geographical Hierarchy panel
  const indiaStates = useMemo(
    () =>
      locations
        .filter((l) => l.countryCode === 'IN' && l.administrativeLevel === 1)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [locations]
  );

  const districtsForQuickState = useMemo(() => {
    if (!quickStateId) return [];
    const stId = Number(quickStateId);
    return (childrenByParent.get(stId) || []).sort((a, b) => a.name.localeCompare(b.name));
  }, [quickStateId, childrenByParent]);

  const placesForQuickDistrict = useMemo(() => {
    if (!quickDistrictId) return [];
    const distId = Number(quickDistrictId);
    const cities = childrenByParent.get(distId) || [];
    const places: GeoLocation[] = [];
    for (const c of cities) {
      const subPlaces = childrenByParent.get(c.id) || [];
      if (subPlaces.length > 0) {
        places.push(...subPlaces);
      } else {
        places.push(c);
      }
    }
    return places.sort((a, b) => a.name.localeCompare(b.name));
  }, [quickDistrictId, childrenByParent]);

  const handleQuickStateChange = (stateIdStr: string) => {
    setQuickStateId(stateIdStr);
    setQuickDistrictId('');
    setQuickPlaceId('');
    if (!stateIdStr) return;
    const stLoc = locById.get(Number(stateIdStr));
    if (stLoc) {
      selectLocationNode(stLoc);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (stLoc.parentLocationId) next.add(stLoc.parentLocationId);
        next.add(stLoc.id);
        return next;
      });
    }
  };

  const handleQuickDistrictChange = (distIdStr: string) => {
    setQuickDistrictId(distIdStr);
    setQuickPlaceId('');
    if (!distIdStr) return;
    const distLoc = locById.get(Number(distIdStr));
    if (distLoc) {
      selectLocationNode(distLoc);
      const cities = childrenByParent.get(distLoc.id) || [];
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (distLoc.parentLocationId) next.add(distLoc.parentLocationId);
        next.add(distLoc.id);
        for (const c of cities) next.add(c.id);
        return next;
      });
    }
  };

  const handleQuickPlaceChange = (placeIdStr: string) => {
    setQuickPlaceId(placeIdStr);
    if (!placeIdStr) return;
    const placeLoc = locById.get(Number(placeIdStr));
    if (placeLoc) {
      selectLocationNode(placeLoc);
      const path = getHierarchyPath(placeLoc.id);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        for (const p of path) next.add(p.id);
        return next;
      });
    }
  };

  const renderTreeNodes = (parentId: number | null, depth: number = 0): React.ReactNode => {
    const children = (childrenByParent.get(parentId) || []).filter(
      (c) => countryFilter === 'ALL' || c.countryCode === countryFilter
    );
    if (children.length === 0) return null;

    return children.map((loc) => {
      const directChildren = childrenByParent.get(loc.id) || [];
      const hasChildren = directChildren.length > 0;
      const isExpanded = expandedIds.has(loc.id);
      const isSelected = selectedLocationId === loc.id;
      const isSaved = savedByLocId.has(loc.id);
      const isChecked = checkedLocationIds.has(loc.id);

      return (
        <div key={loc.id}>
          <div
            className={`flex items-center justify-between py-1.5 px-2 rounded-md text-sm transition-colors cursor-pointer ${
              isSelected
                ? 'bg-blue-600/20 text-white border border-blue-500/40'
                : 'text-slate-300 hover:bg-slate-800/70'
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={`Toggle ${loc.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(loc.id);
                  }}
                  className="p-0.5 text-slate-400 hover:text-white rounded"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <span className="w-5" />
              )}

              <input
                type="checkbox"
                aria-label={`Select ${loc.name}`}
                checked={isChecked}
                onChange={() => toggleCheckLocation(loc.id)}
                className="rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />

              <button
                type="button"
                onClick={() => selectLocationNode(loc)}
                className="flex items-center gap-2 text-left truncate flex-1"
              >
                <span className="font-medium truncate">{loc.name}</span>
                <span className="text-xs text-slate-500 shrink-0">
                  · {loc.locationType}
                  {hasChildren ? ` (${directChildren.length})` : ''}
                </span>
              </button>
            </div>

            {isSaved && (
              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" aria-label="Saved Target" />
            )}
          </div>

          {hasChildren && isExpanded && renderTreeNodes(loc.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Indian states, districts, cities, or places (e.g. Whitefield, Bandra, T. Nagar)..."
              aria-label="Search geographical locations"
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            aria-label="Filter by Country"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
          >
            <option value="IN">India (All 36 States & UTs)</option>
            <option value="ALL">All Countries</option>
            <option value="US">United States (US)</option>
            <option value="GB">United Kingdom (GB)</option>
            <option value="AE">United Arab Emirates (AE)</option>
          </select>

          <select
            aria-label="Filter by Administrative Level"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
          >
            <option value="ALL">All Admin Levels</option>
            <option value="0">Level 0 · Country</option>
            <option value="1">Level 1 · State / Union Territory</option>
            <option value="2">Level 2 · District</option>
            <option value="3">Level 3 · City / Town</option>
            <option value="4">Level 4 · Locality / Place</option>
          </select>

          <select
            aria-label="Filter by Saved Status"
            value={savedFilter}
            onChange={(e) => setSavedFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
          >
            <option value="ALL">All Saved States</option>
            <option value="SAVED">Saved Targets Only</option>
            <option value="UNSAVED">Not Yet Saved</option>
          </select>

          <select
            aria-label="Filter by Work Status"
            value={workStatusFilter}
            onChange={(e) => setWorkStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
          >
            <option value="ALL">All Work Statuses</option>
            {SAVED_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {checkedLocationIds.size > 0 && (
            <button
              type="button"
              onClick={handleBulkSaveChecked}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              Save {checkedLocationIds.size} Selected to Targets
            </button>
          )}
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-2 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Geo Dataset
          </button>
        </div>
      </div>

      {/* Main Split View: Hierarchical Tree + Selected Location Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 cols: Expandable Tree / Search Results */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-100">Geographical Hierarchy</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {indiaStates.length} States/UTs · {locations.length} Places
            </span>
          </div>

          {/* India State -> District -> Place Quick Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 pb-3 border-b border-slate-800/80">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">1. State / UT ({indiaStates.length})</label>
              <select
                aria-label="Select Indian State or Union Territory"
                value={quickStateId}
                onChange={(e) => handleQuickStateChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">All States & UTs</option>
                {indiaStates.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                2. District ({districtsForQuickState.length})
              </label>
              <select
                aria-label="Select District"
                value={quickDistrictId}
                disabled={!quickStateId}
                onChange={(e) => handleQuickDistrictChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 disabled:opacity-50 focus:outline-none focus:border-blue-500"
              >
                <option value="">{quickStateId ? 'Select District...' : 'Choose State first'}</option>
                {districtsForQuickState.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                3. Place / Locality ({placesForQuickDistrict.length})
              </label>
              <select
                aria-label="Select Place or Locality"
                value={quickPlaceId}
                disabled={!quickDistrictId}
                onChange={(e) => handleQuickPlaceChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 disabled:opacity-50 focus:outline-none focus:border-blue-500"
              >
                <option value="">{quickDistrictId ? 'Select Place...' : 'Choose District first'}</option>
                {placesForQuickDistrict.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[480px] overflow-y-auto pr-1 space-y-0.5">
            {isFilteringFlat ? (
              filteredFlatLocations.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  No geographical locations match your current filter criteria.
                </div>
              ) : (
                filteredFlatLocations.map((loc) => {
                  const isSelected = selectedLocationId === loc.id;
                  const isSaved = savedByLocId.has(loc.id);
                  const pathNames = getHierarchyPath(loc.id)
                    .map((p) => p.name)
                    .join(' → ');
                  return (
                    <div
                      key={loc.id}
                      onClick={() => selectLocationNode(loc)}
                      className={`p-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                          : 'hover:bg-slate-800/70 text-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {loc.name}{' '}
                          <span className="text-xs text-slate-400 font-normal">· {loc.locationType}</span>
                        </div>
                        <div className="text-xs text-slate-500 truncate">{pathNames}</div>
                      </div>
                      {isSaved && <BookmarkCheck className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                    </div>
                  );
                })
              )
            ) : (
              renderTreeNodes(null, 0)
            )}
          </div>

          {/* Recently Viewed Strip */}
          {recentlyViewedIds.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400 mb-2">Recently Viewed Locations</div>
              <div className="flex flex-wrap gap-1.5">
                {recentlyViewedIds.map((rid) => {
                  const rLoc = locById.get(rid);
                  if (!rLoc) return null;
                  return (
                    <button
                      key={rid}
                      type="button"
                      onClick={() => selectLocationNode(rLoc)}
                      className="px-2.5 py-1 text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-md transition-colors"
                    >
                      {rLoc.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 7 cols: Selected Location Detail & Targeting Actions */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          {selectedLocation ? (
            <>
              {/* Breadcrumb */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 pb-3 border-b border-slate-800">
                {selectedHierarchy.map((node, idx) => (
                  <React.Fragment key={node.id}>
                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                    <button
                      type="button"
                      onClick={() => selectLocationNode(node)}
                      className={`hover:text-white transition-colors ${
                        node.id === selectedLocation.id ? 'text-blue-400 font-semibold' : ''
                      }`}
                    >
                      {node.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Header & Primary Targeting Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{selectedLocation.name}</h3>
                    <span className="text-xs text-slate-400">
                      · {selectedLocation.locationType} (Level {selectedLocation.administrativeLevel})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono tabular-nums mt-1">
                    Geo ID: {selectedLocation.externalGeographicId} · Country: {selectedLocation.countryCode} ·
                    Coords: {selectedLocation.latitude || 'N/A'}, {selectedLocation.longitude || 'N/A'} · Source:{' '}
                    {selectedLocation.dataSource}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSaveModalOpen(true)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    {selectedSavedRecord ? 'Edit Saved Target' : 'Save to Target List'}
                  </button>
                </div>
              </div>

              {/* Location Targeting Workflow Buttons (Section 5.6) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onViewLeadsInLocation(selectedLocation, selectedHierarchy)}
                  className="px-4 py-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center justify-between text-left transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">View Leads in This Location</div>
                    <div className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                      {leadsInSelectedLocation.length} matching CRM records
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-blue-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => onAddLeadInLocation(selectedLocation, selectedHierarchy)}
                  className="px-4 py-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center justify-between text-left transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">Add Leads to This Location</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Create or import businesses in {selectedLocation.name}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                </button>
              </div>

              {/* Child Sub-Locations */}
              {(childrenByParent.get(selectedLocation.id) || []).length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-400 mb-2">
                    Direct Child Divisions / Localities ({(childrenByParent.get(selectedLocation.id) || []).length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(childrenByParent.get(selectedLocation.id) || []).map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => selectLocationNode(child)}
                        className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-left transition-colors flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-200 truncate">{child.name}</div>
                          <div className="text-[11px] text-slate-500">{child.locationType}</div>
                        </div>
                        {savedByLocId.has(child.id) && (
                          <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved Target Metadata if Saved */}
              {selectedSavedRecord && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400">
                      Saved Target Location · Status: {selectedSavedRecord.status}
                    </span>
                    <span className="text-xs text-slate-400 font-mono tabular-nums">
                      Priority: {selectedSavedRecord.priority} · Target Leads: {selectedSavedRecord.targetLeadCount || 40}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Target Categories: <span className="text-white">{selectedSavedRecord.targetCategories || 'All Categories'}</span>
                  </div>
                  {selectedSavedRecord.notes && (
                    <p className="text-xs text-slate-400">{selectedSavedRecord.notes}</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-sm text-slate-400">
              Select a country, state, district, city, or locality from the tree to inspect details.
            </div>
          )}
        </div>
      </div>

      {/* Saved Target Locations Manager Table (Section 5.5) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">Saved Target Locations</h2>
            <p className="text-xs text-slate-400">
              Permanent targeting list across districts, cities, and localities. Removing a saved target never deletes the underlying geographical location.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            {savedLocations.length} Saved Targets
          </span>
        </div>

        {savedLocations.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <MapPin className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-medium text-slate-300">No Saved Target Locations Yet</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Browse or search the geographical tree above, select a locality such as Whitefield or Bandra West, and click &ldquo;Save to Target List&rdquo;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-2.5 px-3 font-medium">Location & Hierarchy</th>
                  <th className="py-2.5 px-3 font-medium">Work Status</th>
                  <th className="py-2.5 px-3 font-medium">Priority</th>
                  <th className="py-2.5 px-3 font-medium">Target Categories</th>
                  <th className="py-2.5 px-3 font-medium">Outreacher</th>
                  <th className="py-2.5 px-3 font-medium text-right">Target / Actual Leads</th>
                  <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {savedLocations.map((sRec) => {
                  const loc = locById.get(sRec.locationId);
                  if (!loc) return null;
                  const path = getHierarchyPath(loc.id);
                  const pathStr = path.map((p) => p.name).join(' → ');
                  const outreacher = outreachers.find((o) => o.id === sRec.assignedOutreacherId);
                  const actualCount = leads.filter(
                    (l) =>
                      !l.isArchived &&
                      (l.locationId === loc.id ||
                        l.locality?.toLowerCase() === loc.name.toLowerCase() ||
                        l.city?.toLowerCase() === loc.name.toLowerCase())
                  ).length;

                  return (
                    <tr key={sRec.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => selectLocationNode(loc)}
                          className="font-medium text-white hover:text-blue-400 text-left block"
                        >
                          {loc.name}
                        </button>
                        <span className="text-xs text-slate-500 block">{pathStr}</span>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          aria-label={`Work status for ${loc.name}`}
                          value={sRec.status}
                          onChange={(e) =>
                            onMutate(
                              'UPDATE_SAVED_LOCATION',
                              {
                                ...sRec,
                                status: e.target.value,
                              },
                              `Updated ${loc.name} work status to ${e.target.value}`
                            )
                          }
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                        >
                          {SAVED_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-300">{sRec.priority}</td>
                      <td className="py-3 px-3 text-xs text-slate-300 max-w-[200px] truncate">
                        {sRec.targetCategories || 'All Categories'}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-300">
                        {outreacher ? outreacher.fullName : 'Unassigned'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-slate-300">
                        {actualCount} / {sRec.targetLeadCount || 40}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onViewLeadsInLocation(loc, path)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors whitespace-nowrap"
                          >
                            View Leads
                          </button>
                          <button
                            type="button"
                            onClick={() => onAddLeadInLocation(loc, path)}
                            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs rounded transition-colors whitespace-nowrap"
                          >
                            + Add Lead
                          </button>
                          {actorRole === 'admin' && (
                            <button
                              type="button"
                              aria-label={`Remove ${loc.name} from saved targets`}
                              onClick={() =>
                                onMutate(
                                  'REMOVE_SAVED_LOCATION',
                                  { id: sRec.id },
                                  `Removed ${loc.name} from saved targets (geographical record preserved).`
                                )
                              }
                              className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save Target Location Modal */}
      {saveModalOpen && selectedLocation && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label={`Save Target Location ${selectedLocation.name}`}
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold text-white">
              Save Target Location: {selectedLocation.name}
            </h3>
            <form onSubmit={handleSaveSelectedToTargets} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Work Status</label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {SAVED_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Priority</label>
                  <select
                    value={targetPriority}
                    onChange={(e) => setTargetPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Target Business Categories (comma-separated or select)
                </label>
                <input
                  type="text"
                  value={targetCategoriesInput}
                  onChange={(e) => setTargetCategoriesInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {categories.slice(0, 5).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setTargetCategoriesInput(cat.name)}
                      className="text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Target Lead Count</label>
                  <input
                    type="number"
                    min={1}
                    value={targetLeadCount}
                    onChange={(e) => setTargetLeadCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Assigned Outreacher</label>
                  <select
                    value={targetOutreacherId}
                    onChange={(e) => setTargetOutreacherId(e.target.value)}
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
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Research Notes</label>
                <textarea
                  rows={2}
                  value={targetNotes}
                  onChange={(e) => setTargetNotes(e.target.value)}
                  placeholder="E.g. Focus on independent showrooms on main commercial street..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
                >
                  Save Target Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Geographical Dataset Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Import Geographical Dataset"
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5"
          >
            <h3 className="text-lg font-semibold text-white">Geographical Dataset Batch Import</h3>

            <div className="space-y-3 border-b border-slate-800 pb-4">
              <label className="block text-xs font-medium text-slate-300">
                Option 1: Load Authoritative GeoNames Regional Hierarchy Pack
              </label>
              <select
                value={selectedGeoPack}
                onChange={(e) => setSelectedGeoPack(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              >
                {Object.keys(REGIONAL_GEO_PACKS).map((k) => (
                  <option key={k} value={k}>
                    {k} ({REGIONAL_GEO_PACKS[k].length} administrative nodes)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleImportGeoPack}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
              >
                Batch Import Selected Regional Pack
              </button>
            </div>

            <form onSubmit={handleAddCustomLocation} className="space-y-3">
              <label className="block text-xs font-medium text-slate-300">
                Option 2: Add Custom Administrative Division or Locality
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Location Name</label>
                  <input
                    type="text"
                    required
                    value={customLocName}
                    onChange={(e) => setCustomLocName(e.target.value)}
                    placeholder="e.g. Malleshwaram"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Location Type</label>
                  <select
                    value={customLocType}
                    onChange={(e) => {
                      setCustomLocType(e.target.value);
                      if (e.target.value === 'City') setCustomLocLevel(3);
                      else if (e.target.value === 'District') setCustomLocLevel(2);
                      else setCustomLocLevel(4);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="Locality">Locality (Level 4)</option>
                    <option value="City">City / Town (Level 3)</option>
                    <option value="District">District / County (Level 2)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Parent Administrative Location</label>
                <select
                  value={customParentId}
                  onChange={(e) => setCustomParentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">Select Parent Location...</option>
                  {locations
                    .filter((l) => l.administrativeLevel < 4)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.locationType} · {l.countryCode})
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg"
                >
                  Add Location Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
