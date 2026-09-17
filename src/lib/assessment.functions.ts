import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assessmentIdSchema, assessmentInputSchema } from "@/lib/assessment.schemas";

/** Students available for assessment entry. */
export const getAssessmentStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("admissions")
      .select("id, admission_number, student_name, class_admitted, parent_name, parent_phone")
      .order("student_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** All assessment records with the student attached. */
export const listAssessments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("student_assessments")
      .select(
        "id, admission_id, class_name, term, subject, assessment_type, score, out_of, remark, created_at, admissions(student_name, admission_number)",
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      const student = (row as { admissions?: { student_name?: string; admission_number?: string | null } | null })
        .admissions;
      return {
        id: row.id,
        admissionId: row.admission_id,
        studentName: student?.student_name ?? "Unknown student",
        admissionNumber: student?.admission_number ?? null,
        className: row.class_name,
        term: row.term,
        subject: row.subject,
        assessmentType: row.assessment_type,
        score: Number(row.score),
        outOf: Number(row.out_of),
        remark: row.remark,
        createdAt: row.created_at,
      };
    });
  });

/** Create or update one assessment record. */
export const saveAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assessmentInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const row = {
      admission_id: data.admissionId,
      class_name: data.className,
      term: data.term,
      subject: data.subject,
      assessment_type: data.assessmentType,
      score: data.score,
      out_of: data.outOf,
      remark: data.remark,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("student_assessments")
        .update(row)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id, updated: true };
    }

    const { data: inserted, error } = await context.supabase
      .from("student_assessments")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id, updated: false };
  });

/** Remove one assessment record. */
export const deleteAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assessmentIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("student_assessments")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { deleted: true };
  });
