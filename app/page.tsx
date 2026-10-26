'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  Users,
  PhoneOutgoing,
  Code2,
  FolderKanban,
  FileBarChart2,
  Settings,
  Search,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../src/lib/firebase';
import { supabase, getOAuthRedirectUrl } from '../src/supabaseClient.js';
import { CrmState, GeoLocation, LeadRecord } from '../src/types/crm';
import {
  loadSupabaseCrmState,
  mutateSupabaseCrmState,
} from '../src/lib/supabase-crm';
import DashboardModule from '../src/components/DashboardModule';
import LocationsModule from '../src/components/LocationsModule';
import LeadsCrmModule from '../src/components/LeadsCrmModule';
import OutreachersModule from '../src/components/OutreachersModule';
import DevelopersAndProjectsModule from '../src/components/DevelopersAndProjectsModule';
import ReportsAndSettingsModule from '../src/components/ReportsAndSettingsModule';

type ModuleKey =
  | 'dashboard'
  | 'locations'
  | 'leads'
  | 'outreachers'
  | 'developers'
  | 'projects'
  | 'reports'
  | 'settings';

const NAV_ITEMS: Array<{ id: ModuleKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'locations', label: 'Locations Explorer', icon: MapPin },
  { id: 'leads', label: 'Clients & Leads', icon: Users },
  { id: 'outreachers', label: 'Outreachers', icon: PhoneOutgoing },
  { id: 'developers', label: 'Developers', icon: Code2 },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'reports', label: 'Reports & Exports', icon: FileBarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

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

