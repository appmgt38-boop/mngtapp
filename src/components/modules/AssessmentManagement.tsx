import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ASSESSMENT_TYPES, type AssessmentType } from "@/lib/assessment.schemas";
import {
  deleteAssessment,
  getAssessmentStudents,
  listAssessments,
  saveAssessment,
} from "@/lib/assessment.functions";

interface StudentRow {
  id: string;
  admission_number: string | null;
  student_name: string;
  class_admitted: string;
  parent_name: string | null;
  parent_phone: string | null;
}

interface AssessmentRow {
  id: string;
  admissionId: string;
  studentName: string;
  admissionNumber: string | null;
  className: string;
  term: string;
  subject: string;
  assessmentType: string;
  score: number;
  outOf: number;
  remark: string;
  createdAt: string;
}

const emptyForm = {
  id: "" as string,
  admissionId: "",
  className: "",
  term: "",
  subject: "",
  assessmentType: "Exam" as AssessmentType,
  score: "",
  outOf: "",
  remark: "",
};

const pct = (score: number, outOf: number) => (outOf > 0 ? (score / outOf) * 100 : 0);

export function AssessmentManagement() {
  const loadStudents = useServerFn(getAssessmentStudents);
  const loadAssessments = useServerFn(listAssessments);
  const save = useServerFn(saveAssessment);
  const remove = useServerFn(deleteAssessment);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [rows, setRows] = useState<AssessmentRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [filterStudent, setFilterStudent] = useState("all");
  const [filterClass, setFilterClass] = useState("");
  const [filterTerm, setFilterTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const refresh = async () => {
    try {
      setRows((await loadAssessments()) as AssessmentRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load assessments.");
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        setStudents((await loadStudents()) as StudentRow[]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load students.");
      }
      await refresh();
      setLoading(false);
    })();
  }, []);

  const selectedStudent = students.find((s) => s.id === form.admissionId) ?? null;

  const filtered = useMemo(() => {
    const has = (value: string, needle: string) =>
      !needle.trim() || value.toLowerCase().includes(needle.trim().toLowerCase());
    return rows.filter(
      (r) =>
        (filterStudent === "all" || r.admissionId === filterStudent) &&
        has(r.className, filterClass) &&
        has(r.term, filterTerm) &&
        has(r.subject, filterSubject),
    );
  }, [rows, filterStudent, filterClass, filterTerm, filterSubject]);

  const subjectAverages = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const r of filtered) {
      const list = map.get(r.subject) ?? [];
      list.push(pct(r.score, r.outOf));
      map.set(r.subject, list);
    }
    return [...map.entries()]
      .map(([subject, values]) => ({
        subject,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length,
      }))
      .sort((a, b) => b.average - a.average);
  }, [filtered]);

  const onPickStudent = (id: string) => {
    const student = students.find((s) => s.id === id);
    setForm((f) => ({ ...f, admissionId: id, className: student?.class_admitted ?? f.className }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.admissionId) {
      toast.error("Select a student first.");
      return;
    }
    setBusy(true);
    try {
      await save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          admissionId: form.admissionId,
          className: form.className,
          term: form.term,
          subject: form.subject,
          assessmentType: form.assessmentType,
          score: Number(form.score),
          outOf: Number(form.outOf),
          remark: form.remark,
        },
      });
      toast.success(form.id ? "Assessment updated." : "Assessment recorded.");
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the assessment.");
    } finally {
      setBusy(false);
    }
  };

  const edit = (row: AssessmentRow) => {
    setForm({
      id: row.id,
      admissionId: row.admissionId,
      className: row.className,
      term: row.term,
      subject: row.subject,
      assessmentType: (ASSESSMENT_TYPES as readonly string[]).includes(row.assessmentType)
        ? (row.assessmentType as AssessmentType)
        : "Exam",
      score: String(row.score),
      outOf: String(row.outOf),
      remark: row.remark,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const destroy = async (row: AssessmentRow) => {
    if (!window.confirm(`Delete the ${row.subject} record for ${row.studentName}?`)) return;
    try {
      await remove({ data: { id: row.id } });
      toast.success("Assessment deleted.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the assessment.");
    }
  };

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error("There is nothing to export.");
      return;
    }
    const header = "Student,Class,Term,Subject,Type,Score,Out Of,Percentage,Remark\n";
    const body = filtered
      .map((r) =>
        [
          r.studentName,
          r.className,
          r.term,
          r.subject,
          r.assessmentType,
          r.score,
          r.outOf,
          `${pct(r.score, r.outOf).toFixed(2)}%`,
          r.remark,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "assessments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="surface flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Loading assessments…
      </div>
    );
  }

  return (
    <Tabs defaultValue="record" className="space-y-6">
      <TabsList>
        <TabsTrigger value="record">Record</TabsTrigger>
        <TabsTrigger value="records">Records</TabsTrigger>
        <TabsTrigger value="report">Performance</TabsTrigger>
      </TabsList>

      <TabsContent value="record" className="space-y-6">
        <form onSubmit={submit} className="surface space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {form.id ? "Update assessment" : "Add assessment"}
            </h2>
            {form.id ? (
              <Button type="button" variant="ghost" onClick={() => setForm(emptyForm)}>
                <X className="size-4" aria-hidden /> Cancel edit
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Select value={form.admissionId} onValueChange={onPickStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.student_name}
                      {s.admission_number ? ` (${s.admission_number})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field label="Class">
              <Input
                value={form.className}
                onChange={(e) => setForm({ ...form, className: e.target.value })}
                placeholder="Class"
              />
            </Field>
            <Field label="Term">
              <Input
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
                placeholder="Term 1"
                required
              />
            </Field>
            <Field label="Subject">
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Mathematics"
                required
              />
            </Field>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.assessmentType}
                onValueChange={(v) => setForm({ ...form, assessmentType: v as AssessmentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field label="Score">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.score}
                onChange={(e) => setForm({ ...form, score: e.target.value })}
                required
              />
            </Field>
            <Field label="Out of">
              <Input
                type="number"
                min="1"
                step="0.01"
                value={form.outOf}
                onChange={(e) => setForm({ ...form, outOf: e.target.value })}
                required
              />
            </Field>
            <Field label="Remark">
              <Input
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
                placeholder="Optional comment"
              />
            </Field>
          </div>

          {selectedStudent ? (
            <div className="grid gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-4">
              <Meta label="Name" value={selectedStudent.student_name} />
              <Meta label="Class" value={selectedStudent.class_admitted} />
              <Meta label="Parent" value={selectedStudent.parent_name ?? "—"} />
              <Meta label="Contact" value={selectedStudent.parent_phone ?? "—"} />
            </div>
          ) : null}

          <Button type="submit" disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            {form.id ? "Update assessment" : "Add assessment"}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="records" className="space-y-6">
        <section className="surface space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Select value={filterStudent} onValueChange={setFilterStudent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.student_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field label="Class">
              <Input value={filterClass} onChange={(e) => setFilterClass(e.target.value)} />
            </Field>
            <Field label="Term">
              <Input value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} />
            </Field>
            <Field label="Subject">
              <Input value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} />
            </Field>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={exportCsv}>
                <Download className="size-4" aria-hidden /> Export CSV
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-2">Student</th>
                  <th className="p-2">Class</th>
                  <th className="p-2">Term</th>
                  <th className="p-2">Subject</th>
                  <th className="p-2">Type</th>
                  <th className="p-2 text-right">Score</th>
                  <th className="p-2 text-right">Out of</th>
                  <th className="p-2 text-right">%</th>
                  <th className="p-2">Remark</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="p-2 font-medium">{r.studentName}</td>
                    <td className="p-2">{r.className || "—"}</td>
                    <td className="p-2">{r.term}</td>
                    <td className="p-2">{r.subject}</td>
                    <td className="p-2">{r.assessmentType}</td>
                    <td className="p-2 text-right">{r.score}</td>
                    <td className="p-2 text-right">{r.outOf}</td>
                    <td className="p-2 text-right">{pct(r.score, r.outOf).toFixed(2)}%</td>
                    <td className="p-2 text-muted-foreground">{r.remark || "—"}</td>
                    <td className="p-2">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => edit(r)}>
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => void destroy(r)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-muted-foreground">
                      No assessment records match these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </TabsContent>

      <TabsContent value="report" className="space-y-6">
        <section className="surface space-y-4 p-6">
          <h2 className="text-lg font-semibold">Subject performance</h2>
          <p className="text-sm text-muted-foreground">
            Averages across the {filtered.length} record(s) matching the current filters.
          </p>
          <div className="space-y-3">
            {subjectAverages.map((s) => (
              <div key={s.subject} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{s.subject}</span>
                  <span className="text-muted-foreground">
                    {s.average.toFixed(2)}% · {s.count} record(s)
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(s.average, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {subjectAverages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data to summarise yet.</p>
            ) : null}
          </div>
        </section>
      </TabsContent>
    </Tabs>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
