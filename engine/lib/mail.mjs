/**
 * Customer e-mails through Resend (RESEND_API_KEY, sender domain algbr.eu verified in Resend).
 * Best-effort: a mail that cannot be sent never blocks an order, it is reported to the caller.
 * In tests (NOMAD_MEMORY_STORE=1) mails are kept in an outbox instead of being sent.
 */
let outbox = [];
export const testOutbox = () => outbox;
export const resetOutbox = () => {
  outbox = [];
};

const testing = () => process.env.NOMAD_MEMORY_STORE === '1' && !process.env.RESEND_API_KEY;
export const mailConfigured = () => testing() || Boolean(process.env.RESEND_API_KEY);

/** Sender address: "<Brand> <service@algbr.eu>" unless MAIL_FROM says otherwise. */
export const senderFor = (brand) => `${String(brand || 'ALGBr').replace(/[<>"]/g, '')} <${process.env.MAIL_FROM || 'service@algbr.eu'}>`;

/** { to, from, replyTo, subject, html, text, key } → { ok, id } | { ok: false, error } */
export async function sendMail(m) {
  if (testing()) {
    outbox.push(m);
    return { ok: true, id: `test-${outbox.length}` };
  }
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'mail-not-configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'content-type': 'application/json',
        // Same key = same mail: a retried cron run never mails the customer twice.
        ...(m.key ? { 'idempotency-key': String(m.key).slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: m.from,
        to: [m.to],
        subject: m.subject,
        html: m.html,
        text: m.text,
        ...(m.replyTo ? { reply_to: m.replyTo } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.message || `Resend HTTP ${res.status}` };
    return { ok: true, id: data?.id ?? null };
  } catch {
    return { ok: false, error: 'mail-unreachable' };
  }
}
