import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONFIG_STATUSES,
  FINANCE_AREAS,
  STATUS_LABEL,
  STATUS_TRANSITIONS,
  defaultSettings,
  type AreaDef,
  type ConfigSection,
  type ConfigStatus,
  type FieldDef,
  type FinanceRule,
  type FinanceConfigAudit,
  type ReferenceItem,
  type SectionDef,
} from "@/lib/finance-config";
import {
  deleteFinanceConfigRow,
  getFinanceConfiguration,
  saveFinanceItem,
  saveFinanceRule,
  saveFinanceSection,
  seedFinanceDefaults,
  setFinanceSectionStatus,
} from "@/lib/finance-config.functions";

interface SchoolRow {
  id: string;
  name: string;
  code: string;
  currency: string;
  locale: string;
  active: boolean;
}

interface ConfigState {
  schools: SchoolRow[];
  schoolId: string | null;
  sections: ConfigSection[];
  items: ReferenceItem[];
  rules: FinanceRule[];
  audit: FinanceConfigAudit[];
}

const EMPTY: ConfigState = { schools: [], schoolId: null, sections: [], items: [], rules: [], audit: [] };

export function FinancialConfiguration() {
  const load = useServerFn(getFinanceConfiguration);
  const seed = useServerFn(seedFinanceDefaults);

  const [state, setState] = useState<ConfigState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [areaKey, setAreaKey] = useState<string>(FINANCE_AREAS[0]!.key);
  const [sectionKey, setSectionKey] = useState<string>(FINANCE_AREAS[0]!.sections[0]!.key);

  const refresh = useCallback(
    async (id?: string | null) => {
      const result = (await load({
        data: id ? { schoolId: id } : {},
      })) as unknown as ConfigState;
      setState(result);
      setSchoolId(result.schoolId);
      setLoading(false);
    },
    [load],
  );

  useEffect(() => {
    void refresh().catch((e: Error) => {
      toast.error(e.message);
      setLoading(false);
    });
  }, [refresh]);

  const area = FINANCE_AREAS.find((a) => a.key === areaKey) ?? FINANCE_AREAS[0]!;
  const section = area.sections.find((s) => s.key === sectionKey) ?? area.sections[0]!;
  const school = state.schools.find((s) => s.id === schoolId) ?? null;

  const selectArea = (a: AreaDef) => {
    setAreaKey(a.key);
    setSectionKey(a.sections[0]!.key);
  };

  const runSeed = async () => {
    if (!schoolId) return;
    setBusy(true);
    try {
      const r = await seed({ data: { schoolId } });
      toast.success(`Loaded ${r.items} default entries and ${r.sections} default settings.`);
      await refresh(schoolId);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="surface flex items-center gap-3 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Loading financial configuration…
      </section>
    );
  }

  if (!schoolId) {
    return (
      <section className="surface p-6">
        <h2 className="text-lg font-semibold">No school yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Provision a school under System Configuration first — financial configuration belongs to a
          school.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="surface flex flex-wrap items-end justify-between gap-4 p-5">
        <div className="min-w-56 space-y-1.5">
          <Label htmlFor="fc-school">School</Label>
          <Select
            value={schoolId}
            onValueChange={(v) => {
              setSchoolId(v);
              void refresh(v);
            }}
          >
            <SelectTrigger id="fc-school">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {state.schools.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <p className="max-w-md text-xs text-muted-foreground">
            This is the single source of truth for financial behaviour. Transaction records stay in
            their own modules; the rules they follow live here.
          </p>
          <Button variant="outline" onClick={runSeed} disabled={busy}>
            <Sparkles className="mr-2 size-4" aria-hidden /> Load defaults
          </Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav className="surface h-fit p-2" aria-label="Financial configuration areas">
          <ul className="space-y-0.5">
            {FINANCE_AREAS.map((a) => (
              <li key={a.key}>
                <button
                  type="button"
                  onClick={() => selectArea(a)}
                  className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    a.key === area.key
                      ? "bg-primary/10 font-semibold text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="text-xs tabular-nums text-muted-foreground">{a.number}</span>
                  <span>{a.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-4">
          <div className="surface flex flex-wrap gap-1.5 p-2">
            {area.sections.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSectionKey(s.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  s.key === section.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {section.kind === "settings" ? (
            <SettingsSection
              key={section.key}
              area={area}
              section={section}
              schoolId={schoolId}
              school={school}
              versions={state.sections.filter((v) => v.section_key === section.key)}
              onChanged={() => refresh(schoolId)}
            />
          ) : section.kind === "list" ? (
            <ListSection
              key={section.key}
              section={section}
              schoolId={schoolId}
              items={state.items.filter((i) => i.list_key === section.key)}
              onChanged={() => refresh(schoolId)}
            />
          ) : section.kind === "rules" ? (
            <RulesSection
              key={section.key}
              section={section}
              schoolId={schoolId}
              rules={state.rules.filter((r) => r.rule_key === section.key)}
              onChanged={() => refresh(schoolId)}
            />
          ) : (
            <AuditSection entries={state.audit} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- settings ------------------------------- */

function SettingsSection({
  area,
  section,
  schoolId,
  school,
  versions,
  onChanged,
}: {
  area: AreaDef;
  section: SectionDef;
  schoolId: string;
  school: SchoolRow | null;
  versions: ConfigSection[];
  onChanged: () => void | Promise<void>;
}) {
  const save = useServerFn(saveFinanceSection);
  const setStatus = useServerFn(setFinanceSectionStatus);

  const current = versions.find((v) => v.status === "draft") ?? versions[0] ?? null;
  const activeVersion = versions.find((v) => v.status === "active") ?? null;
  const seeded = useMemo(
    () => defaultSettings(section.key, { currency: school?.currency ?? "GHS", locale: school?.locale ?? "en-GH" }) ?? {},
    [section.key, school],
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const source = (current?.payload ?? seeded) as Record<string, unknown>;
    const next: Record<string, string> = {};
    for (const f of section.fields ?? []) next[f.key] = String(source[f.key] ?? "");
    setValues(next);
    setNotes(current?.notes ?? "");
    setEffectiveFrom(current?.effective_from ?? "");
  }, [current?.id, section.key]);

  const submit = async (newVersion: boolean) => {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of section.fields ?? []) {
        const raw = values[f.key] ?? "";
        payload[f.key] = f.type === "number" ? (raw === "" ? null : Number(raw)) : raw;
      }
      await save({
        data: {
          schoolId,
          sectionKey: section.key,
          payload,
          notes,
          effectiveFrom: effectiveFrom || null,
          newVersion,
        },
      });
      toast.success(newVersion ? "New version created." : "Draft saved.");
      await onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const move = async (id: string, status: ConfigStatus) => {
    setBusy(true);
    try {
      await setStatus({ data: { id, status } });
      toast.success(`Moved to ${STATUS_LABEL[status].toLowerCase()}.`);
      await onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="surface p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{section.name}</h2>
            <p className="text-xs text-muted-foreground">
              {area.number} · {area.name}
              {section.consumers?.length ? ` · used by ${section.consumers.join(", ")}` : ""}
            </p>
          </div>
          {activeVersion ? (
            <Badge variant="secondary">
              Active v{activeVersion.version}
              {activeVersion.effective_from ? ` from ${activeVersion.effective_from}` : ""}
            </Badge>
          ) : (
            <Badge variant="outline">Not activated</Badge>
          )}
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {(section.fields ?? []).map((f) => (
            <Field
              key={f.key}
              field={f}
              value={values[f.key] ?? ""}
              onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
            />
          ))}
          <div className="space-y-1.5">
            <Label htmlFor={`${section.key}-eff`}>Effective from</Label>
            <Input
              id={`${section.key}-eff`}
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`${section.key}-notes`}>Change note</Label>
            <Textarea
              id={`${section.key}-notes`}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => submit(false)} disabled={busy}>
            <Save className="mr-2 size-4" aria-hidden /> Save draft
          </Button>
          <Button variant="outline" onClick={() => submit(true)} disabled={busy}>
            New version
          </Button>
        </div>
      </section>

      <section className="surface p-5">
        <h3 className="mb-3 text-sm font-semibold">Version history</h3>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No versions yet — save a draft to begin.</p>
        ) : (
          <ul className="space-y-2">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="text-sm">
                  <span className="font-medium">Version {v.version}</span>{" "}
                  <Badge variant={v.status === "active" ? "default" : "outline"} className="ml-1">
                    {STATUS_LABEL[v.status]}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {v.effective_from ? `Effective ${v.effective_from}. ` : ""}
                    {v.notes || "No note."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(STATUS_TRANSITIONS[v.status] ?? []).map((next) => (
                    <Button
                      key={next}
                      size="sm"
                      variant={next === "active" ? "default" : "outline"}
                      disabled={busy}
                      onClick={() => move(v.id, next)}
                    >
                      {STATUS_LABEL[next]}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Lifecycle: {CONFIG_STATUSES.map((s) => STATUS_LABEL[s]).join(" → ")}.
        </p>
      </section>
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = `fld-${field.key}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{field.label}</Label>
      {field.type === "textarea" ? (
        <Textarea id={id} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "select" ? (
        <Select {...(value ? { value } : {})} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={value}
          placeholder={field.placeholder ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null}
    </div>
  );
}

/* ------------------------------ list editor ------------------------------ */

const blankItem = () => ({
  id: undefined as string | undefined,
  code: "",
  name: "",
  description: "",
  sortOrder: 1,
  active: true,
  metadata: {} as Record<string, string>,
});

function ListSection({
  section,
  schoolId,
  items,
  onChanged,
}: {
  section: SectionDef;
  schoolId: string;
  items: ReferenceItem[];
  onChanged: () => void | Promise<void>;
}) {
  const save = useServerFn(saveFinanceItem);
  const remove = useServerFn(deleteFinanceConfigRow);
  const [form, setForm] = useState(blankItem());
  const [busy, setBusy] = useState(false);

  const reset = () => setForm(blankItem());

  const submit = async () => {
    setBusy(true);
    try {
      await save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          schoolId,
          listKey: section.key,
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description,
          sortOrder: Number(form.sortOrder) || 1,
          active: form.active,
          metadata: form.metadata,
        },
      });
      toast.success(form.id ? "Entry updated." : "Entry added.");
      reset();
      await onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (i: ReferenceItem) =>
    setForm({
      id: i.id,
      code: i.code,
      name: i.name,
      description: i.description,
      sortOrder: i.sort_order,
      active: i.active,
      metadata: Object.fromEntries(
        Object.entries(i.metadata ?? {}).map(([k, v]) => [k, String(v ?? "")]),
      ),
    });

  const drop = async (id: string) => {
    setBusy(true);
    try {
      await remove({ data: { id, kind: "item" } });
      await onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="surface p-5">
        <header className="mb-4">
          <h2 className="text-lg font-semibold">{section.name}</h2>
          {section.consumers?.length ? (
            <p className="text-xs text-muted-foreground">Used by {section.consumers.join(", ")}.</p>
          ) : null}
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="li-code">Code</Label>
            <Input
              id="li-code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="tuition"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="li-name">Name</Label>
            <Input
              id="li-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="li-order">Order</Label>
            <Input
              id="li-order"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
            />
          </div>
          {(section.itemFields ?? []).map((f) => (
            <Field
              key={f.key}
              field={f}
              value={form.metadata[f.key] ?? ""}
              onChange={(v) => setForm((s) => ({ ...s, metadata: { ...s.metadata, [f.key]: v } }))}
            />
          ))}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="li-desc">Description</Label>
            <Input
              id="li-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch
              id="li-active"
              checked={form.active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
            />
            <Label htmlFor="li-active">Active</Label>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={submit} disabled={busy || !form.code || !form.name}>
            {form.id ? <Save className="mr-2 size-4" aria-hidden /> : <Plus className="mr-2 size-4" aria-hidden />}
            {form.id ? "Save entry" : "Add entry"}
          </Button>
          {form.id ? (
            <Button variant="ghost" onClick={reset}>
              <X className="mr-2 size-4" aria-hidden /> Cancel
            </Button>
          ) : null}
        </div>
      </section>

      <section className="surface p-5">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing configured yet. Add entries above, or load the platform defaults.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="text-sm">
                  <span className="font-medium">{i.name}</span>{" "}
                  <code className="rounded bg-muted px-1 text-xs">{i.code}</code>
                  {!i.active ? (
                    <Badge variant="outline" className="ml-2">
                      Inactive
                    </Badge>
                  ) : null}
                  {i.description ? (
                    <p className="text-xs text-muted-foreground">{i.description}</p>
                  ) : null}
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => edit(i)}>
                    <Pencil className="size-3.5" aria-hidden />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => drop(i.id)} disabled={busy}>
                    <Trash2 className="size-3.5 text-destructive" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------ rules editor ------------------------------ */

const blankRule = () => ({
  id: undefined as string | undefined,
  name: "",
  description: "",
  priority: 1,
  when: "",
  then: "",
  effectiveFrom: "",
  effectiveTo: "",
  active: true,
});

function RulesSection({
  section,
  schoolId,
  rules,
  onChanged,
}: {
  section: SectionDef;
  schoolId: string;
  rules: FinanceRule[];
  onChanged: () => void | Promise<void>;
}) {
  const save = useServerFn(saveFinanceRule);
  const remove = useServerFn(deleteFinanceConfigRow);
  const [form, setForm] = useState(blankRule());
  const [busy, setBusy] = useState(false);

  const reset = () => setForm(blankRule());

  const submit = async () => {
    setBusy(true);
    try {
      await save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          schoolId,
          ruleKey: section.key,
          name: form.name.trim(),
          description: form.description,
          priority: Number(form.priority) || 1,
          conditions: { when: form.when },
          actions: { then: form.then },
          effectiveFrom: form.effectiveFrom || null,
          effectiveTo: form.effectiveTo || null,
          active: form.active,
        },
      });
      toast.success(form.id ? "Rule updated." : "Rule added.");
      reset();
      await onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (r: FinanceRule) =>
    setForm({
      id: r.id,
      name: r.name,
      description: r.description,
      priority: r.priority,
      when: String((r.conditions as Record<string, unknown>)?.["when"] ?? ""),
      then: String((r.actions as Record<string, unknown>)?.["then"] ?? ""),
      effectiveFrom: r.effective_from ?? "",
      effectiveTo: r.effective_to ?? "",
      active: r.active,
    });

  const drop = async (id: string) => {
    setBusy(true);
    try {
      await remove({ data: { id, kind: "rule" } });
      await onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="surface p-5">
        <header className="mb-4">
          <h2 className="text-lg font-semibold">{section.name}</h2>
          <p className="text-xs text-muted-foreground">
            Rules run in priority order, lowest first, and only inside their effective dates.
            {section.consumers?.length ? ` Used by ${section.consumers.join(", ")}.` : ""}
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ru-name">Rule name</Label>
            <Input
              id="ru-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ru-priority">Priority</Label>
            <Input
              id="ru-priority"
              type="number"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ru-when">When</Label>
            <Textarea
              id="ru-when"
              rows={2}
              placeholder="e.g. balance is unpaid 14 days after the due date"
              value={form.when}
              onChange={(e) => setForm((f) => ({ ...f, when: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ru-then">Then</Label>
            <Textarea
              id="ru-then"
              rows={2}
              placeholder="e.g. add a 5% late penalty"
              value={form.then}
              onChange={(e) => setForm((f) => ({ ...f, then: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ru-from">Effective from</Label>
            <Input
              id="ru-from"
              type="date"
              value={form.effectiveFrom}
              onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ru-to">Effective to</Label>
            <Input
              id="ru-to"
              type="date"
              value={form.effectiveTo}
              onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="ru-active"
              checked={form.active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
            />
            <Label htmlFor="ru-active">Active</Label>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={submit} disabled={busy || !form.name}>
            {form.id ? <Save className="mr-2 size-4" aria-hidden /> : <Plus className="mr-2 size-4" aria-hidden />}
            {form.id ? "Save rule" : "Add rule"}
          </Button>
          {form.id ? (
            <Button variant="ghost" onClick={reset}>
              <X className="mr-2 size-4" aria-hidden /> Cancel
            </Button>
          ) : null}
        </div>
      </section>

      <section className="surface p-5">
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rules configured here yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rules.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="text-sm">
                  <span className="font-medium">
                    {r.priority}. {r.name}
                  </span>
                  {!r.active ? (
                    <Badge variant="outline" className="ml-2">
                      Inactive
                    </Badge>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    When {String((r.conditions as Record<string, unknown>)?.["when"] ?? "—")} → then{" "}
                    {String((r.actions as Record<string, unknown>)?.["then"] ?? "—")}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => edit(r)}>
                    <Pencil className="size-3.5" aria-hidden />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => drop(r.id)} disabled={busy}>
                    <Trash2 className="size-3.5 text-destructive" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* --------------------------------- audit --------------------------------- */

function AuditSection({ entries }: { entries: FinanceConfigAudit[] }) {
  return (
    <section className="surface p-5">
      <h2 className="mb-3 text-lg font-semibold">Configuration Audit Trail</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No configuration changes recorded yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((e) => (
            <li key={e.id} className="py-2.5 text-sm">
              <span className="font-medium">{e.description}</span>
              <p className="text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleString()} · {e.section_key} ·{" "}
                {e.actor_email ?? "system"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
