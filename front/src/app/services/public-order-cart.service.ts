import { Injectable, computed, signal } from '@angular/core';
import { PublicTenantMenuProduct } from './api.service';

export interface PublicOrderLine {
  product: PublicTenantMenuProduct;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class PublicOrderCartService {
  private tenantId = signal<number | null>(null);
  readonly lines = signal<PublicOrderLine[]>([]);
  readonly count = computed(() => this.lines().reduce((total, line) => total + line.quantity, 0));
  readonly subtotalCents = computed(() =>
    this.lines().reduce((total, line) => total + line.product.price_cents * line.quantity, 0),
  );

  useTenant(tenantId: number): void {
    if (this.tenantId() === tenantId) return;
    this.tenantId.set(tenantId);
    this.lines.set([]);
  }

  add(product: PublicTenantMenuProduct): void {
    if (!product.available) return;
    this.lines.update((lines) => {
      const existing = lines.find((line) => line.product.id === product.id);
      return existing
        ? lines.map((line) => line.product.id === product.id
            ? { ...line, quantity: line.quantity + 1 } : line)
        : [...lines, { product, quantity: 1 }];
    });
  }

  setQuantity(productId: number, quantity: number): void {
    this.lines.update((lines) => quantity <= 0
      ? lines.filter((line) => line.product.id !== productId)
      : lines.map((line) => line.product.id === productId ? { ...line, quantity } : line));
  }

  clear(): void { this.lines.set([]); }
}
