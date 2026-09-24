/* ------------------------------------------------------------------ *
 * Financial Configuration — the registry.
 *
 * Every area of the financial control plane is declared here once. The
 * UI, the validation and the consumption helpers all read this file, so
 * adding a new configurable area is a registry entry, never a new page
 * and never a new table.
 *
 * Browser-safe: no server imports.
 * ------------------------------------------------------------------ */

export type SectionKind = "settings" | "list" | "rules" | "audit";

export type FieldType = "text" | "textarea" | "number" | "toggle" | "select" | "date";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  help?: string;
  placeholder?: string;
}

export interface SectionDef {
  key: string;
  name: string;
  kind: SectionKind;
  /** Which modules consume this section — shown in the UI so nothing is duplicated elsewhere. */
  consumers?: string[];
  fields?: FieldDef[];
  /** For list sections: extra per-item detail fields stored in metadata. */
  itemFields?: FieldDef[];
  description?: string;
}

export interface AreaDef {
  key: string;
  number: string;
  name: string;
  sections: SectionDef[];
}

export const CONFIG_STATUSES = [
  "draft",
  "review",
  "approved",
  "scheduled",
  "active",
  "superseded",
  "archived",
] as const;
export type ConfigStatus = (typeof CONFIG_STATUSES)[number];

/** Allowed lifecycle moves — enforced on the server, mirrored in the UI. */
export const STATUS_TRANSITIONS: Record<ConfigStatus, ConfigStatus[]> = {
  draft: ["review", "archived"],
  review: ["approved", "draft", "archived"],
  approved: ["scheduled", "active", "review", "archived"],
  scheduled: ["active", "approved", "archived"],
  active: ["superseded", "archived"],
  superseded: ["archived"],
  archived: [],
};

export const STATUS_LABEL: Record<ConfigStatus, string> = {
  draft: "Draft",
  review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  active: "Active",
  superseded: "Superseded",
  archived: "Archived",
};

const YES_NO = ["yes", "no"] as const;

const settings = (
  key: string,
  name: string,
  fields: FieldDef[],
  consumers?: string[],
): SectionDef => ({ key, name, kind: "settings", fields, ...(consumers ? { consumers } : {}) });

const list = (
  key: string,
  name: string,
  itemFields?: FieldDef[],
  consumers?: string[],
): SectionDef => ({
  key,
  name,
  kind: "list",
  ...(itemFields ? { itemFields } : {}),
  ...(consumers ? { consumers } : {}),
});

const rules = (key: string, name: string, consumers?: string[]): SectionDef => ({
  key,
  name,
  kind: "rules",
  ...(consumers ? { consumers } : {}),
});

const AMOUNT_FIELD: FieldDef = { key: "amount", label: "Amount", type: "number" };
const ACCOUNT_FIELD: FieldDef = { key: "account_code", label: "Posting account", type: "text" };

