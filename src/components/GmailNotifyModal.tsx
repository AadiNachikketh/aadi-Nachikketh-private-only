'use client';

import React, { useState, useEffect } from 'react';
import { Mail, ExternalLink, Copy, Check, X, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { sendEmailViaGmailApi } from '@/src/lib/firebase';

export interface GmailDraftPayload {
  recipientName: string;
  recipientRole: 'Outreacher' | 'Developer';
  recipientEmail: string;
  subject: string;
  body: string;
}

interface GmailNotifyModalProps {
  draft: GmailDraftPayload | null;
  onClose: () => void;
}

export default function GmailNotifyModal({ draft, onClose }: GmailNotifyModalProps) {
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (draft) {
      setToEmail(draft.recipientEmail || '');
      setSubject(draft.subject || '');
      setBody(draft.body || '');
      setCopied(false);
      setSending(false);
      setSentSuccess(false);
      setSendError(null);
    }
  }, [draft]);

  if (!draft) return null;

  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    toEmail.trim()
  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const mailtoUrl = `mailto:${encodeURIComponent(
    toEmail.trim()
  )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`To: ${toEmail}\nSubject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore clipboard error
    }
  };

  const handleDirectGmailSend = async () => {
    if (!toEmail.trim()) {
      setSendError('Please enter a valid recipient email address.');
      return;
    }
    setSending(true);
    setSendError(null);
    setSentSuccess(false);
    try {
      await sendEmailViaGmailApi({
        to: toEmail.trim(),
        subject,
        body,
      });
      setSentSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send via Gmail API.';
      setSendError(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-label="Send Assignment Notification to Gmail"
        className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 my-8 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Send Assignment to {draft.recipientRole}&apos;s Gmail
              </h3>
              <p className="text-xs text-slate-400">
                Notify <span className="text-slate-200 font-medium">{draft.recipientName}</span> with full assignment details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sentSuccess && (
          <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-lg p-3 flex items-center gap-2.5 text-emerald-200 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Assignment email sent directly to <strong>{toEmail}</strong> via Gmail!
            </span>
          </div>
        )}

        {sendError && (
          <div className="bg-amber-950/60 border border-amber-500/40 rounded-lg p-3 flex items-start gap-2.5 text-amber-200 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>{sendError}</p>
              <p className="text-amber-300/80">
                Tip: You can also click <strong>Open in Gmail Web</strong> below to send directly from a new Gmail tab.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {draft.recipientRole} Gmail Address *
            </label>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="name@gmail.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Email Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Assignment Brief &amp; Contact Details
            </label>
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono leading-relaxed"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied Brief!' : 'Copy Brief'}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
            >
              Cancel
            </button>

            <a
              href={mailtoUrl}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Mail App
            </a>

            <a
              href={gmailComposeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-red-400" />
              Open in Gmail Web
            </a>

            <button
              type="button"
              onClick={handleDirectGmailSend}
              disabled={sending || sentSuccess}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              {sending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sending via Gmail...
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  Send Directly via Gmail
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function buildOutreacherLeadEmailDraft(
  outreacher: { fullName: string; email: string },
  leadsList: Array<{
    businessName: string;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    categoryName?: string | null;
    locality?: string | null;
    city?: string | null;
    websiteStatus?: string | null;
    googleMapsUrl?: string | null;
    estimatedDealValue?: number | null;
    nextFollowUpAt?: string | null;
    notes?: string | null;
  }>
): GmailDraftPayload {
  const isSingle = leadsList.length === 1;
  const first = leadsList[0];
  const subject = isSingle
    ? `[New Lead Assigned] ${first.businessName} (${first.locality || first.city || 'India'})`
    : `[${leadsList.length} New Leads Assigned] Outreach Task Queue for ${outreacher.fullName}`;

  const leadsFormatted = leadsList
    .map(
      (l, i) =>
        `${i + 1}. ${l.businessName} (${l.categoryName || 'Business'})\n` +
        `   - Contact Person: ${l.contactName || 'N/A'}\n` +
        `   - Phone / WhatsApp: ${l.phone || 'N/A'}\n` +
        `   - Business Email: ${l.email || 'N/A'}\n` +
        `   - Location: ${[l.locality, l.city].filter(Boolean).join(', ') || 'India'}\n` +
        `   - Website Status: ${l.websiteStatus || 'No Website'}\n` +
        `   - Est. Deal Value: INR ${(l.estimatedDealValue || 0).toLocaleString('en-IN')}\n` +
        (l.googleMapsUrl ? `   - Google Maps: ${l.googleMapsUrl}\n` : '') +
        (l.nextFollowUpAt ? `   - Next Follow-up: ${l.nextFollowUpAt}\n` : '') +
        (l.notes ? `   - Notes: ${l.notes}\n` : '')
    )
    .join('\n');

  const body =
    `Hi ${outreacher.fullName},\n\n` +
    `You have been assigned ${leadsList.length} business lead${isSingle ? '' : 's'} for outreach in the Agency Command Center:\n\n` +
    `${leadsFormatted}\n` +
    `Please contact the prospect(s) and update the outreach status and call notes in the CRM.\n\n` +
    `Best regards,\nAgency Command Center`;

  return {
    recipientName: outreacher.fullName,
    recipientRole: 'Outreacher',
    recipientEmail: outreacher.email,
    subject,
    body,
  };
}

export function buildDeveloperTaskEmailDraft(
  developer: { fullName: string; email: string },
  item: {
    type: 'Project' | 'Task';
    title: string;
    clientName?: string | null;
    projectName?: string | null;
    status?: string | null;
    priority?: string | null;
    dueDate?: string | null;
    requirements?: string | null;
    agreedDeveloperCost?: number | null;
  }
): GmailDraftPayload {
  const subject =
    item.type === 'Project'
      ? `[New Website Project Assigned] ${item.title} — ${item.clientName || 'Client'}`
      : `[New Developer Task Assigned] ${item.title} (${item.projectName || 'Website Project'})`;

  const body =
    `Hi ${developer.fullName},\n\n` +
    `You have been assigned a new ${item.type.toLowerCase()} in the Agency Command Center:\n\n` +
    `- ${item.type}: ${item.title}\n` +
    (item.clientName ? `- Client Business: ${item.clientName}\n` : '') +
    (item.projectName ? `- Website Project: ${item.projectName}\n` : '') +
    `- Status: ${item.status || 'Assigned'}\n` +
    `- Priority: ${item.priority || 'High'}\n` +
    `- Due Date / Deadline: ${item.dueDate || 'TBD'}\n` +
    (item.agreedDeveloperCost
      ? `- Agreed Developer Payout: INR ${item.agreedDeveloperCost.toLocaleString('en-IN')}\n`
      : '') +
    (item.requirements ? `\nRequirements / Scope:\n${item.requirements}\n` : '') +
    `\nPlease review the requirements and update your progress in the Agency Command Center.\n\n` +
    `Best regards,\nAgency Command Center`;

  return {
    recipientName: developer.fullName,
    recipientRole: 'Developer',
    recipientEmail: developer.email,
    subject,
    body,
  };
}
