import type { Order } from '../services/api.service';

export type QueueLayout = 'stage' | 'recent';

const ACTIVE_STATUSES = new Set(['pending', 'preparing', 'ready', 'out_for_delivery', 'partially_delivered']);

/** The first pending order remains the only active attention dialog. */
export function pendingOrders(orders: Order[]): Order[] {
  return orders.filter(o => o.status === 'pending').sort((a, b) => a.id - b.id);
}

export function visibleOperationalOrders(orders: Order[], query: string): Order[] {
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  return orders.filter(o => ACTIVE_STATUSES.has(o.status))
    .filter(o => !normalized || String(o.id).includes(normalized)
      || (o.customer_name || '').toLocaleLowerCase('pt-BR').includes(normalized)
      || (o.table_name || '').toLocaleLowerCase('pt-BR').includes(normalized))
    .sort((a, b) => b.id - a.id);
}

export function splitColumns(orders: Order[], layout: QueueLayout): [Order[], Order[]] {
  if (layout === 'recent') {
    return [orders.filter((_, i) => i % 2 === 0), orders.filter((_, i) => i % 2 === 1)];
  }
  return [orders.filter(o => o.status === 'pending' || o.status === 'preparing'),
    orders.filter(o => o.status !== 'pending' && o.status !== 'preparing')];
}
