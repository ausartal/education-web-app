export const SCHOOL_ROLES = ['student', 'teacher', 'admin'] as const;

export function hasSchoolRole(claims: object | null | undefined): boolean {
  return (SCHOOL_ROLES as readonly string[]).includes((claims as { role?: unknown } | null | undefined)?.role as string);
}

/**
 * The `role` claim carries the school role. An Exam login must never replace
 * it: Exam identity comes from the `exam_users` document, not from the claim.
 */
export function shouldAssignExamClaim(claims: object | null | undefined): boolean {
  return !hasSchoolRole(claims);
}
