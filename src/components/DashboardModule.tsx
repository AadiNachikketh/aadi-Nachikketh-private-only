'use client';

import React, { useMemo } from 'react';
import {
  Plus,
  Bookmark,
  Upload,
  UserCheck,
  FolderPlus,
  UserPlus,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CrmState } from '../types/crm';
import { calculateProjectFinancials } from '../lib/crm-logic';

interface DashboardModuleProps {
  state: CrmState;
  onQuickAction: (
    actionType:
      | 'add_lead'
      | 'save_location'
      | 'import_spreadsheet'
      | 'assign_leads'
      | 'add_project'
      | 'add_team_member'
  ) => void;
  onNavigateModule: (mod: string) => void;
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#14B8A6'];

export default function DashboardModule({
  state,
  onQuickAction,
  onNavigateModule,
}: DashboardModuleProps) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const metrics = useMemo(() => {
    const activeLeads = state.leads.filter((l) => !l.isArchived);
    const totalGeoLocations = state.locations.length;
    const savedTargetLocations = state.savedLocations.length;
    const totalLeads = activeLeads.length;
    const leadsWithoutWebsites = activeLeads.filter((l) => l.websiteStatus === 'No Website').length;
    const leadsNotContacted = activeLeads.filter(
      (l) => l.status === 'New Lead' || l.status === 'Not Contacted'
    ).length;
    const leadsRequiringFollowUp = activeLeads.filter(
      (l) =>
        l.status === 'Follow-up Required' ||
        (l.nextFollowUpAt &&
          l.nextFollowUpAt <= todayStr &&
          l.status !== 'Deal Won' &&
          l.status !== 'Deal Lost')
    ).length;
    const interestedLeads = activeLeads.filter((l) =>
      ['Interested', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation'].includes(l.status)
    ).length;
    const wonDealsCount = activeLeads.filter((l) => l.status === 'Deal Won').length;

    const activeProjects = state.projects.filter(
      (p) => !['Completed', 'Delivered', 'Cancelled'].includes(p.status)
    ).length;
    const overdueProjects = state.projects.filter(
      (p) =>
        p.dueDate &&
        p.dueDate < todayStr &&
        !['Completed', 'Delivered', 'Cancelled'].includes(p.status)
    ).length;

    let recordedClientRevenue = 0;
    let clientPaymentsReceived = 0;
    let outstandingClientBalances = 0;
    let developerCosts = 0;
    let recordedProjectExpenses = 0;
    let estimatedProjectProfit = 0;

    for (const proj of state.projects) {
      const projPayments = state.payments.filter((pay) => pay.projectId === proj.id);
      const relatedComm = state.commissions.find(
        (c) => (proj.dealId && c.dealId === proj.dealId) || (proj.leadId && c.leadId === proj.leadId)
      );
      const fin = calculateProjectFinancials(proj, projPayments, relatedComm?.amount || 0);
      recordedClientRevenue += fin.projectRevenue;
      clientPaymentsReceived += fin.cashCollected;
      outstandingClientBalances += fin.outstandingClientBalance;
      developerCosts += fin.developerCost;
      recordedProjectExpenses += fin.otherProjectExpenses;
      estimatedProjectProfit += fin.estimatedProjectProfit;
    }

    const pendingOutreachCommissions = state.commissions
      .filter((c) => c.status === 'Pending' || c.status === 'Approved')
      .reduce((acc, c) => acc + c.amount, 0);

    return {
      totalGeoLocations,
      savedTargetLocations,
      totalLeads,
      leadsWithoutWebsites,
      leadsNotContacted,
      leadsRequiringFollowUp,
      interestedLeads,
      wonDealsCount,
      activeProjects,
      overdueProjects,
      recordedClientRevenue,
      clientPaymentsReceived,
      outstandingClientBalances,
      developerCosts,
      recordedProjectExpenses,
      estimatedProjectProfit,
      pendingOutreachCommissions,
    };
  }, [state, todayStr]);

  const leadsByCategoryData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of state.leads.filter((x) => !x.isArchived)) {
      counts.set(l.categoryName, (counts.get(l.categoryName) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [state.leads]);

  const leadsByLocationData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of state.leads.filter((x) => !x.isArchived)) {
      const locLabel = l.locality || l.city || l.country;
      counts.set(locLabel, (counts.get(locLabel) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [state.leads]);

  const leadsByStatusData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of state.leads.filter((x) => !x.isArchived)) {
      counts.set(l.status, (counts.get(l.status) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [state.leads]);

  const projectFinancialChartData = useMemo(() => {
    return state.projects.map((p) => {
      const projPayments = state.payments.filter((pay) => pay.projectId === p.id);
      const relatedComm = state.commissions.find(
        (c) => (p.dealId && c.dealId === p.dealId) || (p.leadId && c.leadId === p.leadId)
      );
      const fin = calculateProjectFinancials(p, projPayments, relatedComm?.amount || 0);
      return {
        name: p.clientName.split(' ').slice(0, 2).join(' '),
        Revenue: fin.projectRevenue,
        Collected: fin.cashCollected,
        Profit: fin.estimatedProjectProfit,
      };
    });
  }, [state.projects, state.payments, state.commissions]);

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar (Section 12.3) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Agency Operations Quick Actions</h2>
          <p className="text-xs text-slate-400">
            Jump straight into geographical targeting, lead acquisition, spreadsheet batching, or project execution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onQuickAction('add_lead')}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Lead
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('save_location')}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
            Add Location Target
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('import_spreadsheet')}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            Import Spreadsheet
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('assign_leads')}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 whitespace-nowrap"
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            Assign Leads
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('add_project')}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 whitespace-nowrap"
          >
            <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
            Add Project
          </button>
          <button
            type="button"
            onClick={() => onQuickAction('add_team_member')}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-300" />
            Add Team Member
          </button>
        </div>
      </div>

      {/* 17 Real Database KPI Metrics Organized into 2 Clean Grids (Section 12.1) */}
      <div className="space-y-3">
        <div className="text-xs font-medium text-slate-400">
          Geographical Targeting, CRM Pipeline & Delivery Workload
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Geo Locations</div>
            <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
              {metrics.totalGeoLocations}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Saved Targets</div>
            <div className="text-lg font-bold text-blue-400 font-mono tabular-nums mt-0.5">
              {metrics.savedTargetLocations}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Total Leads</div>
            <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
              {metrics.totalLeads}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">No Website</div>
            <div className="text-lg font-bold text-amber-400 font-mono tabular-nums mt-0.5">
              {metrics.leadsWithoutWebsites}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Not Contacted</div>
            <div className="text-lg font-bold text-slate-200 font-mono tabular-nums mt-0.5">
              {metrics.leadsNotContacted}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Follow-up Due</div>
            <div className="text-lg font-bold text-amber-400 font-mono tabular-nums mt-0.5">
              {metrics.leadsRequiringFollowUp}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Interested</div>
            <div className="text-lg font-bold text-blue-400 font-mono tabular-nums mt-0.5">
              {metrics.interestedLeads}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Won Deals</div>
            <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
              {metrics.wonDealsCount}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Active Projects</div>
            <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
              {metrics.activeProjects}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Overdue Projects</div>
            <div
              className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
                metrics.overdueProjects > 0 ? 'text-red-400' : 'text-slate-400'
              }`}
            >
              {metrics.overdueProjects}
            </div>
          </div>
        </div>

        {/* Financial Ledger KPI Strip */}
        <div className="text-xs font-medium text-slate-400 pt-1">
          Agency Financial Performance & Cash Flow (INR ₹ — Revenue vs Cash Collected vs Estimated Profit)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400">Agreed Client Revenue</div>
            <div className="text-lg font-bold text-white font-mono tabular-nums mt-1">
              ₹{metrics.recordedClientRevenue.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400">Cash Collected</div>
            <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-1">
              ₹{metrics.clientPaymentsReceived.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400">Client Balance Due</div>
            <div className="text-lg font-bold text-amber-400 font-mono tabular-nums mt-1">
              ₹{metrics.outstandingClientBalances.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400">Developer Costs</div>
            <div className="text-lg font-bold text-slate-200 font-mono tabular-nums mt-1">
              ₹{metrics.developerCosts.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400">Project Expenses</div>
            <div className="text-lg font-bold text-slate-300 font-mono tabular-nums mt-1">
              ₹{metrics.recordedProjectExpenses.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400">Pending Commissions</div>
            <div className="text-lg font-bold text-blue-400 font-mono tabular-nums mt-1">
              ₹{metrics.pendingOutreachCommissions.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs text-slate-400">Est. Project Profit</div>
            <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-1">
              ₹{metrics.estimatedProjectProfit.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Live Database Charts Grid (Section 12.2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-200 mb-3">
            Leads by Target Locality / City
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadsByLocationData}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {leadsByLocationData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-200 mb-3">
            Leads by Pipeline Status
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadsByStatusData}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-200 mb-3">
            Project Revenue vs Cash Collected vs Profit (₹)
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectFinancialChartData}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    fontSize: '12px',
                    color: '#F8FAFC',
                  }}
                />
                <Bar dataKey="Revenue" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Collected" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Profit" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Split: Saved Target Locations Snapshot & Chronological Recent Activity Feed (Section 12.4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white">Active Target Locations</h3>
            <button
              type="button"
              onClick={() => onNavigateModule('locations')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Manage Target Locations
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {state.savedLocations.slice(0, 5).map((sLoc) => {
              const geo = state.locations.find((l) => l.id === sLoc.locationId);
              if (!geo) return null;
              return (
                <div
                  key={sLoc.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">
                      {geo.name}{' '}
                      <span className="text-slate-400 font-normal">
                        · {sLoc.targetCategories || 'All Categories'}
                      </span>
                    </div>
                    <div className="text-slate-500 mt-0.5">{sLoc.notes}</div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-emerald-400 font-medium">{sLoc.status}</div>
                    <div className="text-slate-500 font-mono tabular-nums">
                      Priority: {sLoc.priority}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white">
              Chronological Recent Activity Feed
            </h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              Live PostgreSQL Log
            </span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {state.activities.slice(0, 6).map((act) => {
              const relatedLead = state.leads.find((l) => l.id === act.leadId);
              return (
                <div
                  key={`act-${act.id}`}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {act.activityType}: {relatedLead?.businessName || `Lead #${act.leadId}`}
                    </span>
                    <span className="text-slate-500 font-mono tabular-nums">{act.occurredAt}</span>
                  </div>
                  <div className="text-slate-300">
                    Outcome: <span className="text-blue-400">{act.outcome}</span> — {act.notes}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