export const FINANCE_AREAS: AreaDef[] = [
  {
    key: "general",
    number: "01",
    name: "General Financial Configuration",
    sections: [
      settings("financial-profile", "Financial Profile", [
        { key: "finance_contact", label: "Finance contact name", type: "text" },
        { key: "finance_email", label: "Finance email", type: "text" },
        { key: "finance_phone", label: "Finance phone", type: "text" },
        { key: "tax_identifier", label: "Tax identification number", type: "text" },
        { key: "bank_name", label: "Primary bank", type: "text" },
        { key: "bank_account", label: "Primary bank account", type: "text" },
      ]),
      settings(
        "currency",
        "Currency",
        [
          { key: "code", label: "Currency code", type: "text", placeholder: "GHS" },
          { key: "symbol", label: "Symbol", type: "text", placeholder: "₵" },
          { key: "locale", label: "Number locale", type: "text", placeholder: "en-GH" },
          { key: "decimal_places", label: "Decimal places", type: "number" },
          { key: "rounding", label: "Rounding", type: "select", options: ["nearest", "up", "down"] },
        ],
        ["Financial Management", "Fees & Invoicing", "Invoices"],
      ),
      settings("fiscal-year", "Fiscal Year", [
        { key: "start_month", label: "Start month (1-12)", type: "number" },
        { key: "start_day", label: "Start day", type: "number" },
        { key: "label_format", label: "Year label", type: "text", placeholder: "FY{YYYY}" },
        { key: "closed", label: "Current year closed", type: "select", options: YES_NO },
      ]),
      list("financial-periods", "Financial Periods", [
        { key: "starts_on", label: "Starts on", type: "date" },
        { key: "ends_on", label: "Ends on", type: "date" },
        { key: "state", label: "State", type: "select", options: ["open", "locked", "closed"] },
      ]),
      list("organization-structure", "Organization Structure", [
        { key: "unit_type", label: "Unit type", type: "select", options: ["school", "campus", "department", "cost centre"] },
      ]),
      settings("financial-preferences", "Financial Preferences", [
        { key: "negative_balances", label: "Allow negative balances", type: "select", options: YES_NO },
        { key: "backdating", label: "Allow back-dated entries", type: "select", options: YES_NO },
        { key: "auto_post", label: "Post entries automatically", type: "select", options: YES_NO },
        { key: "default_payment_terms", label: "Default payment terms (days)", type: "number" },
      ]),
    ],
  },
  {
    key: "billing",
    number: "02",
    name: "Billing & Fee Configuration",
    sections: [
      settings("billing-profile", "Billing Profile", [
        { key: "biller_name", label: "Biller name", type: "text" },
        { key: "billing_address", label: "Billing address", type: "textarea" },
        { key: "default_cycle", label: "Default billing cycle", type: "text", placeholder: "termly" },
        { key: "auto_generate", label: "Generate bills automatically", type: "select", options: YES_NO },
      ]),
      list("fee-categories", "Fee Categories", undefined, ["Fees & Invoicing", "Financial Management"]),
      list("charge-types", "Charge Types", [
        { key: "basis", label: "Basis", type: "select", options: ["fixed", "per term", "per student", "percentage"] },
        AMOUNT_FIELD,
      ]),
      list("fee-structures", "Fee Structures", [
        { key: "class_name", label: "Applies to class", type: "text" },
        { key: "term", label: "Term", type: "text" },
        AMOUNT_FIELD,
      ], ["Fees & Invoicing"]),
      rules("billing-rules", "Billing Rules", ["Fees & Invoicing"]),
      list("billing-cycles", "Billing Cycles", [
        { key: "frequency", label: "Frequency", type: "select", options: ["termly", "monthly", "annual", "one-off"] },
      ]),
      list("billing-periods", "Billing Periods", [
        { key: "starts_on", label: "Starts on", type: "date" },
        { key: "ends_on", label: "Ends on", type: "date" },
      ]),
      list("payment-terms", "Payment Terms", [
        { key: "days", label: "Net days", type: "number" },
      ]),
      rules("due-date-rules", "Due-Date Rules"),
      rules("discount-rules", "Discount Rules"),
      rules("waiver-rules", "Waiver Rules"),
      rules("scholarship-rules", "Scholarship Rules"),
      rules("penalty-rules", "Penalty Rules"),
      rules("proration-rules", "Proration Rules"),
    ],
  },
  {
    key: "invoice",
    number: "03",
    name: "Invoice Configuration",
    sections: [
      list("invoice-types", "Invoice Types", undefined, ["Invoices"]),
      settings(
        "invoice-numbering",
        "Invoice Numbering",
        [
          { key: "format", label: "Template", type: "text", placeholder: "INV-{YY}-{SEQ}", help: "Use {SCHOOL}, {YY} and {SEQ}." },
          { key: "sequence_digits", label: "Sequence length", type: "number" },
          { key: "sequence_start", label: "Start at", type: "number" },
          { key: "reset", label: "Reset sequence", type: "select", options: ["never", "yearly", "termly"] },
        ],
        ["Invoices"],
      ),
      list("invoice-templates", "Invoice Templates", [
        { key: "body", label: "Template body", type: "textarea" },
      ]),
      list("invoice-statuses", "Invoice Statuses", [
        { key: "terminal", label: "Terminal state", type: "select", options: YES_NO },
      ], ["Invoices"]),
      rules("invoice-rules", "Invoice Rules"),
      settings("invoice-delivery", "Invoice Delivery", [
        { key: "channels", label: "Delivery channels", type: "text", placeholder: "email, portal, print" },
        { key: "send_on_issue", label: "Send when issued", type: "select", options: YES_NO },
        { key: "reply_to", label: "Reply-to address", type: "text" },
      ]),
      rules("invoice-void-rules", "Invoice Cancellation / Void Rules"),
    ],
  },
  {
    key: "payment",
    number: "04",
    name: "Payment Configuration",
    sections: [
      list("payment-methods", "Payment Methods", undefined, ["Financial Management", "Invoices"]),
      list("payment-channels", "Payment Channels", [
        { key: "provider", label: "Provider", type: "text" },
      ]),
      list("payment-accounts", "Payment Accounts", [
        { key: "bank", label: "Bank", type: "text" },
        { key: "number", label: "Account number", type: "text" },
        ACCOUNT_FIELD,
      ]),
      rules("allocation-rules", "Allocation Rules"),
      rules("verification-rules", "Verification Rules"),
      rules("refund-rules", "Refund Rules"),
      rules("payment-reversal-rules", "Reversal Rules"),
    ],
  },
  {
    key: "receivables",
    number: "05",
    name: "Receivables & Collections",
    sections: [
      list("receivable-types", "Receivable Types"),
      rules("aging-rules", "Aging Rules"),
      rules("collection-rules", "Collection Rules"),
      rules("reminder-rules", "Reminder Rules"),
      rules("escalation-rules", "Escalation Rules"),
      rules("receivable-write-off-rules", "Write-Off Rules"),
    ],
  },
  {
    key: "income",
    number: "06",
    name: "Income & Revenue",
    sections: [
      list("income-categories", "Income Categories", undefined, ["Financial Management"]),
      list("revenue-types", "Revenue Types"),
      list("revenue-accounts", "Revenue Accounts", [ACCOUNT_FIELD]),
      rules("revenue-recognition-rules", "Revenue Recognition Rules"),
      rules("income-posting-rules", "Income Posting Rules"),
    ],
  },
  {
    key: "expense",
    number: "07",
    name: "Expense Configuration",
    sections: [
      list("expense-categories", "Expense Categories", undefined, ["Financial Management"]),
      list("expense-types", "Expense Types"),
      rules("expense-rules", "Expense Rules"),
      rules("expense-approval-rules", "Approval Rules"),
      rules("expense-payment-rules", "Payment Rules"),
      rules("expense-posting-rules", "Posting Rules"),
    ],
  },
  {
    key: "payroll",
    number: "08",
    name: "Payroll Configuration",
    sections: [
      settings(
        "payroll-profile",
        "Payroll Profile",
        [
          { key: "pay_day", label: "Pay day of month", type: "number" },
          { key: "cycle", label: "Payroll cycle", type: "select", options: ["monthly", "fortnightly", "weekly"] },
          { key: "requires_approval", label: "Requires approval", type: "select", options: YES_NO },
        ],
        ["Financial Management"],
      ),
      list("salary-components", "Salary Components", [
        { key: "basis", label: "Basis", type: "select", options: ["fixed", "percentage"] },
        AMOUNT_FIELD,
      ], ["Financial Management"]),
      list("allowance-components", "Allowances", [
        { key: "basis", label: "Basis", type: "select", options: ["fixed", "percentage"] },
        AMOUNT_FIELD,
        { key: "taxable", label: "Taxable", type: "select", options: YES_NO },
      ], ["Financial Management"]),
      list("deduction-components", "Deduction Components", [
        { key: "basis", label: "Basis", type: "select", options: ["fixed", "percentage"] },
        AMOUNT_FIELD,
        { key: "statutory", label: "Statutory", type: "select", options: YES_NO },
      ], ["Financial Management"]),
      rules("payroll-rules", "Payroll Rules"),
      rules("payroll-approval-rules", "Approval Rules"),
      rules("payroll-posting-rules", "Payroll Posting Rules"),
    ],
  },
  {
    key: "budget",
    number: "09",
    name: "Budget Configuration",
    sections: [
      settings("budget-structure", "Budget Structure", [
        { key: "level", label: "Budget level", type: "select", options: ["school", "department", "cost centre", "project"] },
        { key: "basis", label: "Basis", type: "select", options: ["annual", "termly", "monthly"] },
      ]),
      list("budget-categories", "Budget Categories", [AMOUNT_FIELD]),
      list("budget-periods", "Budget Periods", [
        { key: "starts_on", label: "Starts on", type: "date" },
        { key: "ends_on", label: "Ends on", type: "date" },
      ]),
      rules("budget-controls", "Budget Controls"),
      rules("budget-approval-rules", "Budget Approval Rules"),
    ],
  },
  {
    key: "accounting",
    number: "10",
    name: "Accounting & Tax",
    sections: [
      list("chart-of-accounts", "Chart of Accounts", [
        { key: "account_class", label: "Class", type: "select", options: ["asset", "liability", "equity", "income", "expense"] },
        { key: "parent", label: "Parent account code", type: "text" },
      ]),
      list("account-types", "Account Types"),
      list("account-classes", "Account Classes"),
      list("account-mapping", "Account Mapping", [
        { key: "source", label: "Source record", type: "text", placeholder: "income / expense / fee" },
        ACCOUNT_FIELD,
      ]),
      rules("accounting-posting-rules", "Posting Rules"),
      rules("journal-rules", "Journal Rules"),
      list("tax-configuration", "Tax Configuration", [
        { key: "rate", label: "Rate (%)", type: "number" },
        { key: "inclusive", label: "Price inclusive", type: "select", options: YES_NO },
        ACCOUNT_FIELD,
      ]),
      list("financial-dimensions", "Financial Dimensions"),
    ],
  },
  {
    key: "documents",
    number: "11",
    name: "Financial Documents",
    sections: [
      settings("receipts", "Receipts", documentFields("RCT-{YY}-{SEQ}")),
      settings("credit-notes", "Credit Notes", documentFields("CRN-{YY}-{SEQ}")),
      settings("debit-notes", "Debit Notes", documentFields("DBN-{YY}-{SEQ}")),
      settings("statements", "Statements", documentFields("STM-{YY}-{SEQ}")),
      settings("payment-vouchers", "Payment Vouchers", documentFields("PV-{YY}-{SEQ}")),
      settings("expense-vouchers", "Expense Vouchers", documentFields("EV-{YY}-{SEQ}")),
      list("document-templates", "Document Templates", [
        { key: "document", label: "Document", type: "text" },
        { key: "body", label: "Template body", type: "textarea" },
      ]),
    ],
  },
  {
    key: "approval",
    number: "12",
    name: "Approval & Workflow",
    sections: [
      list("approval-levels", "Approval Levels", [
        { key: "role", label: "Approver role", type: "text" },
        { key: "level", label: "Level", type: "number" },
      ]),
      rules("approval-thresholds", "Approval Thresholds"),
      rules("workflow-rules", "Workflow Rules"),
      rules("delegation-rules", "Delegation"),
      rules("segregation-of-duties", "Segregation of Duties"),
    ],
  },
  {
    key: "controls",
    number: "13",
    name: "Financial Controls",
    sections: [
      rules("transaction-limits", "Transaction Limits"),
      rules("period-controls", "Period Controls"),
      rules("modification-controls", "Modification Controls"),
      rules("cancellation-controls", "Cancellation Controls"),
      rules("reversal-controls", "Reversal Controls"),
      rules("write-off-controls", "Write-Off Controls"),
    ],
  },
  {
    key: "reporting",
    number: "14",
    name: "Reporting & Analytics",
    sections: [
      list("report-definitions", "Report Definitions", [
        { key: "source", label: "Data source", type: "text" },
        { key: "category", label: "Category", type: "text" },
      ], ["Financial Management", "Advanced Reporting"]),
      list("report-categories", "Report Categories"),
      list("reporting-dimensions", "Financial Dimensions"),
      list("kpi-definitions", "KPI Definitions", [
        { key: "formula", label: "Formula", type: "text" },
        { key: "target", label: "Target", type: "number" },
      ]),
      settings("dashboard-configuration", "Dashboard Configuration", [
        { key: "default_range", label: "Default range", type: "select", options: ["term", "month", "year"] },
        { key: "visible_kpis", label: "Visible KPIs", type: "text" },
      ]),
    ],
  },
  {
    key: "archive",
    number: "15",
    name: "Archive & Retention",
    sections: [
      rules("archive-rules", "Archive Rules", ["Archives"]),
      rules("retention-policies", "Retention Policies", ["Archives"]),
      rules("document-retention", "Document Retention"),
      rules("transaction-retention", "Transaction Retention"),
      list("archive-periods", "Archive Periods", [
        { key: "starts_on", label: "Starts on", type: "date" },
        { key: "ends_on", label: "Ends on", type: "date" },
      ]),
      rules("restoration-rules", "Restoration Rules"),
    ],
  },
  {
    key: "security",
    number: "16",
    name: "Security & Compliance",
    sections: [
      list("financial-permissions", "Financial Permissions", [
        { key: "role", label: "Role", type: "text" },
        { key: "capability", label: "Capability", type: "text" },
      ]),
      rules("role-restrictions", "Role Restrictions"),
      rules("data-access-rules", "Data Access Rules"),
      settings("audit-requirements", "Audit Requirements", [
        { key: "log_reads", label: "Log record views", type: "select", options: YES_NO },
        { key: "retain_years", label: "Retain audit trail (years)", type: "number" },
      ]),
      rules("compliance-rules", "Compliance Rules"),
    ],
  },
  {
    key: "lifecycle",
    number: "17",
    name: "Configuration Lifecycle",
    sections: [
      settings("lifecycle-policy", "Lifecycle Policy", [
        { key: "require_review", label: "Require review before approval", type: "select", options: YES_NO },
        { key: "require_approval", label: "Require approval before activation", type: "select", options: YES_NO },
        { key: "allow_scheduling", label: "Allow scheduled activation", type: "select", options: YES_NO },
        { key: "retain_versions", label: "Versions to retain", type: "number" },
      ]),
      { key: "configuration-audit-trail", name: "Configuration Audit Trail", kind: "audit" },
    ],
  },
  {
    key: "transaction-lifecycle",
    number: "18",
    name: "Transaction Lifecycle",
    sections: [
      list("status-definitions", "Status Definitions", [
        { key: "applies_to", label: "Applies to", type: "text", placeholder: "invoice / payment / expense" },
        { key: "terminal", label: "Terminal state", type: "select", options: YES_NO },
      ]),
      rules("status-transitions", "Status Transitions"),
      rules("transition-rules", "Transition Rules"),
      rules("automatic-transitions", "Automatic Transition Rules"),
      rules("approval-transitions", "Approval Transitions"),
      rules("date-based-transitions", "Date-Based Transitions"),
      rules("payment-based-transitions", "Payment-Based Transitions"),
      rules("reversal-transitions", "Reversal Transitions"),
      rules("lifecycle-cancellation-rules", "Cancellation Rules"),
      rules("void-rules", "Void Rules"),
      rules("lifecycle-write-off-rules", "Write-Off Rules"),
      list("terminal-states", "Final / Terminal States", [
        { key: "applies_to", label: "Applies to", type: "text" },
      ]),
    ],
  },
  {
    key: "transaction-control",
    number: "19",
    name: "Transaction Control",
    sections: [
      rules("validation-rules", "Validation Rules"),
      rules("control-posting-rules", "Posting Rules"),
      rules("lock-rules", "Lock Rules"),
      rules("record-modification-rules", "Modification Rules"),
      rules("audit-rules", "Audit Rules"),
    ],
  },
];