export default function AgencyCommandCenterPage() {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Supabase & Firebase Auth & Role state
  const [authChecked, setAuthChecked] = useState(false);
  const [supabaseEmail, setSupabaseEmail] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [actorRole, setActorRole] = useState<'admin' | 'outreacher' | 'developer'>('admin');

  // Supabase CRM State
  const [crmState, setCrmState] = useState<CrmState | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Global search state (Section 14)
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Cross-module triggers
  const [initialLocationFilter, setInitialLocationFilter] = useState<{
    country?: string;
    state?: string;
    district?: string;
    city?: string;
    locality?: string;
  } | null>(null);
  const [openAddLeadTrigger, setOpenAddLeadTrigger] = useState<{
    open: boolean;
    prefill?: Partial<LeadRecord>;
  } | null>(null);
  const [openCreateProjectTrigger, setOpenCreateProjectTrigger] = useState<{
    open: boolean;
    lead?: LeadRecord;
  } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const fetchCrmData = useCallback(async () => {
    try {
      const data = await loadSupabaseCrmState();
      setCrmState(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (!session) {
        router.replace('/login');
        return;
      }
      setSupabaseEmail(session.user?.email || null);
      setAuthChecked(true);
      fetchCrmData();
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (!session) {
        router.replace('/login');
      } else {
        setSupabaseEmail(session.user?.email || null);
        setAuthChecked(true);
        fetchCrmData();
      }
    });

    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
    });
    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      unsub();
    };
  }, [fetchCrmData, router]);

  const handleMutate = useCallback(
    async (action: string, payload: Record<string, unknown>, successMsg?: string) => {
      try {
        const data = await mutateSupabaseCrmState(
          action,
          payload,
          actorRole,
          supabaseEmail || firebaseUser?.displayName || 'Aaditya Verma'
        );
        setCrmState({ ...data });
        if (successMsg) {
          showToast('success', successMsg);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save changes';
        showToast('error', msg);
        throw err;
      }
    },
    [actorRole, supabaseEmail, firebaseUser, showToast]
  );

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthRedirectUrl(),
        },
      });
      if (error) {
        throw error;
      }
    } catch (err: unknown) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Google Sign-In failed'
      );
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await signOut(auth).catch(() => {});
    router.replace('/login');
  };

  const outreachers = useMemo(
    () => (crmState?.users || []).filter((u) => u.role === 'outreacher'),
    [crmState]
  );
  const developers = useMemo(
    () => (crmState?.users || []).filter((u) => u.role === 'developer'),
    [crmState]
  );

  const leadStatuses = useMemo(() => {
    if (!crmState?.settings?.leadStatuses) return DEFAULT_LEAD_STATUSES;
    try {
      return JSON.parse(crmState.settings.leadStatuses);
    } catch {
      return DEFAULT_LEAD_STATUSES;
    }
  }, [crmState]);

  const projectStatuses = useMemo(() => {
    if (!crmState?.settings?.projectStatuses) return DEFAULT_PROJECT_STATUSES;
    try {
      return JSON.parse(crmState.settings.projectStatuses);
    } catch {
      return DEFAULT_PROJECT_STATUSES;
    }
  }, [crmState]);

  // Global Search Results across Locations, Leads, Outreachers, Developers, Projects (Section 14)
  const globalSearchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q || !crmState) return null;

    const matchedLocations = crmState.locations
      .filter((l) => l.name.toLowerCase().includes(q))
      .slice(0, 4);
    const matchedLeads = crmState.leads
      .filter(
        (l) =>
          !l.isArchived &&
          (l.businessName.toLowerCase().includes(q) ||
            (l.contactName || '').toLowerCase().includes(q) ||
            (l.locality || '').toLowerCase().includes(q) ||
            (l.city || '').toLowerCase().includes(q))
      )
      .slice(0, 5);
    const matchedProjects = crmState.projects
      .filter(
        (p) =>
          p.projectName.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q)
      )
      .slice(0, 3);
    const matchedTeam = crmState.users
      .filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
      .slice(0, 3);

    return {
      matchedLocations,
      matchedLeads,
      matchedProjects,
      matchedTeam,
      total:
        matchedLocations.length +
        matchedLeads.length +
        matchedProjects.length +
        matchedTeam.length,
    };
  }, [globalSearch, crmState]);

  const handleViewLeadsInLocation = useCallback(
    (loc: GeoLocation, path: GeoLocation[]) => {
      const filterObj: {
        country?: string;
        state?: string;
        district?: string;
        city?: string;
        locality?: string;
      } = {};
      for (const node of path) {
        if (node.administrativeLevel === 0) filterObj.country = node.name;
        if (node.administrativeLevel === 1) filterObj.state = node.name;
        if (node.administrativeLevel === 2) filterObj.district = node.name;
        if (node.administrativeLevel === 3) filterObj.city = node.name;
        if (node.administrativeLevel === 4) filterObj.locality = node.name;
      }
      setInitialLocationFilter(filterObj);
      setActiveModule('leads');
    },
    []
  );

  const handleAddLeadInLocation = useCallback(
    (loc: GeoLocation, path: GeoLocation[]) => {
      const prefill: Partial<LeadRecord> = { locationId: loc.id };
      for (const node of path) {
        if (node.administrativeLevel === 0) prefill.country = node.name;
        if (node.administrativeLevel === 1) prefill.state = node.name;
        if (node.administrativeLevel === 2) prefill.district = node.name;
        if (node.administrativeLevel === 3) prefill.city = node.name;
        if (node.administrativeLevel === 4) prefill.locality = node.name;
      }
      setOpenAddLeadTrigger({ open: true, prefill });
      setActiveModule('leads');
    },
    []
  );

  const clearExternalTriggers = useCallback(() => {
    setInitialLocationFilter(null);
    setOpenAddLeadTrigger(null);
    setOpenCreateProjectTrigger(null);
  }, []);

  const currentModuleTitle =
    NAV_ITEMS.find((n) => n.id === activeModule)?.label || 'Agency Command Center';

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-xs">
        Checking session...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Left Sidebar Navigation (Section 3) */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-all duration-150`}
      >
        <div>
          <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
            {!sidebarCollapsed && (
              <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap truncate">
                {crmState?.settings?.agencyName || 'Agency Command Center'}
              </span>
            )}
            <button
              type="button"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          <nav className="p-2.5 space-y-1" aria-label="Main CRM Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'leads') {
                      setInitialLocationFilter(null);
                    }
                    setActiveModule(item.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Role & Auth Status */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Active Role</span>
              <select
                aria-label="Switch Active Role"
                value={actorRole}
                onChange={(e) =>
                  setActorRole(e.target.value as 'admin' | 'outreacher' | 'developer')
                }
                className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-blue-400 font-medium capitalize"
              >
                <option value="admin">Admin</option>
                <option value="outreacher">Outreacher</option>
                <option value="developer">Developer</option>
              </select>
            </div>

            {supabaseEmail || firebaseUser ? (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-300 truncate max-w-[140px]">
                  {supabaseEmail || firebaseUser?.email}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Google Sign-In
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (3-zone contract: Title — Global Search — Primary Quick Action) */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between gap-8 shrink-0">
          {/* Zone 1: Page Title */}
          <h1 className="text-base font-bold text-white whitespace-nowrap shrink-0">
            {currentModuleTitle}
          </h1>

          {/* Zone 2: Global Search across Businesses, Locations, Outreachers, Developers, Projects */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Global search: Whitefield, Sri Krishna Diamonds, Rohan, Projects..."
              aria-label="Global CRM Search"
              className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {globalSearch && (
              <button
                type="button"
                aria-label="Clear global search"
                onClick={() => setGlobalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Global Search Dropdown Results */}
            {searchFocused && globalSearchResults && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-3 space-y-3 max-h-96 overflow-y-auto">
                {globalSearchResults.total === 0 ? (
                  <div className="text-xs text-slate-400 py-3 text-center">
                    No matching records found for &ldquo;{globalSearch}&rdquo;
                  </div>
                ) : (
                  <>
                    {globalSearchResults.matchedLocations.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 mb-1">
                          Locations ({globalSearchResults.matchedLocations.length})
                        </div>
                        {globalSearchResults.matchedLocations.map((loc) => (
                          <button
                            key={loc.id}
                            type="button"
                            onMouseDown={() => {
                              setActiveModule('locations');
                              setGlobalSearch('');
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded text-xs text-slate-200 flex items-center justify-between"
                          >
                            <span>
                              {loc.name} · <span className="text-slate-400">{loc.locationType}</span>
                            </span>
                            <span className="text-blue-400">Open Location →</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {globalSearchResults.matchedLeads.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 mb-1">
                          Business Leads ({globalSearchResults.matchedLeads.length})
                        </div>
                        {globalSearchResults.matchedLeads.map((lead) => (
                          <button
                            key={lead.id}
                            type="button"
                            onMouseDown={() => {
                              setInitialLocationFilter({
                                locality: lead.locality || undefined,
                              });
                              setActiveModule('leads');
                              setGlobalSearch('');
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded text-xs text-slate-200 flex items-center justify-between"
                          >
                            <span>
                              {lead.businessName} ·{' '}
                              <span className="text-slate-400">
                                {lead.locality || lead.city} ({lead.status})
                              </span>
                            </span>
                            <span className="text-emerald-400 font-mono">
                              ₹{(lead.agreedDealValue || lead.estimatedDealValue).toLocaleString('en-IN')}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {globalSearchResults.matchedProjects.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 mb-1">
                          Website Projects ({globalSearchResults.matchedProjects.length})
                        </div>
                        {globalSearchResults.matchedProjects.map((proj) => (
                          <button
                            key={proj.id}
                            type="button"
                            onMouseDown={() => {
                              setActiveModule('projects');
                              setGlobalSearch('');
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded text-xs text-slate-200 flex items-center justify-between"
                          >
                            <span>{proj.projectName}</span>
                            <span className="text-blue-400">{proj.status}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setOpenAddLeadTrigger({ open: true });
                setActiveModule('leads');
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Quick Add Lead
            </button>
          </div>
        </header>

        {/* Accessible Toast Notification */}
        {toast && (
          <div className="px-6 pt-4">
            <div
              role="status"
              className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
                toast.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
                  : 'bg-red-950/70 border-red-500/40 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-6 overflow-y-auto">
          {loading || !crmState ? (
            <div className="space-y-4">
              <div className="h-20 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
              <div className="grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className="h-24 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"
                  />
                ))}
              </div>
              <div className="h-96 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              {activeModule === 'dashboard' && (
                <DashboardModule
                  state={crmState}
                  onNavigateModule={(mod) => setActiveModule(mod as ModuleKey)}
                  onQuickAction={(act) => {
                    if (act === 'add_lead') {
                      setOpenAddLeadTrigger({ open: true });
                      setActiveModule('leads');
                    } else if (act === 'save_location') {
                      setActiveModule('locations');
                    } else if (act === 'import_spreadsheet' || act === 'assign_leads') {
                      setActiveModule('leads');
                    } else if (act === 'add_project') {
                      setOpenCreateProjectTrigger({ open: true });
                      setActiveModule('projects');
                    } else if (act === 'add_team_member') {
                      setActiveModule('outreachers');
                    }
                  }}
                />
              )}

              {activeModule === 'locations' && (
                <LocationsModule
                  locations={crmState.locations}
                  savedLocations={crmState.savedLocations}
                  outreachers={outreachers}
                  categories={crmState.categories}
                  leads={crmState.leads}
                  actorRole={actorRole}
                  onMutate={handleMutate}
                  onViewLeadsInLocation={handleViewLeadsInLocation}
                  onAddLeadInLocation={handleAddLeadInLocation}
                />
              )}

              {activeModule === 'leads' && (
                <LeadsCrmModule
                  leads={crmState.leads}
                  activities={crmState.activities}
                  locations={crmState.locations}
                  categories={crmState.categories}
                  outreachers={outreachers}
                  developers={developers}
                  projects={crmState.projects}
                  leadStatuses={leadStatuses}
                  actorRole={actorRole}
                  initialLocationFilter={initialLocationFilter}
                  openAddLeadTrigger={openAddLeadTrigger}
                  onClearExternalTriggers={clearExternalTriggers}
                  onMutate={handleMutate}
                  onCreateProjectFromLead={(lead) => {
                    setOpenCreateProjectTrigger({ open: true, lead });
                    setActiveModule('projects');
                  }}
                />
              )}

              {activeModule === 'outreachers' && (
                <OutreachersModule
                  outreachers={outreachers}
                  leads={crmState.leads}
                  activities={crmState.activities}
                  deals={crmState.deals}
                  commissions={crmState.commissions}
                  actorRole={actorRole}
                  onMutate={handleMutate}
                />
              )}

              {(activeModule === 'developers' || activeModule === 'projects') && (
                <DevelopersAndProjectsModule
                  mode={activeModule}
                  developers={developers}
                  projects={crmState.projects}
                  tasks={crmState.tasks}
                  payments={crmState.payments}
                  commissions={crmState.commissions}
                  leads={crmState.leads}
                  projectStatuses={projectStatuses}
                  actorRole={actorRole}
                  openCreateProjectTrigger={openCreateProjectTrigger}
                  onClearExternalTriggers={clearExternalTriggers}
                  onMutate={handleMutate}
                />
              )}

              {(activeModule === 'reports' || activeModule === 'settings') && (
                <ReportsAndSettingsModule
                  mode={activeModule}
                  state={crmState}
                  actorRole={actorRole}
                  onChangeActorRole={(newRole) => {
                    setActorRole(newRole);
                    showToast('success', `Switched active RBAC role to ${newRole.toUpperCase()}`);
                  }}
                  onMutate={handleMutate}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
