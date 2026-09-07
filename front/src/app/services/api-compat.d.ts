import type { Observable } from 'rxjs';
import type { Order } from './api.service';
import './api.service';

declare module './api.service' {
  interface ProviderInfo {
    provider_id?: number;
    provider_name?: string;
    price_cents?: number | null;
    provider_product_id?: number | null;
  }

  interface ApiService {
    getCurrentOrder(tableToken: string, sessionId?: string): Observable<{ order: Order | null }>;
  }
}

export {};
