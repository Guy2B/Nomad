/** Owner push notifications through ntfy (topic in NTFY_TOPIC). Best-effort, never blocks an order. */
export async function notifyOwner(title, message, priority = 'default') {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return false;
  try {
    const res = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: 'POST',
      body: message,
      headers: { Title: title.replace(/[^\x20-\x7E]/g, ''), Priority: priority, Tags: 'package' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const euros = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;
