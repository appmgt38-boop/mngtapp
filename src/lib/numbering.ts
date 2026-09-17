/* ------------------------------------------------------------------ *
 * Admission number & employee ID numbering — shared types and preview
 * helpers. Browser-safe (no server imports): the System Configuration
 * UI and any server-side check use the same rules.
 * ------------------------------------------------------------------ */

export interface NumberingSettings {
  id: string;
  school_id: string;
  school_code: string;
  admission_format: string;
  admission_total_digits: number;
  admission_year_digits: number;
  admission_sequence_digits: number;
  admission_sequence_start: number;
  employee_format: string;
  employee_total_digits: number;
  employee_year_digits: number;
  employee_sequence_digits: number;
  employee_sequence_start: number;
  employee_allocation_mode: "compact" | "random";
}

export const NUMBERING_TOKENS = ["{SCHOOL}", "{YY}", "{SEQ}"] as const;
export const DEFAULT_NUMBER_FORMAT = "{SCHOOL}{YY}{SEQ}";
export const ALLOCATION_MODES = ["compact", "random"] as const;
export const SCHOOL_CODE_DIGITS = 4;

/** Digits of the school's short code, padded to the fixed 4-digit width. */
export function schoolCodeDigits(code: string | null | undefined) {
  const digits = (code ?? "").replace(/\D/g, "");
  return digits.slice(-SCHOOL_CODE_DIGITS).padStart(SCHOOL_CODE_DIGITS, "0");
}

/** Length the template produces — must match the configured total. */
export function composedLength(
  format: string,
  yearDigits: number,
  sequenceDigits: number,
) {
  const literal = format
    .replace("{SCHOOL}", "")
    .replace("{YY}", "")
    .replace("{SEQ}", "").length;
  const school = format.includes("{SCHOOL}") ? SCHOOL_CODE_DIGITS : 0;
  const year = format.includes("{YY}") ? yearDigits : 0;
  const seq = format.includes("{SEQ}") ? sequenceDigits : 0;
  return literal + school + year + seq;
}

/** What the very first number of the current year will look like. */
export function previewNumber(opts: {
  format: string;
  schoolCode: string;
  yearDigits: number;
  sequenceDigits: number;
  sequenceStart: number;
}) {
  const year = String(new Date().getFullYear());
  return opts.format
    .replace("{SCHOOL}", schoolCodeDigits(opts.schoolCode))
    .replace("{YY}", opts.yearDigits === 0 ? "" : year.slice(-opts.yearDigits))
    .replace("{SEQ}", String(opts.sequenceStart).padStart(opts.sequenceDigits, "0"));
}

/** Highest sequence value a template can hold before it rolls over. */
export const capacity = (sequenceDigits: number, sequenceStart: number) =>
  Math.max(10 ** sequenceDigits - sequenceStart, 0);
