// TEMPORARY (with the Settings "Add nikud to all songs" tool). Only the account whose sign-in email is in the
// NIKUD_ADMIN_EMAIL setting (Vercel) may use the tool.
export function isNikudAdmin(email: string | undefined | null) {
  const admin = process.env.NIKUD_ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(admin && email && email.trim().toLowerCase() === admin);
}
