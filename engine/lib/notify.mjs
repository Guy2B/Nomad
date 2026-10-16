/** Owner push notifications through ntfy (topic in NTFY_TOPIC). Best-effort, never blocks an order. */
/** `click` opens on tap: the admin by default, or e.g. the Stripe dispute. */
export async function notifyOwner(title, message, priority = 'default', click = process.env.ADMIN_URL || 'https://api.algbr.eu/admin/') {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return false;
  try {
    const res = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: 'POST',
      body: message,
      headers: { Title: title.replace(/[^\x20-\x7E]/g, ''), Priority: priority, Tags: 'package', ...(click ? { Click: click } : {}) },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const euros = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
