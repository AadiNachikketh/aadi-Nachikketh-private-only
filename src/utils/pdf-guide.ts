import { jsPDF } from 'jspdf';

export interface GuideSection {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  overview: string;
  steps: string[];
  proTip: string;
}

export const USER_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'quick-start',
    number: '01',
    title: 'Quick Start & Navigation Overview',
    subtitle: 'Getting oriented in the Agency Command Center',
    overview:
      'Agency Command Center is a full-stack PostgreSQL CRM engineered for website development and digital outreach agencies. All changes persist immediately to the Cloud SQL PostgreSQL database.',
    steps: [
      'Use the Left Sidebar to switch between the 8 core workspaces: Dashboard, Locations Explorer, Clients & Leads, Outreachers, Developers, Projects, Reports & Exports, and Settings.',
      'Use the Global Search bar in the top header to instantly find any locality (e.g., "Whitefield"), business lead (e.g., "Sri Krishna Diamonds"), website project, or team member.',
      'Click "Quick Add Lead" in the top-right header from any screen to immediately log a new business prospect into the CRM.',
      'Use the "Active Role" selector in the bottom-left sidebar (or in Settings) to preview permissions as Admin, Outreacher, or Developer.',
    ],
    proTip:
      'Sign in with Google in the bottom-left sidebar to bind your live Google identity to all audit logs and lead activities.',
  },
  {
    id: 'dashboard',
    number: '02',
    title: 'Executive Dashboard & Real-Time Metrics',
    subtitle: 'Monitoring agency pipeline, revenue, and team velocity',
    overview:
      'The Dashboard aggregates live PostgreSQL metrics across leads, deals, projects, payments, and commissions without manual refresh.',
    steps: [
      'Review the top KPI cards for Total Leads, Leads Without Websites, Deals Won, Cash Collected (INR), Outstanding Client Balance, and Net Estimated Profit.',
      'Inspect theLead Pipeline Funnel & Geographical Breakdown charts to see which localities and business categories yield the highest conversion.',
      'Check the "Action Required: Follow-Ups & Overdue Projects" panel to act on leads needing immediate callback or website deliveries approaching their due date.',
      'Use the Quick Action buttons at the top of the Dashboard to jump straight into adding leads, saving target locations, or importing spreadsheets.',
    ],
    proTip:
      'Every KPI card on the Dashboard is calculated dynamically from real database rows—closing a deal or recording a payment updates these numbers immediately.',
  },
  {
    id: 'locations',
    number: '03',
    title: 'Geographical Locations Explorer & Target Markets',
    subtitle: 'Drilling down Country -> State -> District -> City -> Locality',
    overview:
      'Organize outreach campaigns geographically so outreachers can systematically prospect high-potential commercial neighborhoods.',
    steps: [
      'Select a Country (e.g., India), State (e.g., Karnataka), District (e.g., Bengaluru Urban), City (e.g., Bengaluru), and Locality (e.g., Whitefield or Indiranagar).',
      'Click "Save as Target Market" on any location node to bookmark that area for active prospecting, assign an Outreacher, and set target business categories (e.g., Jewellery Shops, Dental Clinics).',
      'Update the Target Market status as your team progresses: Target Area -> Currently Working -> High Potential -> Completed.',
      'Click "View Leads Here" or "+ Add Lead in Area" on any saved location to filter or create leads pre-tagged with that exact geographical hierarchy.',
      'Need a neighborhood not yet in the tree? Click "+ Add Custom Location" to insert a new City, Locality, or Sub-locality with Pincode into PostgreSQL.',
    ],
    proTip:
      'Saving target markets prevents two outreachers from cold-calling the same neighborhood simultaneously.',
  },
  {
    id: 'leads-crm',
    number: '04',
    title: 'Clients & Leads CRM Pipeline',
    subtitle: 'Managing prospects, call logs, follow-ups, and Deal Won conversions',
    overview:
      'Track every local business prospect from initial discovery ("New Lead" / "Not Contacted") through "Interested", "Proposal Sent", and "Deal Won".',
    steps: [
      'Filter the lead table by Locality, Business Category, Pipeline Status, Website Status ("No Website", "Outdated Website"), Assigned Outreacher, or Priority.',
      'Change a lead\'s Pipeline Status directly from the inline dropdown in the table, or click any lead row to open the comprehensive Lead Detail Drawer.',
      'Inside the Lead Detail Drawer, log phone calls, WhatsApp messages, pitch notes, and schedule the Next Follow-up Date.',
      'When a prospect agrees to purchase a website, set the status to "Deal Won" (or click "Convert to Won Deal"). Enter the Agreed Deal Value (INR) and confirm the Assigned Outreacher.',
      'Converting a lead to "Deal Won" automatically creates a Deal record and calculates the Outreacher\'s commission in a single database transaction.',
    ],
    proTip:
      'Filter by Website Status = "No Website" to isolate the highest-converting prospects for cold outreach.',
  },
  {
    id: 'spreadsheet-import',
    number: '05',
    title: 'CSV / XLSX Spreadsheet Import & Export Wizard',
    subtitle: 'Bulk uploading Google Maps scrapes and business directories safely',
    overview:
      'Import hundreds of leads from `.csv` or `.xlsx` spreadsheets using the 4-step wizard with intelligent header mapping and duplicate protection.',
    steps: [
      'Navigate to "Clients & Leads" and click "Import CSV / XLSX".',
      'Step 1 (Upload): Select any `.csv` or `.xlsx` file from your computer.',
      'Step 2 (Column Mapping): The wizard automatically maps columns like "Business Name", "Phone", "Category", "Locality", "City", and "Website". Adjust any dropdown if your spreadsheet uses custom headers.',
      'Step 3 (Duplicate & Validation Preview): The engine checks every row against existing PostgreSQL leads using normalized Phone, Email, Website Domain, or (Exact Business Name + Locality). Note: Two businesses with the same name in different localities are never falsely flagged as duplicates.',
      'Step 4 (Commit): Choose "Skip Duplicates" or "Update Existing Leads" and click Commit. An audit record is saved in Settings -> Import History.',
    ],
    proTip:
      'You can export any filtered view in Clients & Leads to `.CSV` or `.XLSX` at any time by clicking the Export buttons above the table.',
  },
  {
    id: 'outreachers',
    number: '06',
    title: 'Outreacher Management & Commission Engine',
    subtitle: 'Tracking cold-caller conversions and automated commission payouts',
    overview:
      'Manage your sales outreach team, configure individual commission rules, and track pending vs. paid commissions with zero double-counting.',
    steps: [
      'Open the "Outreachers" module to view each team member\'s Assigned Leads, Contacted Count, Interested Leads, Won Deals, Conversion Rate %, and Commission Totals.',
      'Click "+ Add Outreacher" to onboard a new sales representative with either a Fixed Commission per Won Deal (e.g., INR 500 or INR 1,000) or a Percentage Commission (e.g., 15% of deal value).',
      'When a lead is marked "Deal Won", the system automatically generates or updates the single Commission ledger entry tied to that Deal.',
      'In the Commission Ledger table at the bottom of the Outreachers view, Admins can advance commission status from "Pending" -> "Approved" -> "Paid".',
    ],
    proTip:
      'PostgreSQL enforces a unique constraint on deal_id in the commissions table, guaranteeing a deal can never accidentally trigger duplicate commissions.',
  },
  {
    id: 'projects-developers',
    number: '07',
    title: 'Developers, Website Projects & Kanban Tasks',
    subtitle: 'Delivering client websites on time and managing developer workload',
    overview:
      'Once a deal is won, transition it into an active Website Project assigned to a Developer with structured milestones and task tracking.',
    steps: [
      'Open "Developers" to view developer profiles, technical specialities (Next.js, WordPress, Shopify), active project counts, and total payouts.',
      'Open "Projects" and click "+ Create Website Project" (or click "Create Project" directly from a Won Lead inside the Leads module).',
      'Track project lifecycle stages: Not Started -> Requirements Collected -> Design in Progress -> Development in Progress -> Client Review -> Completed / Delivered.',
      'Switch to the "Kanban Task Board" tab inside Projects to create tasks (e.g., "Design Homepage Wireframe", "Configure Custom Domain") and move them across Backlog, To Do, In Progress, Review, and Done.',
    ],
    proTip:
      'Projects past their Due Date that are not yet Completed or Delivered are automatically highlighted as Overdue across the Dashboard and Reports.',
  },
  {
    id: 'financials',
    number: '08',
    title: 'Financial Ledger, Payments & Project Profitability',
    subtitle: 'Recording client installments, developer payouts, and net agency profit',
    overview:
      'Every project tracks full unit economics so you always know how much cash has been collected, how much the client still owes, and your net margin.',
    steps: [
      'Inside the "Projects" module, click "Record Payment" on any project (or switch to the Payments Ledger tab).',
      'Log Incoming Client Payments (Advance, Milestone, or Final Payment) or Outgoing Payouts (Developer Payout, Hosting/Domain Expense).',
      'The system automatically computes: Outstanding Client Balance = Agreed Project Price - Client Cash Collected.',
      'Estimated Project Profit = Agreed Project Price - Developer Cost - Outreacher Commission - Other Project Expenses.',
      'Realized Profit (Cash Basis) = Client Cash Collected - Developer Cost - Outreacher Commission - Other Project Expenses.',
    ],
    proTip:
      'Always log advance payments before starting development so your Cash Collected vs. Pending Client Balance metrics remain accurate.',
  },
  {
    id: 'reports-settings',
    number: '09',
    title: 'Reports, Exports & Agency Settings',
    subtitle: 'Generating executive reports and configuring RBAC permissions',
    overview:
      'Run 11 pre-built executive reports and customize agency-wide defaults in Settings.',
    steps: [
      'Open "Reports & Exports" and select from 11 report types including Leads Without Websites, Outreacher Performance, Project Profitability, Overdue Projects, and Commission Liabilities.',
      'Filter any report by Locality or Business Category, then click "Export Report (.CSV)" or "Export Report (.XLSX)" for instant spreadsheet download.',
      'Open "Settings" to customize your Agency Name, Default Currency (INR/USD/GBP), Timezone, and Default Commission Rule.',
      'Add new Business Categories (e.g., "Boutique Hotels", "Diagnostic Labs") in Settings -> Business Categories Configuration.',
      'Use the "Team Roles & RBAC Verification Switcher" to test how Admin, Outreacher, and Developer roles interact with server-side API protections.',
    ],
    proTip:
      'You can re-download this PDF User Guide anytime from the top header bar ("User Guide PDF") or from the Reports & Settings workspace.',
  },
];

