import { z } from "zod";
import { CURRENCIES, DATE_FORMATS, GRADING_SYSTEMS } from "@/lib/config";

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

/** Machine keys stay lowercase, hyphen/underscore only — they end up in URLs and RLS. */
export const codeSchema = trimmed(2, 40)
  .regex(/^[a-z0-9][a-z0-9-_]*$/, "Use lowercase letters, numbers and hyphens.");

/** Subject/school codes are shown to humans in uppercase. */
export const upperCodeSchema = trimmed(2, 20)
  .regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/, "Use letters, numbers and hyphens.")
  .transform((v) => v.toUpperCase());

const hexColor = trimmed(4, 9).regex(/^#([0-9a-fA-F]{6})$/, "Use a 6-digit hex colour, e.g. #2f6f8f.");
const currency = trimmed(3, 3)
  .transform((v) => v.toUpperCase())
  .refine((v) => CURRENCIES.includes(v) || /^[A-Z]{3}$/.test(v), "Use a 3-letter ISO currency code.");
const locale = trimmed(2, 12).regex(/^[a-z]{2}(-[A-Za-z0-9]{2,8})*$/, "Use a locale like en-GH.");
const timezone = trimmed(1, 60).regex(/^[A-Za-z_]+(\/[A-Za-z_+\-0-9]+)*$/, "Use an IANA timezone, e.g. Africa/Accra.");

export const idSchema = z.object({ id: z.string().uuid() });

export const schoolTypeSchema = z.object({
  code: codeSchema,
  name: trimmed(2, 120),
  description: z.string().trim().max(400).default(""),
  active: z.boolean().default(true),
});

export const educationLevelSchema = z
  .object({
    code: codeSchema,
    name: trimmed(2, 120),
    sortOrder: z.number().int().min(1).max(99),
    minAge: z.number().int().min(0).max(99).nullable().optional(),
    maxAge: z.number().int().min(0).max(99).nullable().optional(),
    active: z.boolean().default(true),
  })
  .refine(
    (v) => v.minAge == null || v.maxAge == null || v.maxAge >= v.minAge,
    { message: "Maximum age must be at or above the minimum age.", path: ["maxAge"] },
  );

export const schoolSchema = z.object({
  name: trimmed(2, 160),
  code: upperCodeSchema,
  country: trimmed(2, 80),
  region: z.string().trim().max(80).default(""),
  district: z.string().trim().max(120).default(""),
  town: z.string().trim().max(120).default(""),
  community: z.string().trim().max(120).default(""),
  postalAddress: z.string().trim().max(200).default(""),
  gpsAddress: z
    .string()
    .trim()
    .max(30)
    .default("")
    .refine(
      (v) => v === "" || /^[A-Za-z]{2}-\d{3,4}-\d{3,4}$/.test(v),
      "Use a Ghana Post GPS address like GA-123-4567.",
    ),
  timezone: timezone.default("UTC"),
  currency,
  locale,
  typeCode: codeSchema,
  levelCodes: z.array(codeSchema).min(1, "Select at least one education level.").max(20),
  active: z.boolean().default(true),
});

export const updateSchoolSchema = schoolSchema.partial().extend({ id: z.string().uuid() });

export const subjectSchema = z.object({
  schoolId: z.string().uuid(),
  levelCode: codeSchema,
  code: upperCodeSchema,
  name: trimmed(2, 160),
  credits: z.number().min(0).max(100).nullable().optional(),
  elective: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const tenantSettingsSchema = z.object({
  schoolId: z.string().uuid(),
  positions: z.array(trimmed(1, 80)).max(60),
  departments: z.array(trimmed(1, 80)).max(60),
  scheduleTypes: z.array(trimmed(1, 80)).max(60),
  ratingScale: z
    .array(z.object({ value: trimmed(1, 8), label: trimmed(1, 60) }))
    .max(10)
    .optional(),
  gradingSystem: z.enum(GRADING_SYSTEMS),
  academicYearStartMonth: z.number().int().min(1).max(12),
  weekStartsOn: z.enum(["monday", "sunday"]),
  features: z.record(z.string().min(1).max(60), z.boolean()),
});

export const brandingSchema = z.object({
  schoolId: z.string().uuid(),
  displayName: z.string().trim().max(160).default(""),
  tagline: z.string().trim().max(200).default(""),
  logoUrl: z
    .string()
    .trim()
    .url("Use a full https:// image address.")
    .max(500)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  primaryColor: hexColor,
  accentColor: hexColor,
  language: trimmed(2, 8),
  currency,
  locale,
  dateFormat: z.enum(DATE_FORMATS),
  showPoweredBy: z.boolean().default(true),
});

/* --------------------------- numbering --------------------------- */

const numberFormat = trimmed(3, 60).regex(
  /^[A-Z0-9\-/{}A-Za-z]*\{SEQ\}[A-Z0-9\-/{}A-Za-z]*$/,
  "The template must include {SEQ}; you can also use {SCHOOL} and {YY}.",
);

export const numberingSchema = z
  .object({
    schoolId: z.string().uuid(),
    schoolCode: trimmed(4, 4).regex(/^[0-9]{4}$/, "The school code must be exactly 4 digits."),
    admissionFormat: numberFormat.default("{SCHOOL}{YY}{SEQ}"),
    admissionTotalDigits: z.number().int().min(6).max(20),
    admissionYearDigits: z.number().int().min(0).max(4),
    admissionSequenceDigits: z.number().int().min(1).max(8),
    admissionSequenceStart: z.number().int().min(0).max(99999999),
    employeeFormat: numberFormat.default("{SCHOOL}{YY}{SEQ}"),
    employeeTotalDigits: z.number().int().min(5).max(20),
    employeeYearDigits: z.number().int().min(0).max(4),
    employeeSequenceDigits: z.number().int().min(1).max(8),
    employeeSequenceStart: z.number().int().min(0).max(99999999),
    employeeAllocationMode: z.enum(["compact", "random"]),
  })
  .refine((v) => v.admissionSequenceStart < 10 ** v.admissionSequenceDigits, {
    message: "The starting number does not fit in the sequence length.",
    path: ["admissionSequenceStart"],
  })
  .refine((v) => v.employeeSequenceStart < 10 ** v.employeeSequenceDigits, {
    message: "The starting number does not fit in the sequence length.",
    path: ["employeeSequenceStart"],
  });

export type NumberingInput = z.infer<typeof numberingSchema>;

export type SchoolInput = z.infer<typeof schoolSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>;
export type BrandingInput = z.infer<typeof brandingSchema>;
