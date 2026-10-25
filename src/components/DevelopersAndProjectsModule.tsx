'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  UserPlus,
  Code2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  IndianRupee,
  LayoutGrid,
  List,
  Download,
  Edit3,
  X,
} from 'lucide-react';
import {
  UserProfile,
  ProjectRecord,
  ProjectTaskRecord,
  PaymentRecord,
  CommissionRecord,
  LeadRecord,
} from '../types/crm';
import { calculateProjectFinancials } from '../lib/crm-logic';
import { exportRecordsToFile } from '../utils/spreadsheet';

interface DevelopersAndProjectsModuleProps {
  mode: 'developers' | 'projects';
  developers: UserProfile[];
  projects: ProjectRecord[];
  tasks: ProjectTaskRecord[];
  payments: PaymentRecord[];
  commissions: CommissionRecord[];
  leads: LeadRecord[];
  projectStatuses: string[];
  actorRole: string;
  openCreateProjectTrigger?: { open: boolean; lead?: LeadRecord } | null;
  onClearExternalTriggers?: () => void;
  onMutate: (action: string, payload: Record<string, unknown>, successMsg?: string) => Promise<void>;
}

const TASK_STATUSES = ['To Do', 'In Progress', 'Blocked', 'In Review', 'Completed'];

export default function DevelopersAndProjectsModule({
  mode,
  developers,
  projects,
  tasks,
  payments,
  commissions,
  leads,
  projectStatuses,
  actorRole,
  openCreateProjectTrigger,
  onClearExternalTriggers,
  onMutate,
}: DevelopersAndProjectsModuleProps) {
  const [filterDeveloperId, setFilterDeveloperId] = useState('ALL');
  const [filterProjectStatus, setFilterProjectStatus] = useState('ALL');
  const [filterDeadline, setFilterDeadline] = useState('ALL');
  const [taskViewMode, setTaskViewMode] = useState<'kanban' | 'list'>('kanban');

  // Developer Profile Modal
  const [devModalOpen, setDevModalOpen] = useState(false);
  const [editingDev, setEditingDev] = useState<Partial<UserProfile>>({
    fullName: '',
    email: '',
    phone: '',
    role: 'developer',
    accountStatus: 'Active',
    skills: 'Next.js, React, TypeScript, Tailwind CSS',
    specialities: 'Luxury Showrooms & E-commerce',
    employmentStatus: 'Contractor',
    paymentArrangement: '₹12,000 per standard project',
    notes: '',
  });

  // Project Modal
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<ProjectRecord>>({
    clientName: '',
    projectName: '',
    description: '',
    requirements: '',
    status: 'Not Started',
    priority: 'High',
    assignedDeveloperId: developers[0]?.id || null,
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
    agreedPrice: 55000,
    agreedDeveloperCost: 12000,
    otherExpenses: 1500,
    clientFeedback: '',
    revisionCount: 0,
    notes: '',
  });

  // Task Modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<ProjectTaskRecord>>({
    projectId: projects[0]?.id || 1,
    title: '',
    description: '',
    status: 'To Do',
    priority: 'High',
    assignedDeveloperId: developers[0]?.id || null,
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
  });

  // Payment Record Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    projectId: projects[0]?.id ? String(projects[0].id) : '',
    payerOrPayee: '',
    paymentDirection: 'inbound_client',
    paymentType: 'Advance',
    amount: 25000,
    paidAt: new Date().toISOString().slice(0, 10),
    reference: `UTR-${Date.now().toString().slice(-6)}`,
    notes: '',
  });
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    if (openCreateProjectTrigger?.open) {
      const lead = openCreateProjectTrigger.lead;
      setEditingProject({
        leadId: lead?.id || null,
        clientName: lead?.businessName || '',
        projectName: lead ? `${lead.businessName} — Official Website` : '',
        description: lead?.notes || '',
        requirements: '1. Mobile-first responsive design\n2. WhatsApp & Call integration\n3. Local SEO & Google Maps embed',
        status: 'Requirements Collected',
        priority: 'High',
        assignedDeveloperId: developers[0]?.id || null,
        startDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
        agreedPrice: lead?.agreedDealValue || lead?.estimatedDealValue || 50000,
        agreedDeveloperCost: 12000,
        otherExpenses: 1500,
        clientFeedback: '',
        revisionCount: 0,
        notes: '',
      });
      setProjectModalOpen(true);
      onClearExternalTriggers?.();
    }
  }, [openCreateProjectTrigger, developers, onClearExternalTriggers]);

  const devMap = useMemo(() => new Map(developers.map((d) => [d.id, d])), [developers]);
  const projMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Compute financial summary for every project
  const projectsWithFinancials = useMemo(() => {
    return projects.map((proj) => {
      const projPayments = payments.filter((pay) => pay.projectId === proj.id);
      const relatedComm = commissions.find(
        (c) => (proj.dealId && c.dealId === proj.dealId) || (proj.leadId && c.leadId === proj.leadId)
      );
      const fin = calculateProjectFinancials(proj, projPayments, relatedComm?.amount || 0);
      const isOverdue =
        Boolean(proj.dueDate && proj.dueDate < todayStr) &&
        proj.status !== 'Completed' &&
        proj.status !== 'Delivered' &&
        proj.status !== 'Cancelled';

      return {
        project: proj,
        financials: fin,
        isOverdue,
      };
    });
  }, [projects, payments, commissions, todayStr]);

  const filteredProjects = useMemo(() => {
    return projectsWithFinancials.filter(({ project, isOverdue }) => {
      if (filterDeveloperId !== 'ALL' && String(project.assignedDeveloperId) !== filterDeveloperId) {
        return false;
      }
      if (filterProjectStatus !== 'ALL' && project.status !== filterProjectStatus) {
        return false;
      }
      if (filterDeadline === 'OVERDUE' && !isOverdue) return false;
      if (filterDeadline === 'TODAY' && project.dueDate !== todayStr) return false;
      if (
        filterDeadline === 'COMPLETED' &&
        project.status !== 'Completed' &&
        project.status !== 'Delivered'
      ) {
        return false;
      }
      return true;
    });
  }, [projectsWithFinancials, filterDeveloperId, filterProjectStatus, filterDeadline, todayStr]);

  const developerWorkloads = useMemo(() => {
    return developers.map((dev) => {
      const devProjects = projectsWithFinancials.filter(
        (p) => p.project.assignedDeveloperId === dev.id
      );
      const activeCount = devProjects.filter(
        (p) => !['Completed', 'Delivered', 'Cancelled'].includes(p.project.status)
      ).length;
      const inDevCount = devProjects.filter((p) =>
        ['Design in Progress', 'Development in Progress', 'Revisions'].includes(p.project.status)
      ).length;
      const awaitingFeedbackCount = devProjects.filter(
        (p) => p.project.status === 'Client Review'
      ).length;
      const overdueCount = devProjects.filter((p) => p.isOverdue).length;
      const completedCount = devProjects.filter((p) =>
        ['Completed', 'Delivered'].includes(p.project.status)
      ).length;
      const totalPaid = devProjects.reduce((acc, p) => acc + p.financials.developerPayments, 0);

      return {
        dev,
        activeCount,
        inDevCount,
        awaitingFeedbackCount,
        overdueCount,
        completedCount,
        totalPaid,
      };
    });
  }, [developers, projectsWithFinancials]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterDeveloperId !== 'ALL' && String(t.assignedDeveloperId) !== filterDeveloperId) {
        return false;
      }
      return true;
    });
  }, [tasks, filterDeveloperId]);

  const handleSaveDevProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await onMutate(
      'UPSERT_TEAM_MEMBER',
      { ...editingDev, role: 'developer' },
      editingDev.id
        ? `Updated developer profile: ${editingDev.fullName}`
        : `Created developer profile: ${editingDev.fullName}`
    );
    setDevModalOpen(false);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await onMutate(
      'UPSERT_PROJECT',
      editingProject as Record<string, unknown>,
      editingProject.id
        ? `Updated project: ${editingProject.projectName}`
        : `Created website project: ${editingProject.projectName}`
    );
    setProjectModalOpen(false);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    await onMutate(
      'UPSERT_PROJECT_TASK',
      editingTask as Record<string, unknown>,
      `Saved task: ${editingTask.title}`
    );
    setTaskModalOpen(false);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    if (!newPayment.payerOrPayee.trim() || !newPayment.reference.trim()) {
      setPaymentError('Payer/Payee and Reference Number are required.');
      return;
    }
    if (Number(newPayment.amount) <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }
    try {
      await onMutate(
        'ADD_PAYMENT',
        {
          ...newPayment,
          projectId: newPayment.projectId ? Number(newPayment.projectId) : null,
          amount: Number(newPayment.amount),
        },
        `Recorded ₹${Number(newPayment.amount).toLocaleString('en-IN')} payment (${newPayment.paymentType})`
      );
      setPaymentModalOpen(false);
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : 'Failed to record payment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter by Developer"
            value={filterDeveloperId}
            onChange={(e) => setFilterDeveloperId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
          >
            <option value="ALL">All Developers ({developers.length})</option>
            {developers.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.fullName}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Project Status"
            value={filterProjectStatus}
            onChange={(e) => setFilterProjectStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
          >
            <option value="ALL">All Project Statuses</option>
            {projectStatuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Deadline"
            value={filterDeadline}
            onChange={(e) => setFilterDeadline(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
          >
            <option value="ALL">All Deadlines</option>
            <option value="OVERDUE">Overdue Projects Only</option>
            <option value="TODAY">Due Today</option>
            <option value="COMPLETED">Completed / Delivered</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingProject({
                clientName: '',
                projectName: '',
                description: '',
                requirements: '',
                status: 'Not Started',
                priority: 'High',
                assignedDeveloperId: developers[0]?.id || null,
                startDate: todayStr,
                dueDate: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
                agreedPrice: 55000,
                agreedDeveloperCost: 12000,
                otherExpenses: 1500,
                clientFeedback: '',
                revisionCount: 0,
                notes: '',
              });
              setProjectModalOpen(true);
            }}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Website Project
          </button>

          {actorRole === 'admin' && (
            <>
              <button
                type="button"
                onClick={() => {
                  const firstProj = projects[0];
                  setNewPayment({
                    projectId: firstProj ? String(firstProj.id) : '',
                    payerOrPayee: firstProj ? firstProj.clientName : '',
                    paymentDirection: 'inbound_client',
                    paymentType: 'Milestone',
                    amount: 20000,
                    paidAt: todayStr,
                    reference: `UTR-${Date.now().toString().slice(-6)}`,
                    notes: '',
                  });
                  setPaymentError('');
                  setPaymentModalOpen(true);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5"
              >
                <IndianRupee className="w-3.5 h-3.5" />
                Record Payment
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingDev({
                    fullName: '',
                    email: '',
                    phone: '',
                    role: 'developer',
                    accountStatus: 'Active',
                    skills: 'Next.js, React, TypeScript, Tailwind CSS',
                    specialities: 'Luxury Showrooms & E-commerce',
                    employmentStatus: 'Contractor',
                    paymentArrangement: '₹12,000 per project',
                    notes: '',
                  });
                  setDevModalOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Developer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Developer Roster & Workload Section (Section 9) */}
      {mode === 'developers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-white">
                Website Developers & Active Workload Matrix
              </h2>
              <p className="text-xs text-slate-400">
                Tracks skills, contractor arrangements, active development load, overdue projects, and recorded payouts.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                exportRecordsToFile(
                  developerWorkloads,
                  [
                    { key: 'name', label: 'Developer Name', getValue: (w) => w.dev.fullName },
                    { key: 'skills', label: 'Skills', getValue: (w) => w.dev.skills || '' },
                    { key: 'status', label: 'Employment Type', getValue: (w) => w.dev.employmentStatus || '' },
                    { key: 'active', label: 'Active Projects', getValue: (w) => w.activeCount },
                    { key: 'overdue', label: 'Overdue Projects', getValue: (w) => w.overdueCount },
                    { key: 'completed', label: 'Completed Projects', getValue: (w) => w.completedCount },
                    { key: 'paid', label: 'Recorded Payouts (INR)', getValue: (w) => w.totalPaid },
                  ],
                  'developer_workloads',
                  'xlsx'
                )
              }
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export Workloads
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-2.5 px-3 font-medium">Developer & Status</th>
                  <th className="py-2.5 px-3 font-medium">Skills & Specialities</th>
                  <th className="py-2.5 px-3 font-medium">Payment Arrangement</th>
                  <th className="py-2.5 px-3 font-medium text-right">Active / In Dev</th>
                  <th className="py-2.5 px-3 font-medium text-right">Client Review</th>
                  <th className="py-2.5 px-3 font-medium text-right">Overdue</th>
                  <th className="py-2.5 px-3 font-medium text-right">Completed</th>
                  <th className="py-2.5 px-3 font-medium text-right">Recorded Payouts</th>
                  <th className="py-2.5 px-3 font-medium text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {developerWorkloads.map((w) => (
                  <tr key={w.dev.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{w.dev.fullName}</div>
                      <div className="text-xs text-slate-400">
                        {w.dev.employmentStatus || 'Contractor'} · {w.dev.email}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-300">
                      <div className="text-white">{w.dev.specialities}</div>
                      <div className="text-slate-500">{w.dev.skills}</div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-300">{w.dev.paymentArrangement}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-white">
                      {w.activeCount} active ({w.inDevCount} dev)
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-blue-400">
                      {w.awaitingFeedbackCount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs">
                      <span className={w.overdueCount > 0 ? 'text-red-400 font-semibold' : 'text-slate-500'}>
                        {w.overdueCount}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-emerald-400">
                      {w.completedCount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-white">
                      ₹{w.totalPaid.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {actorRole === 'admin' && (
                        <button
                          type="button"
                          aria-label={`Edit ${w.dev.fullName}`}
                          onClick={() => {
                            setEditingDev({ ...w.dev });
                            setDevModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-white"
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
      )}

      {/* Website Projects & Financial Profitability Table (Sections 10 & 11) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">
              Website Projects, Deadlines & Financial Profitability
            </h2>
            <p className="text-xs text-slate-400">
              Project completion, client payment collection, and delivery are tracked independently.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            {filteredProjects.length} Projects Shown
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400">
                <th className="py-2.5 px-3 font-medium">Project & Client</th>
                <th className="py-2.5 px-3 font-medium">Developer</th>
                <th className="py-2.5 px-3 font-medium">Workflow Status</th>
                <th className="py-2.5 px-3 font-medium">Deadline</th>
                <th className="py-2.5 px-3 font-medium text-right">Agreed Price</th>
                <th className="py-2.5 px-3 font-medium text-right">Cash Collected / Balance</th>
                <th className="py-2.5 px-3 font-medium text-right">Dev Cost (Paid)</th>
                <th className="py-2.5 px-3 font-medium text-right">Est. Profit</th>
                <th className="py-2.5 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {filteredProjects.map(({ project, financials, isOverdue }) => {
                const dev = project.assignedDeveloperId
                  ? devMap.get(project.assignedDeveloperId)
                  : undefined;

                return (
                  <tr key={project.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{project.projectName}</div>
                      <div className="text-xs text-slate-400">
                        Client: <span className="text-slate-200">{project.clientName}</span> · Revisions:{' '}
                        {project.revisionCount}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-300">
                      {dev ? dev.fullName : 'Unassigned'}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        aria-label={`Status for ${project.projectName}`}
                        value={project.status}
                        onChange={(e) =>
                          onMutate(
                            'UPSERT_PROJECT',
                            { ...project, status: e.target.value },
                            `Updated ${project.projectName} status to ${e.target.value}`
                          )
                        }
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                      >
                        {projectStatuses.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono tabular-nums">
                      <div className={isOverdue ? 'text-red-400 font-semibold' : 'text-slate-200'}>
                        {project.dueDate || 'TBD'}
                      </div>
                      {isOverdue && <div className="text-[11px] text-red-400">OVERDUE</div>}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs text-white font-semibold">
                      ₹{financials.projectRevenue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs">
                      <div className="text-emerald-400">
                        ₹{financials.cashCollected.toLocaleString('en-IN')} rcvd
                      </div>
                      <div className="text-amber-400 text-[11px]">
                        ₹{financials.outstandingClientBalance.toLocaleString('en-IN')} due
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs">
                      <div className="text-slate-200">
                        ₹{financials.developerCost.toLocaleString('en-IN')}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Paid: ₹{financials.developerPayments.toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs font-semibold text-emerald-400">
                      ₹{financials.estimatedProjectProfit.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        aria-label={`Edit ${project.projectName}`}
                        onClick={() => {
                          setEditingProject({ ...project });
                          setProjectModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Tasks Kanban Board & Task List (Section 9.4) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              Project Tasks & Milestones ({filteredTasks.length})
            </h2>
            <p className="text-xs text-slate-400">
              Manage engineering deliverables across Kanban stages or structured list view.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setTaskViewMode('kanban')}
                className={`px-2.5 py-1 text-xs rounded-md flex items-center gap-1 ${
                  taskViewMode === 'kanban' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Kanban Board
              </button>
              <button
                type="button"
                onClick={() => setTaskViewMode('list')}
                className={`px-2.5 py-1 text-xs rounded-md flex items-center gap-1 ${
                  taskViewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Task List
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingTask({
                  projectId: projects[0]?.id || 1,
                  title: '',
                  description: '',
                  status: 'To Do',
                  priority: 'High',
                  assignedDeveloperId: developers[0]?.id || null,
                  dueDate: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10),
                });
                setTaskModalOpen(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
            >
              + Add Task
            </button>
          </div>
        </div>

        {taskViewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {TASK_STATUSES.map((colStatus) => {
              const colTasks = filteredTasks.filter((t) => t.status === colStatus);
              return (
                <div
                  key={colStatus}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pb-2 border-b border-slate-800">
                    <span>{colStatus}</span>
                    <span className="font-mono tabular-nums text-slate-500">{colTasks.length}</span>
                  </div>

                  {colTasks.map((task) => {
                    const proj = projMap.get(task.projectId);
                    const dev = task.assignedDeveloperId
                      ? devMap.get(task.assignedDeveloperId)
                      : undefined;
                    return (
                      <div
                        key={task.id}
                        className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2"
                      >
                        <div className="text-xs font-semibold text-white">{task.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {proj?.projectName || `Project #${task.projectId}`}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{dev?.fullName || 'Unassigned'}</span>
                          <span className="font-mono tabular-nums">{task.dueDate || ''}</span>
                        </div>
                        <select
                          aria-label={`Task status for ${task.title}`}
                          value={task.status}
                          onChange={(e) =>
                            onMutate(
                              'UPSERT_PROJECT_TASK',
                              { ...task, status: e.target.value },
                              `Moved task "${task.title}" to ${e.target.value}`
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200"
                        >
                          {TASK_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-3">Task Title</th>
                  <th className="py-2 px-3">Website Project</th>
                  <th className="py-2 px-3">Assigned Developer</th>
                  <th className="py-2 px-3">Priority</th>
                  <th className="py-2 px-3">Due Date</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredTasks.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5 px-3 font-medium text-white">{t.title}</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {projMap.get(t.projectId)?.projectName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {t.assignedDeveloperId ? devMap.get(t.assignedDeveloperId)?.fullName : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{t.priority}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300">
                      {t.dueDate || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-blue-400">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recorded Payments Ledger (Section 11.2) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-3">
          Recorded Client & Developer Payments Ledger
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Payer / Payee</th>
                <th className="py-2.5 px-3">Related Project</th>
                <th className="py-2.5 px-3">Direction & Type</th>
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3 text-right">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {payments.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-300">{pay.paidAt}</td>
                  <td className="py-2.5 px-3 font-medium text-white">{pay.payerOrPayee}</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {pay.projectId ? projMap.get(pay.projectId)?.projectName : 'Agency Commission'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {pay.paymentType} ({pay.paymentDirection === 'inbound_client' ? 'Inbound' : 'Outbound'})
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-400">{pay.reference}</td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono tabular-nums font-semibold ${
                      pay.paymentDirection === 'inbound_client' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {pay.paymentDirection === 'inbound_client' ? '+' : '-'}₹
                    {pay.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Project Modal */}
      {projectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-label="Website Project Modal"
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-semibold text-white">
                {editingProject.id ? 'Edit Website Project' : 'Create Website Project'}
              </h3>
              <button
                type="button"
                onClick={() => setProjectModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    aria-label="Project Name"
                    value={editingProject.projectName || ''}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, projectName: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Client Business Name *</label>
                  <input
                    type="text"
                    required
                    aria-label="Client Business Name"
                    value={editingProject.clientName || ''}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, clientName: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Assigned Developer</label>
                  <select
                    value={editingProject.assignedDeveloperId ? String(editingProject.assignedDeveloperId) : ''}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        assignedDeveloperId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">Unassigned</option>
                    {developers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Workflow Status</label>
                  <select
                    value={editingProject.status || 'Not Started'}
                    onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {projectStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editingProject.startDate || ''}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, startDate: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editingProject.dueDate || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Agreed Client Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingProject.agreedPrice ?? 50000}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, agreedPrice: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Developer Cost (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingProject.agreedDeveloperCost ?? 12000}
                    onChange={(e) =>
                      setEditingProject({
                        ...editingProject,
                        agreedDeveloperCost: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Other Expenses (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={editingProject.otherExpenses ?? 1500}
                    onChange={(e) =>
                      setEditingProject({ ...editingProject, otherExpenses: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Project Requirements & Scope</label>
                <textarea
                  rows={2}
                  value={editingProject.requirements || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, requirements: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Record Project Payment"
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold text-white">Record Financial Payment</h3>
            {paymentError && (
              <div className="p-2.5 bg-red-950/60 border border-red-500/40 rounded text-xs text-red-300">
                {paymentError}
              </div>
            )}
            <form onSubmit={handleAddPayment} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Linked Website Project</label>
                <select
                  value={newPayment.projectId}
                  onChange={(e) => {
                    const p = projMap.get(Number(e.target.value));
                    setNewPayment({
                      ...newPayment,
                      projectId: e.target.value,
                      payerOrPayee: p ? p.clientName : newPayment.payerOrPayee,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Payment Direction</label>
                  <select
                    value={newPayment.paymentDirection}
                    onChange={(e) =>
                      setNewPayment({ ...newPayment, paymentDirection: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="inbound_client">Inbound from Client</option>
                    <option value="outbound_developer">Outbound to Developer</option>
                    <option value="outbound_expense">Outbound Project Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Payment Type</label>
                  <select
                    value={newPayment.paymentType}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="Advance">Advance</option>
                    <option value="Milestone">Milestone</option>
                    <option value="Final Balance">Final Balance</option>
                    <option value="Developer Payout">Developer Payout</option>
                    <option value="Project Expense">Project Expense</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Payer / Payee Name *</label>
                  <input
                    type="text"
                    required
                    value={newPayment.payerOrPayee}
                    onChange={(e) => setNewPayment({ ...newPayment, payerOrPayee: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">UTR / Reference *</label>
                  <input
                    type="text"
                    required
                    value={newPayment.reference}
                    onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={newPayment.paidAt}
                    onChange={(e) => setNewPayment({ ...newPayment, paidAt: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg"
                >
                  Save Payment Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Add Project Task"
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold text-white">Add Engineering Task</h3>
            <form onSubmit={handleSaveTask} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Project</label>
                <select
                  value={editingTask.projectId}
                  onChange={(e) => setEditingTask({ ...editingTask, projectId: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={editingTask.title || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Assigned Developer</label>
                  <select
                    value={editingTask.assignedDeveloperId ? String(editingTask.assignedDeveloperId) : ''}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        assignedDeveloperId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {developers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editingTask.dueDate || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Developer Profile Modal */}
      {devModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Developer Profile Modal"
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold text-white">
              {editingDev.id ? 'Edit Developer Profile' : 'Add Website Developer'}
            </h3>
            <form onSubmit={handleSaveDevProfile} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingDev.fullName || ''}
                    onChange={(e) => setEditingDev({ ...editingDev, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={editingDev.email || ''}
                    onChange={(e) => setEditingDev({ ...editingDev, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Skills</label>
                <input
                  type="text"
                  value={editingDev.skills || ''}
                  onChange={(e) => setEditingDev({ ...editingDev, skills: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Specialities</label>
                <input
                  type="text"
                  value={editingDev.specialities || ''}
                  onChange={(e) => setEditingDev({ ...editingDev, specialities: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Agreed Payment Arrangement</label>
                <input
                  type="text"
                  value={editingDev.paymentArrangement || ''}
                  onChange={(e) =>
                    setEditingDev({ ...editingDev, paymentArrangement: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDevModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg"
                >
                  Save Developer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
