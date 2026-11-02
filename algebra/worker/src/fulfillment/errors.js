/** Shared by every provider (no imports, so no import cycles). */
export class FulfillmentError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

export const STATUSES = ['received', 'production', 'shipped', 'delivered', 'cancelled', 'error'];

/** Provider status (any wording) → Algebra status. Keyword based on purpose: Valadio's exact values are TO VERIFY. */
export function normaliseStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (!s) return null;
  if (/cancel|storn/.test(s)) return 'cancelled';
  if (/deliver|zugestellt/.test(s)) return 'delivered';
  if (/ship|dispatch|sent|versand|versend|transit|unterwegs/.test(s)) return 'shipped';
  if (/produc|produk|print|druck|embroid|stick|process|bearbeit|manufact/.test(s)) return 'production';
  if (/error|fail|hold|problem|reject|invalid/.test(s)) return 'error';
  if (/new|neu|accept|receiv|created|pending|open|confirm|offen|eingegangen/.test(s)) return 'received';
  return null;
}

