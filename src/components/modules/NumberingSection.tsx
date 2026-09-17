import { useEffect, useState } from "react";
import { Hash, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { School } from "@/lib/config";
import { numberingSchema, type NumberingInput } from "@/lib/config.schemas";
import {
  DEFAULT_NUMBER_FORMAT,
  capacity,
  composedLength,
  previewNumber,
  schoolCodeDigits,
  type NumberingSettings,
} from "@/lib/numbering";

type Errors = Record<string, string>;

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function NumberingSection({
  school,
  numbering,
  busy,
  onSave,
}: {
  school: School | null;
  numbering: NumberingSettings | null;
  busy: boolean;
  onSave: (payload: NumberingInput) => Promise<boolean>;
}) {
  const [form, setForm] = useState<NumberingInput | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!school) {
      setForm(null);
      return;
    }
    setForm({
      schoolId: school.id,
      schoolCode: numbering?.school_code ?? schoolCodeDigits(school.code),
      admissionFormat: numbering?.admission_format ?? DEFAULT_NUMBER_FORMAT,
      admissionTotalDigits: numbering?.admission_total_digits ?? 10,
      admissionYearDigits: numbering?.admission_year_digits ?? 2,
      admissionSequenceDigits: numbering?.admission_sequence_digits ?? 4,
      admissionSequenceStart: numbering?.admission_sequence_start ?? 1,
      employeeFormat: numbering?.employee_format ?? DEFAULT_NUMBER_FORMAT,
      employeeTotalDigits: numbering?.employee_total_digits ?? 7,
      employeeYearDigits: numbering?.employee_year_digits ?? 2,
      employeeSequenceDigits: numbering?.employee_sequence_digits ?? 1,
      employeeSequenceStart: numbering?.employee_sequence_start ?? 1,
      employeeAllocationMode: numbering?.employee_allocation_mode ?? "compact",
    });
    setErrors({});
  }, [school, numbering]);

  if (!school || !form) {
    return <p className="text-sm text-muted-foreground">Add a school first to set up numbering.</p>;
  }

  const set = <K extends keyof NumberingInput>(key: K, value: NumberingInput[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const admissionPreview = previewNumber({
    format: form.admissionFormat,
    schoolCode: form.schoolCode,
    yearDigits: form.admissionYearDigits,
    sequenceDigits: form.admissionSequenceDigits,
    sequenceStart: form.admissionSequenceStart,
  });
  const employeePreview = previewNumber({
    format: form.employeeFormat,
    schoolCode: form.schoolCode,
    yearDigits: form.employeeYearDigits,
    sequenceDigits: form.employeeSequenceDigits,
    sequenceStart: form.employeeSequenceStart,
  });
  const admissionLength = composedLength(
    form.admissionFormat,
    form.admissionYearDigits,
    form.admissionSequenceDigits,
  );
  const employeeLength = composedLength(
    form.employeeFormat,
    form.employeeYearDigits,
    form.employeeSequenceDigits,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = numberingSchema.safeParse(form);
    if (!result.success) {
      const next: Errors = {};
      for (const issue of result.error.issues) next[issue.path.join(".") || "form"] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    await onSave(result.data);
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-xl border border-border p-5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Hash className="size-4" aria-hidden /> School code
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Four digits that begin every admission number and employee ID for {school.name}.
        </p>
        <div className="mt-3 max-w-[200px]">
          <Field label="School code (4 digits)" error={errors["schoolCode"]}>
            <Input
              inputMode="numeric"
              maxLength={4}
              className="font-mono"
              value={form.schoolCode}
              onChange={(e) => set("schoolCode", e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </Field>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <fieldset className="space-y-4 rounded-xl border border-border p-5">
          <legend className="px-1 text-sm font-semibold">Admission numbering</legend>
          <Field
            label="Template"
            hint="Use {SCHOOL}, {YY} and {SEQ}."
            error={errors["admissionFormat"]}
          >
            <Input
              className="font-mono"
              value={form.admissionFormat}
              onChange={(e) => set("admissionFormat", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Total digits" error={errors["admissionTotalDigits"]}>
              <NumberInput
                min={6}
                max={20}
                value={form.admissionTotalDigits}
                onChange={(v) => set("admissionTotalDigits", v)}
              />
            </Field>
            <Field label="Year digits" error={errors["admissionYearDigits"]}>
              <NumberInput
                min={0}
                max={4}
                value={form.admissionYearDigits}
                onChange={(v) => set("admissionYearDigits", v)}
              />
            </Field>
            <Field label="Sequence digits" error={errors["admissionSequenceDigits"]}>
              <NumberInput
                min={1}
                max={8}
                value={form.admissionSequenceDigits}
                onChange={(v) => set("admissionSequenceDigits", v)}
              />
            </Field>
            <Field label="Sequence starts at" error={errors["admissionSequenceStart"]}>
              <NumberInput
                min={0}
                max={99999999}
                value={form.admissionSequenceStart}
                onChange={(v) => set("admissionSequenceStart", v)}
              />
            </Field>
          </div>
          <p className="text-sm">
            Next number: <span className="font-mono font-semibold">{admissionPreview}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {admissionLength} characters produced ·{" "}
            {capacity(form.admissionSequenceDigits, form.admissionSequenceStart).toLocaleString()} students per
            year
            {admissionLength !== form.admissionTotalDigits
              ? " · does not match the total length above"
              : ""}
          </p>
        </fieldset>

        <fieldset className="space-y-4 rounded-xl border border-border p-5">
          <legend className="px-1 text-sm font-semibold">Employee numbering</legend>
          <Field
            label="Template"
            hint="Use {SCHOOL}, {YY} and {SEQ}."
            error={errors["employeeFormat"]}
          >
            <Input
              className="font-mono"
              value={form.employeeFormat}
              onChange={(e) => set("employeeFormat", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Total digits" error={errors["employeeTotalDigits"]}>
              <NumberInput
                min={5}
                max={20}
                value={form.employeeTotalDigits}
                onChange={(v) => set("employeeTotalDigits", v)}
              />
            </Field>
            <Field label="Year digits" error={errors["employeeYearDigits"]}>
              <NumberInput
                min={0}
                max={4}
                value={form.employeeYearDigits}
                onChange={(v) => set("employeeYearDigits", v)}
              />
            </Field>
            <Field label="Sequence digits" error={errors["employeeSequenceDigits"]}>
              <NumberInput
                min={1}
                max={8}
                value={form.employeeSequenceDigits}
                onChange={(v) => set("employeeSequenceDigits", v)}
              />
            </Field>
            <Field label="Sequence starts at" error={errors["employeeSequenceStart"]}>
              <NumberInput
                min={0}
                max={99999999}
                value={form.employeeSequenceStart}
                onChange={(v) => set("employeeSequenceStart", v)}
              />
            </Field>
          </div>
          <Field
            label="Allocation"
            hint="Compact fills numbers in order; random picks an unused number in the range."
            error={errors["employeeAllocationMode"]}
          >
            <Select
              value={form.employeeAllocationMode}
              onValueChange={(v) => set("employeeAllocationMode", v as "compact" | "random")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact (sequential)</SelectItem>
                <SelectItem value="random">Random</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <p className="text-sm">
            Example: <span className="font-mono font-semibold">{employeePreview}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {employeeLength} characters produced ·{" "}
            {capacity(form.employeeSequenceDigits, form.employeeSequenceStart).toLocaleString()} staff per year
            {employeeLength !== form.employeeTotalDigits
              ? " · does not match the total length above"
              : ""}
          </p>
        </fieldset>
      </div>

      <Button type="submit" disabled={busy}>
        <Save className="size-4" aria-hidden /> Save numbering
      </Button>
    </form>
  );
}
