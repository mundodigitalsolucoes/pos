/** Return a status only when the weekly schedule can be interpreted safely. */
export function restaurantOpenStatus(raw: string | null | undefined, timezone: string | null | undefined, now = new Date()): 'open' | 'closed' | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'America/Sao_Paulo', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now);
    const day = parts.find(p => p.type === 'weekday')?.value.toLowerCase();
    const current = `${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}`;
    const hours = (data as Record<string, unknown>)[day ?? ''];
    if (!hours || typeof hours !== 'object' || Array.isArray(hours)) return null;
    const schedule = hours as Record<string, unknown>;
    if (schedule['closed'] === true) return 'closed';
    const valid = (s: unknown): s is string => typeof s === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s);
    const intervals = schedule['hasBreak'] === true
      ? [[schedule['morningOpen'] ?? schedule['open'], schedule['morningClose']], [schedule['eveningOpen'], schedule['eveningClose'] ?? schedule['close']]]
      : [[schedule['open'], schedule['eveningClose'] ?? schedule['close']]];
    if (!intervals.every(([start, end]) => valid(start) && valid(end) && start < end)) return null;
    return intervals.some(([start, end]) => (start as string) <= current && current < (end as string)) ? 'open' : 'closed';
  } catch { return null; }
}
