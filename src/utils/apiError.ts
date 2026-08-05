/** Extract a human-readable message from an Axios error or API response */
export function apiErrorMsg(e: any, fallback = "An error occurred"): string {
  const d = e?.response?.data;
  if (!d) return e?.message || fallback;

  // String response or string error
  if (typeof d === "string") return d;
  if (typeof d?.error === "string") return d.error;
  if (typeof d?.detail === "string") return d.detail;
  if (Array.isArray(d?.detail) && d.detail.length > 0) return String(d.detail[0]);
  if (typeof d?.message === "string" && d.message !== "Internal server error") return d.message;

  // Custom exception handler format: { message, errors: { ... } } or DRF validation dict
  const errorsObj = d?.errors || d;
  if (typeof errorsObj === "string") return errorsObj;
  if (Array.isArray(errorsObj) && errorsObj.length > 0) {
    return typeof errorsObj[0] === "string" ? errorsObj[0] : String(errorsObj[0]);
  }

  if (errorsObj && typeof errorsObj === "object") {
    const messages: string[] = [];
    for (const [key, val] of Object.entries(errorsObj)) {
      if (key === "message" || key === "status_code" || key === "code") continue;
      if (Array.isArray(val) && val.length > 0) {
        messages.push(String(val[0]));
      } else if (typeof val === "string" && val.trim()) {
        messages.push(val);
      }
    }
    if (messages.length > 0) {
      return messages.join(" | ");
    }
  }

  return fallback;
}
