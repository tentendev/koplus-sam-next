// Base URL of the sam-payload CMS/API. Same source of truth as before — this
// app is a pure frontend over it. Override per-environment with NEXT_PUBLIC_API_BASE.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