export function buildUserGuidePdf(agencyName = 'Agency Command Center'): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 18;

  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - 18) {
      doc.addPage();
      cursorY = 18;
    }
  };

  // Cover / Header Banner on Page 1
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 44, 'F');

  doc.setTextColor(59, 130, 246); // Blue 500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('OFFICIAL OPERATIONS & WORKFLOW MANUAL', margin, 14);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text(`${agencyName} — User Guide`, margin, 25);

  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    'Complete step-by-step guide to Locations, Leads CRM, CSV/XLSX Imports, Outreachers, Commissions & Projects',
    margin,
    34
  );

  cursorY = 52;

  // Table of Contents Box
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.roundedRect(margin, cursorY, contentWidth, 38, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Quick Table of Contents', margin + 5, cursorY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  USER_GUIDE_SECTIONS.forEach((sec, idx) => {
    const col = idx < 5 ? 0 : 1;
    const row = idx < 5 ? idx : idx - 5;
    const colX = margin + 5 + col * (contentWidth / 2);
    const rowY = cursorY + 13 + row * 5;
    doc.text(`${sec.number}. ${sec.title}`, colX, rowY);
  });

  cursorY += 45;

  // Render each chapter
  for (const section of USER_GUIDE_SECTIONS) {
    ensureSpace(48);

    // Section Header Bar
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.roundedRect(margin, cursorY, contentWidth, 10, 1.5, 1.5, 'F');

    doc.setTextColor(96, 165, 250); // Blue 400
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`CHAPTER ${section.number}`, margin + 4, cursorY + 6.5);

    doc.setTextColor(255, 255, 255);
    doc.text(`—  ${section.title}`, margin + 30, cursorY + 6.5);

    cursorY += 15;

    // Overview paragraph
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    const overviewLines = doc.splitTextToSize(section.overview, contentWidth);
    ensureSpace(overviewLines.length * 4.5 + 4);
    doc.text(overviewLines, margin, cursorY);
    cursorY += overviewLines.length * 4.5 + 3;

    // Numbered steps
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);

    section.steps.forEach((stepText, sIdx) => {
      const prefix = `${sIdx + 1}. `;
      const wrappedStep = doc.splitTextToSize(stepText, contentWidth - 8);
      ensureSpace(wrappedStep.length * 4.5 + 2);
      doc.setFont('helvetica', 'bold');
      doc.text(prefix, margin + 2, cursorY);
      doc.setFont('helvetica', 'normal');
      doc.text(wrappedStep, margin + 8, cursorY);
      cursorY += wrappedStep.length * 4.5 + 2;
    });

    // Pro-Tip Callout
    const tipText = `PRO TIP: ${section.proTip}`;
    const wrappedTip = doc.splitTextToSize(tipText, contentWidth - 8);
    const tipBoxHeight = wrappedTip.length * 4.2 + 5;
    ensureSpace(tipBoxHeight + 6);

    doc.setFillColor(239, 246, 255); // Blue 50
    doc.setDrawColor(147, 197, 253); // Blue 300
    doc.roundedRect(margin, cursorY, contentWidth, tipBoxHeight, 1.5, 1.5, 'FD');

    doc.setTextColor(30, 64, 175); // Blue 800
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(wrappedTip, margin + 4, cursorY + 4.5);

    cursorY += tipBoxHeight + 8;
  }

  // Add page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${agencyName} — Official Operations Manual`,
      margin,
      pageHeight - 7
    );
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - margin - 20,
      pageHeight - 7
    );
  }

  return doc;
}

export function downloadUserGuidePdf(agencyName = 'Agency Command Center'): string {
  const filename = 'Agency_Command_Center_User_Guide.pdf';
  const doc = buildUserGuidePdf(agencyName);
  doc.save(filename);
  return filename;
}
