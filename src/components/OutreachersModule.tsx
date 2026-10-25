'use client';

import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  PhoneCall,
  Award,
  IndianRupee,
  CheckCircle2,
  Edit3,
  Download,
  X,
} from 'lucide-react';
import {
  UserProfile,
  LeadRecord,
  LeadActivityRecord,
  DealRecord,
  CommissionRecord,
} from '../types/crm';
import { exportRecordsToFile } from '../utils/spreadsheet';

interface OutreachersModuleProps {
  outreachers: UserProfile[];
  leads: LeadRecord[];
  activities: LeadActivityRecord[];
  deals: DealRecord[];
  commissions: CommissionRecord[];
  actorRole: string;
  onMutate: (action: string, payload: Record<string, unknown>, successMsg?: string) => Promise<void>;
}

export default function OutreachersModule({
  outreachers,
  leads,
  activities,
  deals,
  commissions,
  actorRole,
  onMutate,
}: OutreachersModuleProps) {
  const [selectedOutreacherId, setSelectedOutreacherId] = useState<string>('ALL');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<UserProfile>>({
    fullName: '',
    email: '',
    phone: '',
    role: 'outreacher',
    accountStatus: 'Active',
    languagesSpoken: 'English, Hindi, Kannada',
    startDate: new Date().toISOString().slice(0, 10),
    assignedLocations: 'Whitefield, Indiranagar',
    assignedCategories: 'Jewellery Stores',
    commissionType: 'fixed',
    commissionRate: 1000,
    notes: '',
  });

  const outreacherMetrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return outreachers.map((o) => {
      const assignedLeads = leads.filter((l) => !l.isArchived && l.assignedOutreacherId === o.id);
      const contactedLeads = assignedLeads.filter(
        (l) => l.status !== 'New Lead' && l.status !== 'Not Contacted'
      );
      const followUpsDue = assignedLeads.filter(
        (l) => l.nextFollowUpAt && l.nextFollowUpAt <= today && l.status !== 'Deal Won' && l.status !== 'Deal Lost'
      );
      const interestedLeads = assignedLeads.filter((l) =>
        ['Interested', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Deal Won'].includes(l.status)
      );
      const meetingsBooked = assignedLeads.filter((l) =>
        ['Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Deal Won'].includes(l.status)
      );
      const wonLeads = assignedLeads.filter((l) => l.status === 'Deal Won');
      const dealRevenue = wonLeads.reduce((acc, l) => acc + (l.agreedDealValue || l.estimatedDealValue || 0), 0);

      const memberActivities = activities.filter(
        (a) => a.userId === o.id || a.userName.toLowerCase() === o.fullName.toLowerCase()
      );
      const callsMade = memberActivities.filter((a) => a.activityType === 'Phone Call').length;
      const messagesSent = memberActivities.filter(
        (a) => a.activityType === 'WhatsApp Message' || a.activityType === 'Email'
      ).length;

      const memberCommissions = commissions.filter(
        (c) => c.outreacherId === o.id && c.status !== 'Cancelled'
      );
      const commissionEarned = memberCommissions.reduce((acc, c) => acc + c.amount, 0);
      const commissionPaid = memberCommissions
        .filter((c) => c.status === 'Paid')
        .reduce((acc, c) => acc + c.amount, 0);
      const commissionPending = memberCommissions
        .filter((c) => c.status === 'Pending' || c.status === 'Approved')
        .reduce((acc, c) => acc + c.amount, 0);

      // Safe conversion denominator (Won Deals / Assigned Leads)
      const conversionRate =
        assignedLeads.length > 0
          ? ((wonLeads.length / assignedLeads.length) * 100).toFixed(1)
          : '0.0';

      return {
        profile: o,
        assignedCount: assignedLeads.length,
        contactedCount: contactedLeads.length,
        followUpsDueCount: followUpsDue.length,
        interestedCount: interestedLeads.length,
        meetingsCount: meetingsBooked.length,
        wonCount: wonLeads.length,
        dealRevenue,
        callsMade,
        messagesSent,
        commissionEarned,
        commissionPaid,
        commissionPending,
        conversionRate,
      };
    });
  }, [outreachers, leads, activities, commissions]);

  const filteredMetrics = useMemo(() => {
    if (selectedOutreacherId === 'ALL') return outreacherMetrics;
    return outreacherMetrics.filter((m) => String(m.profile.id) === selectedOutreacherId);
  }, [outreacherMetrics, selectedOutreacherId]);

  const totals = useMemo(() => {
    return filteredMetrics.reduce(
      (acc, m) => ({
        assigned: acc.assigned + m.assignedCount,
        contacted: acc.contacted + m.contactedCount,
        followUps: acc.followUps + m.followUpsDueCount,
        interested: acc.interested + m.interestedCount,
        meetings: acc.meetings + m.meetingsCount,
        won: acc.won + m.wonCount,
        revenue: acc.revenue + m.dealRevenue,
        earned: acc.earned + m.commissionEarned,
        paid: acc.paid + m.commissionPaid,
        pending: acc.pending + m.commissionPending,
      }),
      {
        assigned: 0,
        contacted: 0,
        followUps: 0,
        interested: 0,
        meetings: 0,
        won: 0,
        revenue: 0,
        earned: 0,
        paid: 0,
        pending: 0,
      }
    );
  }, [filteredMetrics]);

  const filteredCommissions = useMemo(() => {
    if (selectedOutreacherId === 'ALL') return commissions;
    return commissions.filter((c) => String(c.outreacherId) === selectedOutreacherId);
  }, [commissions, selectedOutreacherId]);

  const dealMap = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals]);
  const outreacherMap = useMemo(() => new Map(outreachers.map((o) => [o.id, o])), [outreachers]);

  const handleSaveOutreacher = async (e: React.FormEvent) => {
    e.preventDefault();
    await onMutate(
      'UPSERT_TEAM_MEMBER',
      {
        ...editingProfile,
        role: 'outreacher',
      },
      editingProfile.id
        ? `Updated outreacher profile: ${editingProfile.fullName}`
        : `Created outreacher profile: ${editingProfile.fullName}`
    );
    setProfileModalOpen(false);
  };

  const handleExportPerformance = () => {
    exportRecordsToFile(
      outreacherMetrics,
      [
        { key: 'name', label: 'Outreacher Name', getValue: (m) => m.profile.fullName },
        { key: 'email', label: 'Email', getValue: (m) => m.profile.email },
        { key: 'assigned', label: 'Leads Assigned', getValue: (m) => m.assignedCount },
        { key: 'contacted', label: 'Leads Contacted', getValue: (m) => m.contactedCount },
        { key: 'interested', label: 'Interested Prospects', getValue: (m) => m.interestedCount },
        { key: 'won', label: 'Deals Won', getValue: (m) => m.wonCount },
        { key: 'conversion', label: 'Conversion Rate (%)', getValue: (m) => `${m.conversionRate}%` },
        { key: 'revenue', label: 'Recorded Deal Revenue (INR)', getValue: (m) => m.dealRevenue },
        { key: 'earned', label: 'Commission Earned (INR)', getValue: (m) => m.commissionEarned },
        { key: 'paid', label: 'Commission Paid (INR)', getValue: (m) => m.commissionPaid },
      ],
      'outreacher_performance',
      'xlsx'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            aria-label="Filter by Outreacher"
            value={selectedOutreacherId}
            onChange={(e) => setSelectedOutreacherId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
          >
            <option value="ALL">All Sales Outreachers ({outreachers.length})</option>
            {outreachers.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportPerformance}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export Outreacher Performance
          </button>

          {actorRole === 'admin' && (
            <button
              type="button"
              onClick={() => {
                setEditingProfile({
                  fullName: '',
                  email: '',
                  phone: '',
                  role: 'outreacher',
                  accountStatus: 'Active',
                  languagesSpoken: 'English, Hindi, Kannada',
                  startDate: new Date().toISOString().slice(0, 10),
                  assignedLocations: 'Whitefield',
                  assignedCategories: 'Jewellery Stores',
                  commissionType: 'fixed',
                  commissionRate: 1000,
                  notes: '',
                });
                setProfileModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Outreacher
            </button>
          )}
        </div>
      </div>

      {/* Outreacher Performance Summary Strip (Section 8.4) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Leads Assigned</div>
          <div className="text-xl font-bold text-white font-mono tabular-nums mt-1">{totals.assigned}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Leads Contacted</div>
          <div className="text-xl font-bold text-blue-400 font-mono tabular-nums mt-1">{totals.contacted}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Follow-ups Due</div>
          <div className="text-xl font-bold text-amber-400 font-mono tabular-nums mt-1">{totals.followUps}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Interested</div>
          <div className="text-xl font-bold text-white font-mono tabular-nums mt-1">{totals.interested}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Deals Won</div>
          <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-1">{totals.won}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Deal Revenue</div>
          <div className="text-lg font-bold text-white font-mono tabular-nums mt-1">
            ₹{totals.revenue.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Commission Earned</div>
          <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-1">
            ₹{totals.earned.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs text-slate-400">Commission Paid</div>
          <div className="text-lg font-bold text-blue-400 font-mono tabular-nums mt-1">
            ₹{totals.paid.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Outreacher Roster & Performance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">
          Outreacher Roster, Territory Assignments & Conversion Rates
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400">
                <th className="py-2.5 px-3 font-medium">Outreacher & Languages</th>
                <th className="py-2.5 px-3 font-medium">Assigned Locations & Categories</th>
                <th className="py-2.5 px-3 font-medium">Commission Rule</th>
                <th className="py-2.5 px-3 font-medium text-right">Assigned / Contacted</th>
                <th className="py-2.5 px-3 font-medium text-right">Calls / Messages</th>
                <th className="py-2.5 px-3 font-medium text-right">Won Deals (Conv %)</th>
                <th className="py-2.5 px-3 font-medium text-right">Earned / Paid</th>
                <th className="py-2.5 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {filteredMetrics.map((m) => (
                <tr key={m.profile.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white">{m.profile.fullName}</div>
                    <div className="text-xs text-slate-400">
                      {m.profile.email} · {m.profile.languagesSpoken || 'English'}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-300">
                    <div>Locations: <span className="text-white">{m.profile.assignedLocations || 'All'}</span></div>
                    <div className="text-slate-400">Categories: {m.profile.assignedCategories || 'All'}</div>
                  </td>
                  <td className="py-3 px-3 text-xs font-mono tabular-nums text-slate-200">
                    {m.profile.commissionType === 'percentage'
                      ? `${m.profile.commissionRate}% of Deal Value`
                      : `Fixed ₹${m.profile.commissionRate.toLocaleString('en-IN')} / Deal`}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-slate-200">
                    {m.assignedCount} / {m.contactedCount}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-slate-300">
                    {m.callsMade} calls · {m.messagesSent} msgs
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-xs">
                    <span className="text-emerald-400 font-semibold">{m.wonCount} won</span>{' '}
                    <span className="text-slate-400">({m.conversionRate}%)</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-xs">
                    <div className="text-white font-semibold">₹{m.commissionEarned.toLocaleString('en-IN')}</div>
                    <div className="text-slate-400">Paid: ₹{m.commissionPaid.toLocaleString('en-IN')}</div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {actorRole === 'admin' && (
                      <button
                        type="button"
                        aria-label={`Edit ${m.profile.fullName}`}
                        onClick={() => {
                          setEditingProfile({ ...m.profile });
                          setProfileModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commission Calculation & Payout Ledger (Section 8.5) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">
              Outreacher Commission Ledger (Single-Entry per Won Deal)
            </h2>
            <p className="text-xs text-slate-400">
              Each qualifying won deal generates exactly one transaction-safe commission record. Outreachers cannot approve or pay their own commissions.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            {filteredCommissions.length} Commission Entries
          </span>
        </div>

        {filteredCommissions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No commission entries recorded yet. Mark an assigned lead as &ldquo;Deal Won&rdquo; in the CRM to automatically calculate commission.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-2.5 px-3 font-medium">Related Won Deal</th>
                  <th className="py-2.5 px-3 font-medium">Outreacher</th>
                  <th className="py-2.5 px-3 font-medium">Calculation Basis</th>
                  <th className="py-2.5 px-3 font-medium text-right">Commission Amount</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium">Payment Date</th>
                  <th className="py-2.5 px-3 font-medium text-right">Admin Authorization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {filteredCommissions.map((comm) => {
                  const deal = dealMap.get(comm.dealId);
                  const outreacher = outreacherMap.get(comm.outreacherId);
                  return (
                    <tr key={comm.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3">
                        <div className="font-medium text-white">
                          {deal?.dealName || `Deal #${comm.dealId}`}
                        </div>
                        <div className="text-xs text-slate-400 font-mono tabular-nums">
                          Agreed Deal Value: ₹{(deal?.agreedValue || 0).toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-200">
                        {outreacher?.fullName || `Outreacher #${comm.outreacherId}`}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-300 font-mono tabular-nums">
                        {comm.calculationBasis}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-emerald-400">
                        ₹{comm.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-xs">
                        <span
                          className={
                            comm.status === 'Paid'
                              ? 'text-emerald-400 font-semibold'
                              : comm.status === 'Approved'
                              ? 'text-blue-400 font-semibold'
                              : comm.status === 'Cancelled'
                              ? 'text-red-400'
                              : 'text-amber-400'
                          }
                        >
                          {comm.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs font-mono tabular-nums text-slate-400">
                        {comm.paidAt || '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {actorRole === 'admin' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {comm.status === 'Pending' && (
                              <button
                                type="button"
                                onClick={() =>
                                  onMutate(
                                    'UPDATE_COMMISSION_STATUS',
                                    { id: comm.id, status: 'Approved' },
                                    `Approved ₹${comm.amount.toLocaleString('en-IN')} commission`
                                  )
                                }
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
                              >
                                Approve
                              </button>
                            )}
                            {(comm.status === 'Pending' || comm.status === 'Approved') && (
                              <button
                                type="button"
                                onClick={() =>
                                  onMutate(
                                    'UPDATE_COMMISSION_STATUS',
                                    { id: comm.id, status: 'Paid' },
                                    `Marked commission #${comm.id} as Paid and recorded payout`
                                  )
                                }
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Admin Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Outreacher Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Outreacher Profile Modal"
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-semibold text-white">
                {editingProfile.id ? 'Edit Outreacher Profile' : 'Add Sales Outreacher'}
              </h3>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOutreacher} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingProfile.fullName || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={editingProfile.email || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingProfile.phone || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Languages Spoken</label>
                  <input
                    type="text"
                    value={editingProfile.languagesSpoken || ''}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, languagesSpoken: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Commission Model</label>
                  <select
                    value={editingProfile.commissionType || 'fixed'}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, commissionType: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="fixed">Fixed INR per Won Deal</option>
                    <option value="percentage">Percentage (%) of Deal Value</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    {editingProfile.commissionType === 'percentage'
                      ? 'Commission Percentage (%)'
                      : 'Fixed Commission (₹)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingProfile.commissionRate ?? 1000}
                    onChange={(e) =>
                      setEditingProfile({ ...editingProfile, commissionRate: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Assigned Locations</label>
                <input
                  type="text"
                  value={editingProfile.assignedLocations || ''}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, assignedLocations: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Assigned Categories</label>
                <input
                  type="text"
                  value={editingProfile.assignedCategories || ''}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, assignedCategories: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
                >
                  Save Outreacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
