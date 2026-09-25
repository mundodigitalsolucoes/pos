import { Injectable, computed, signal } from '@angular/core';
import { PublicTenantMenuProduct, PublicTenantMenuResponse } from './api.service';

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
  min_select: number;
  max_select: number;
  is_required: boolean;
  options: { id: number; name: string; price_delta_cents: number }[];
}

@Injectable({ providedIn: 'root' })
export class PublicOrderCartService {
  private tenantId = signal<number | null>(null);
  private readonly currentLines = signal<PublicOrderLine[]>([]);
  readonly lines = this.currentLines.asReadonly();
  private pendingRestore: StoredLine[] = [];
  readonly count = computed(() => this.lines().reduce((total, line) => total + line.quantity, 0));
  readonly subtotalCents = computed(() =>
    this.lines().reduce((total, line) => total + (line.product.price_cents + line.modifierDeltaCents) * line.quantity, 0),
  );

  useTenant(tenantId: number): void {
    if (this.tenantId() === tenantId) return;
    this.tenantId.set(tenantId);
    this.currentLines.set([]);
    this.pendingRestore = this.readStored(tenantId);
  }

  /** Rebuild every line from the live tenant catalog; stored prices and availability are ignored. */
  reconcile(tenantId: number, menu: PublicTenantMenuResponse): void {
    if (this.tenantId() !== tenantId || menu.tenant_id !== tenantId) return;
    const products = new Map(menu.categories.flatMap((category) => category.products.map((p) => [p.id, p] as const)));
    const saved = [
      ...this.currentLines().map((line) => ({ productId: line.product.id, quantity: line.quantity, selectedOptionIds: line.selectedOptionIds })),
      ...this.pendingRestore,
    ];
    this.pendingRestore = [];
    const restored: PublicOrderLine[] = [];
    for (const entry of saved) {
      const product = products.get(entry.productId);
      if (!product?.available) continue;
      const groups = product.modifier_groups ?? [];
      const ids = [...new Set(entry.selectedOptionIds)].sort((a, b) => a - b);
      if (!this.validSelection(groups, ids)) continue;
      const line = this.makeLine(product, entry.quantity, ids, groups);
      const existing = restored.find((other) => other.key === line.key);
      if (existing) existing.quantity += line.quantity;
      else restored.push(line);
    }
    this.currentLines.set(restored);
    this.persist();
  }

  add(product: PublicTenantMenuProduct): void {
    if (!product.available) return;
    this.addCustomized(product, [], product.modifier_groups ?? []);
  }

  addCustomized(product: PublicTenantMenuProduct, selectedOptionIds: number[], groups: PublicOrderModifierGroup[]): void {
    if (!product.available) return;
    const ids = [...new Set(selectedOptionIds)].sort((a, b) => a - b);
    if (!this.validSelection(groups, ids)) return;
    const line = this.makeLine(product, 1, ids, groups);
    this.currentLines.update((lines) => {
      const existing = lines.find((item) => item.key === line.key);
      return existing
        ? lines.map((item) => item.key === line.key
            ? { ...item, quantity: item.quantity + 1 } : item)
        : [...lines, line];
    });
    this.persist();
  }

  setQuantity(key: string, quantity: number): void {
    if (!Number.isSafeInteger(quantity) || quantity > 100) return;
    this.currentLines.update((lines) => quantity <= 0
      ? lines.filter((line) => line.key !== key)
      : lines.map((line) => line.key === key ? { ...line, quantity } : line));
    this.persist();
  }

  remove(key: string): void { this.setQuantity(key, 0); }

  clear(): void {
    this.pendingRestore = [];
    this.currentLines.set([]);
    this.persist();
  }

  private validSelection(groups: PublicOrderModifierGroup[], ids: number[]): boolean {
    if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) return false;
    const allOptions = new Set(groups.flatMap((group) => group.options.map((option) => option.id)));
    if (ids.some((id) => !allOptions.has(id))) return false;
    return groups.every((group) => {
      const count = ids.filter((id) => group.options.some((option) => option.id === id)).length;
      const min = group.is_required ? Math.max(1, group.min_select) : Math.max(0, group.min_select);
      return count >= min && count <= group.max_select;
    });
  }

  private makeLine(product: PublicTenantMenuProduct, quantity: number, ids: number[], groups: PublicOrderModifierGroup[]): PublicOrderLine {
    let modifierDeltaCents = 0;
    const modifierSummary: string[] = [];
    for (const group of groups) {
      const names = group.options.filter((option) => ids.includes(option.id)).map((option) => {
        modifierDeltaCents += Math.max(0, Number(option.price_delta_cents) || 0);
        return option.name;
      });
      if (names.length) modifierSummary.push(`${group.name}: ${names.join(', ')}`);
    }
    return { key: `${product.id}:${ids.join(',')}`, product, quantity, selectedOptionIds: ids, modifierDeltaCents, modifierSummary };
  }

  private storageKey(tenantId: number): string { return `mds-food-public-cart:${tenantId}`; }

  private readStored(tenantId: number): StoredLine[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.storageKey(tenantId));
      if (!raw) return [];
      const value: unknown = JSON.parse(raw);
      if (!Array.isArray(value)) throw new Error('invalid cart');
      return value.filter((entry): entry is StoredLine =>
        typeof entry === 'object' && entry !== null &&
        Number.isSafeInteger(entry.productId) && entry.productId > 0 &&
        Number.isSafeInteger(entry.quantity) && entry.quantity > 0 && entry.quantity <= 100 &&
        Array.isArray(entry.selectedOptionIds) && entry.selectedOptionIds.length <= 100 &&
        entry.selectedOptionIds.every((id: unknown) => Number.isSafeInteger(id) && (id as number) > 0),
      ).slice(0, 100);
    } catch {
      try { localStorage.removeItem(this.storageKey(tenantId)); } catch { /* storage disabled */ }
      return [];
    }
  }

  private persist(): void {
    const tenantId = this.tenantId();
    if (!tenantId || typeof localStorage === 'undefined') return;
    try {
      if (!this.currentLines().length) localStorage.removeItem(this.storageKey(tenantId));
      else localStorage.setItem(this.storageKey(tenantId), JSON.stringify(this.currentLines().map((line) => ({
        productId: line.product.id, quantity: line.quantity, selectedOptionIds: line.selectedOptionIds,
      }))));
    } catch { /* private browsing or storage quota: in-memory cart still works */ }
  }
}

interface StoredLine { productId: number; quantity: number; selectedOptionIds: number[]; }
