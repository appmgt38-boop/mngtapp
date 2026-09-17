import { z } from "zod";

export const ASSESSMENT_TYPES = [
  "Exam",
  "Homework",
  "Project",
  "Exercise",
  "Quiz",
  "Assignment",
] as const;

export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const assessmentInputSchema = z.object({
  id: z.string().uuid().optional(),
  admissionId: z.string().uuid({ message: "Select a student." }),
  className: z.string().max(80).default(""),
  term: z.string().min(1, "Enter the term.").max(60),
  subject: z.string().min(1, "Enter the subject.").max(80),
  assessmentType: z.enum(ASSESSMENT_TYPES),
  score: z.number().min(0, "Score cannot be negative."),
  outOf: z.number().positive("Out of must be greater than zero."),
  remark: z.string().max(300).default(""),
});

export const assessmentIdSchema = z.object({ id: z.string().uuid() });

export type AssessmentInput = z.infer<typeof assessmentInputSchema>;
