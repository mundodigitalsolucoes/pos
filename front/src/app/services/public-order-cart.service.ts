import { Injectable, computed, signal } from '@angular/core';
import { PublicTenantMenuProduct } from './api.service';

export interface PublicOrderLine {
  key: string;
  product: PublicTenantMenuProduct;
  quantity: number;
  selectedOptionIds: number[];
  modifierDeltaCents: number;
  modifierSummary: string[];
}

export interface PublicOrderModifierGroup {
  id: number;
  name: string;
  options: { id: number; name: string; price_delta_cents: number }[];
}

@Injectable({ providedIn: 'root' })
export class PublicOrderCartService {
  private tenantId = signal<number | null>(null);
  readonly lines = signal<PublicOrderLine[]>([]);
  readonly count = computed(() => this.lines().reduce((total, line) => total + line.quantity, 0));
  readonly subtotalCents = computed(() =>
    this.lines().reduce((total, line) => total + (line.product.price_cents + line.modifierDeltaCents) * line.quantity, 0),
  );

  useTenant(tenantId: number): void {
    if (this.tenantId() === tenantId) return;
    this.tenantId.set(tenantId);
    this.lines.set([]);
  }

  add(product: PublicTenantMenuProduct): void {
    if (!product.available) return;
    this.addCustomized(product, [], []);
  }

  addCustomized(product: PublicTenantMenuProduct, selectedOptionIds: number[], groups: PublicOrderModifierGroup[]): void {
    if (!product.available) return;
    const ids = [...new Set(selectedOptionIds)].sort((a, b) => a - b);
    const key = `${product.id}:${ids.join(',')}`;
    let modifierDeltaCents = 0;
    const modifierSummary: string[] = [];
    for (const group of groups) {
      const names = group.options.filter((option) => ids.includes(option.id)).map((option) => {
        modifierDeltaCents += Math.max(0, Number(option.price_delta_cents) || 0);
        return option.name;
      });
      if (names.length) modifierSummary.push(`${group.name}: ${names.join(', ')}`);
    }
    this.lines.update((lines) => {
      const existing = lines.find((line) => line.key === key);
      return existing
        ? lines.map((line) => line.key === key
            ? { ...line, quantity: line.quantity + 1 } : line)
        : [...lines, { key, product, quantity: 1, selectedOptionIds: ids, modifierDeltaCents, modifierSummary }];
    });
  }

  setQuantity(key: string, quantity: number): void {
    this.lines.update((lines) => quantity <= 0
      ? lines.filter((line) => line.key !== key)
      : lines.map((line) => line.key === key ? { ...line, quantity } : line));
  }

  clear(): void { this.lines.set([]); }
}
