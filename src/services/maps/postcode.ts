// UK postcode format: 1-2 letters, 1 digit, optional letter/digit, space,
// digit, 2 letters (e.g. "SW1A 1AA", "M1 1AE", "B33 8TH"). Case-insensitive.
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/** Uppercases and reinserts a single space before the 3-character inward code. */
export function normalisePostcode(postcode: string): string {
  const compact = postcode.trim().toUpperCase().replace(/\s+/g, "");
  if (compact.length <= 3) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function isValidUkPostcode(postcode: string): boolean {
  return UK_POSTCODE_RE.test(postcode.trim());
}