function documentFields(format: string): FieldDef[] {
  return [
    { key: "enabled", label: "Enabled", type: "select", options: YES_NO },
    { key: "numbering_format", label: "Numbering template", type: "text", placeholder: format },
    { key: "footer_note", label: "Footer note", type: "textarea" },
  ];
}

export const SECTION_INDEX: Record<string, { area: AreaDef; section: SectionDef }> =
  Object.fromEntries(
    FINANCE_AREAS.flatMap((area) => area.sections.map((section) => [section.key, { area, section }])),
  );

export function getSection(key: string) {
  return SECTION_INDEX[key];
}

export const LIST_KEYS = FINANCE_AREAS.flatMap((a) =>
  a.sections.filter((s) => s.kind === "list").map((s) => s.key),
);
export const RULE_KEYS = FINANCE_AREAS.flatMap((a) =>
  a.sections.filter((s) => s.kind === "rules").map((s) => s.key),
);
export const SETTINGS_KEYS = FINANCE_AREAS.flatMap((a) =>
  a.sections.filter((s) => s.kind === "settings").map((s) => s.key),
);

/* --------------------------- stored shapes --------------------------- */

export interface ConfigSection {
  id: string;
  school_id: string;
  area_key: string;
  section_key: string;
  version: number;
  status: ConfigStatus;
  effective_from: string | null;
  effective_to: string | null;
  payload: Record<string, unknown>;
  notes: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

export interface ReferenceItem {
  id: string;
  school_id: string;
  list_key: string;
  code: string;
  name: string;
  description: string;
  parent_code: string | null;
  sort_order: number;
  active: boolean;
  metadata: Record<string, unknown>;
}

export interface FinanceRule {
  id: string;
  school_id: string;
  rule_key: string;
  name: string;
  description: string;
  priority: number;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  effective_from: string | null;
  effective_to: string | null;
  active: boolean;
}

export interface FinanceConfigAudit {
  id: string;
  section_key: string;
  action: string;
  description: string;
  actor_email: string | null;
  created_at: string;
}

/* ---------------------------- seed defaults ---------------------------- */

const seedList = (items: [string, string][]) =>
  items.map(([code, name], i) => ({ code, name, sort_order: i + 1 }));

/**
 * The starting point for a newly provisioned school. These are the values
 * that used to be hardcoded in the finance module — they now live in the
 * configuration store so a school can change them.
 */
export const DEFAULT_LISTS: Record<string, { code: string; name: string; sort_order: number }[]> = {
  "income-categories": seedList([
    ["tuition", "Tuition Fees"],
    ["donations", "Donations"],
    ["grants", "Government Grants"],
    ["sponsorships", "Sponsorships"],
    ["other", "Other Income"],
  ]),
  "expense-categories": seedList([
    ["salaries", "Staff Salaries"],
    ["utilities", "Utilities (Water, Electricity, Internet)"],
    ["maintenance", "Building Maintenance"],
    ["supplies", "Educational Supplies"],
    ["transport", "Transportation"],
    ["other", "Other Expenses"],
  ]),
  "fee-categories": seedList([
    ["tuition", "Tuition Fee"],
    ["pta", "PTA Dues"],
    ["classes", "Extra Classes Fee"],
    ["sports", "Sports Fee"],
    ["examination", "Examination Fee"],
    ["other", "Other Fee"],
  ]),
  "payment-methods": seedList([
    ["cash", "Cash"],
    ["bank-transfer", "Bank Transfer"],
    ["mobile-money", "Mobile Money"],
    ["cheque", "Cheque"],
    ["card", "Card"],
  ]),
  "billing-cycles": seedList([
    ["termly", "Termly"],
    ["monthly", "Monthly"],
    ["annual", "Annual"],
    ["one-off", "One-off"],
  ]),
  "invoice-statuses": seedList([
    ["draft", "Draft"],
    ["issued", "Issued"],
    ["part-paid", "Partly Paid"],
    ["paid", "Paid"],
    ["overdue", "Overdue"],
    ["void", "Void"],
  ]),
  "status-definitions": seedList([
    ["pending", "Pending"],
    ["received", "Received"],
    ["paid", "Paid"],
    ["overdue", "Overdue"],
    ["processed", "Processed"],
    ["reversed", "Reversed"],
    ["written-off", "Written Off"],
  ]),
  "account-classes": seedList([
    ["asset", "Asset"],
    ["liability", "Liability"],
    ["equity", "Equity"],
    ["income", "Income"],
    ["expense", "Expense"],
  ]),
  "payment-terms": seedList([
    ["due-on-receipt", "Due on receipt"],
    ["net-14", "Net 14 days"],
    ["net-30", "Net 30 days"],
  ]),
};

export function defaultSettings(
  sectionKey: string,
  school: { currency: string; locale: string },
): Record<string, unknown> | null {
  switch (sectionKey) {
    case "currency":
      return {
        code: school.currency || "GHS",
        symbol: currencySymbol(school.currency || "GHS"),
        locale: school.locale || "en-GH",
        decimal_places: 2,
        rounding: "nearest",
      };
    case "fiscal-year":
      return { start_month: 9, start_day: 1, label_format: "FY{YYYY}", closed: "no" };
    case "financial-preferences":
      return { negative_balances: "no", backdating: "yes", auto_post: "yes", default_payment_terms: 30 };
    case "lifecycle-policy":
      return { require_review: "yes", require_approval: "yes", allow_scheduling: "yes", retain_versions: 10 };
    case "invoice-numbering":
      return { format: "INV-{YY}-{SEQ}", sequence_digits: 5, sequence_start: 1, reset: "yearly" };
    case "payroll-profile":
      return { pay_day: 25, cycle: "monthly", requires_approval: "yes" };
    default:
      return null;
  }
}

const SYMBOLS: Record<string, string> = {
  GHS: "₵", NGN: "₦", KES: "KSh", ZAR: "R", USD: "$", EUR: "€", GBP: "£", INR: "₹",
};

export function currencySymbol(code: string) {
  return SYMBOLS[code.toUpperCase()] ?? `${code.toUpperCase()} `;
}

/** Options for a picker, from configured list items with a hardcoded fallback. */
export function optionsFrom(
  items: ReferenceItem[] | undefined,
  listKey: string,
  fallback: readonly { value: string; label: string }[],
): { value: string; label: string }[] {
  const configured = (items ?? [])
    .filter((i) => i.list_key === listKey && i.active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((i) => ({ value: i.code, label: i.name }));
  return configured.length > 0 ? configured : [...fallback];
}
