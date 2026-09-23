# Financial Configuration — the control plane for money

A new super-admin module that owns every financial *rule*, while Financial Management, Fees, Invoices and Archives keep owning their *records*. Nothing about money stays hardcoded: categories, statuses, cycles, limits and workflows all come from here.

## The governing idea

Rather than 80 one-off screens and 80 one-off tables (unmaintainable, and each new rule means a new migration), the module is built on three generic, versioned stores that every one of the 17 areas plugs into:

1. **Settings** — a single record per area per school (Financial Profile, Currency, Fiscal Year, Billing Profile, Payroll Profile…). Stored as a versioned document.
2. **Reference lists** — coded, ordered, activatable items (Fee Categories, Charge Types, Payment Methods, Income Categories, Expense Categories, Chart of Accounts, Invoice Types, Document Templates…). One table, many list types.
3. **Rules** — ordered, conditional, dated entries (Billing Rules, Discount/Waiver/Penalty/Proration, Allocation, Aging, Approval Thresholds, Transaction Limits, Status Transitions…). One table, many rule types.

Each area of the tree is declared once in a **registry** in code: its key, label, which of the three shapes it uses, its field schema, and which modules consume it. The UI renders itself from the registry, so adding "Escalation Rules" later is a registry entry, not a new page and not a migration.

Everything is versioned with a lifecycle (Draft → Review → Approved → Scheduled → Active → Superseded → Archived), effective dates, full version history and an audit trail — that is area 17, and it applies to all the others rather than being a separate screen.

## Structure in the app

```text
Financial Configuration (super admin, school manager read-only)
  left rail: 01..17 + Transaction Lifecycle + Transaction Control
  each area  -> tabs for its sub-sections
  each section -> settings form | reference list editor | rules editor
  header     -> active version, status badge, effective date, History, Audit
```

## Consolidation (no duplication)

- `src/lib/finance.ts` hardcoded `INCOME_CATEGORIES`, `EXPENSE_CATEGORIES`, `FEE_TYPES`, fee/income/expense/payroll statuses and the `₵` symbol are removed as sources of truth and become **seed defaults** written into the config store when a school is provisioned. They remain only as a fallback for a school with no config yet.
- Currency and formatting stop being the hardcoded cedi helper; Financial Management formats through the configured currency/locale.
- Numbering: invoice/receipt numbering reuses the existing numbering engine pattern rather than a second one.
- System Configuration keeps school/level/class/subject/tenant policy; anything financial moves out of it and is referenced from here, not copied.
- Payroll components, fee categories, expense categories used by Financial Management all read the same config; no module keeps its own list.

## Delivery phases

Each phase ends compiling, passing typecheck, and safe to ship on its own.

**Phase 1 — Foundation**
Migration for the three stores plus version/audit tables, scoped by school, RLS: super admin writes, authenticated reads active config only. Registry file, schemas, server functions (`getFinanceConfig`, list/save/publish/archive), `useFinanceConfig` hook with an active-version cache. Module registered in access control (super admin full, school manager read-only) and routed.

**Phase 2 — Shell and generic editors**
The module shell (rail, tabs, version header), plus the three reusable editors (settings form, reference list, rules editor) and the lifecycle controls: save draft, submit for review, approve, schedule, activate, supersede, archive, with history and audit views.

**Phase 3 — Areas 01, 02, 06, 07 and the consolidation**
General config, Billing & Fees, Income & Revenue, Expense. Then rewire Financial Management (income/expense categories, fee types, statuses, currency) to consume config, with a migration seeding today's values so nothing changes visually for existing data.

**Phase 4 — Areas 03, 04, 05, 11**
Invoices, Payments, Receivables & Collections, Financial Documents — including invoice numbering wired to the numbering engine and document templates.

**Phase 5 — Areas 08, 09, 10**
Payroll (salary components, allowances, deductions, posting), Budget, Accounting & Tax including the chart of accounts and account mapping.

**Phase 6 — Areas 12, 13, 16 and Transaction Lifecycle / Control**
Approval & workflow, financial controls, security & compliance, then status definitions and transitions enforced server-side on finance writes: a transaction may only move between statuses the configuration allows, and locked periods reject edits.

**Phase 7 — Areas 14, 15**
Reporting definitions and KPIs feeding the Financial Management reports tab; archive and retention rules driving the archives module.

## Technical notes

- Tables: `finance_config_versions` (school_id, area_key, section_key, version, status, effective_from/to, payload jsonb, created_by, approved_by), `finance_reference_items` (school_id, list_key, code, name, parent_id, sort_order, active, metadata jsonb, version_id), `finance_rules` (school_id, rule_key, name, priority, conditions jsonb, actions jsonb, effective dates, active, version_id), `finance_config_audit`. Unique keys on (school_id, section_key, version) and (school_id, list_key, code).
- Every new public table gets explicit GRANTs, RLS enabled, super-admin-write / authenticated-read-active policies, and `set_updated_at` triggers, matching existing conventions.
- Resolution is server-side: a `resolveFinanceConfig(schoolId, at)` helper returns the active version for a point in time, so back-dated transactions use the rules that were in force then.
- Rules validate through Zod schemas declared in the registry, so a malformed rule can never be published.
- No change to existing finance tables in phase 1–2; later phases add nullable references only, so existing records keep working.

## What this does not do

It does not rewrite the Financial Management, Fees or Invoice screens' record-keeping. They keep their own data; they only stop inventing their own rules.
