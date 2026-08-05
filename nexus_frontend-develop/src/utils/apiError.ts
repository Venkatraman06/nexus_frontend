/** Extract a human-readable message from an Axios error with the custom exception handler format. */
export function apiErrorMsg(e: any, fallback = "An error occurred"): string {
  const d = e?.response?.data;
  if (!d) return e?.message || fallback;

  // Plain error string from some endpoints
  if (typeof d?.error === "string") return d.error;

  const errors = d?.errors;
  if (typeof errors === "string") return errors;

  // Custom exception handler: { message, errors: { detail | field: [...] } }
  const errDetail = errors?.detail;
  if (typeof errDetail === "string") return errDetail;
  if (Array.isArray(errDetail) && errDetail.length > 0) return errDetail[0] as string;

  // Validation errors: { errors: { field: ["msg"] } } or { errors: ["msg"] }
  if (Array.isArray(errors) && errors.length > 0) {
    return typeof errors[0] === "string" ? errors[0] : String(errors[0]);
  }
  if (errors && typeof errors === "object") {
    const firstField = Object.values(errors)[0];
    if (Array.isArray(firstField) && firstField.length > 0) return firstField[0] as string;
    if (typeof firstField === "string") return firstField;
  }

  if (d?.message && d.message !== "Internal server error") return d.message;
  return fallback;
}
