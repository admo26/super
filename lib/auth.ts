const DEFAULT_ALLOWED_AUTH_EMAILS = ["rosie.moore02@gmail.com", "adam266@gmail.com"];

function parseAllowedEmails(value: string | undefined) {
  if (!value) return DEFAULT_ALLOWED_AUTH_EMAILS;

  const parsed = value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return parsed.length ? parsed : DEFAULT_ALLOWED_AUTH_EMAILS;
}

export function getAllowedAuthEmails() {
  return parseAllowedEmails(process.env.NEXT_PUBLIC_ALLOWED_AUTH_EMAILS);
}

export function isAllowedAuthEmail(email: string | null | undefined) {
  if (!email) return false;

  return getAllowedAuthEmails().includes(email.trim().toLowerCase());
}
