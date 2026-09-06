/**
 * The outward code of a UK postcode — "M9 4FP" → "M9".
 *
 * Land Registry Price Paid data is published per district, so this is the key
 * that joins a listing to its comparables. Deliberately forgiving about spacing
 * and case, because postcodes arrive from the listing wizard as free text.
 */
export function postcodeDistrict(postcode: string): string {
  return postcode.trim().toUpperCase().split(/\s+/)[0] ?? "";
}
