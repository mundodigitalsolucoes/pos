import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../environments/environment';
import { PublicTenantMenuProduct } from '../services/api.service';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { LegalLinksComponent } from '../shared/legal-links.component';
import { DeliveryCheckoutComponent } from './delivery-checkout.component';
import { PublicOrderCartService, PublicOrderLine } from '../services/public-order-cart.service';

interface CatalogModifierOption {
  id: number;
  name: string;
  price_delta_cents: number;
  sort_order?: number;
}

interface CatalogModifierGroup {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  options: CatalogModifierOption[];
}

interface CatalogComboItem {
  product_id: number;
  quantity: number;
  name: string;
}

interface CatalogComboComposition {
  product_id: number;
  items: CatalogComboItem[];
}

type DeliveryCatalogProduct = PublicTenantMenuProduct & {
  modifier_groups?: CatalogModifierGroup[];
};

@Component({
  selector: 'app-delivery-catalog-checkout',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslateModule, LanguagePickerComponent, LegalLinksComponent],
  templateUrl: './delivery-catalog-checkout.component.html',
  styleUrls: [
    '../book/book.component.scss',
    './delivery-checkout.component.scss',
    './delivery-catalog-checkout.component.scss',
  ],
})
export class DeliveryCatalogCheckoutComponent extends DeliveryCheckoutComponent {
  private readonly catalogHttp = inject(HttpClient);
  private readonly sharedCart = inject(PublicOrderCartService);

  readonly customizingProduct = signal<DeliveryCatalogProduct | null>(null);
  readonly modifierSelections = signal<Record<number, number[]>>({});
  readonly customizationError = signal<string | null>(null);
  readonly comboCompositions = signal<Record<number, CatalogComboItem[]>>({});

  readonly catalogCart = this.cart;

  override ngOnInit(): void {
    super.ngOnInit();
    const tenantId = this.tenantId();
    if (!tenantId) return;
    const base = (environment.apiUrl || '').replace(/\/$/, '');
    this.catalogHttp
      .get<CatalogComboComposition[]>(`${base}/tenant/subcategories/public/combo-compositions/${tenantId}`)
      .subscribe({
        next: (rows) => {
          const mapped: Record<number, CatalogComboItem[]> = {};
          for (const row of rows) {
            mapped[row.product_id] = Array.isArray(row.items) ? row.items : [];
          }
          this.comboCompositions.set(mapped);
        },
        error: () => this.comboCompositions.set({}),
      });
  }

  comboItems(product: PublicTenantMenuProduct): CatalogComboItem[] {
    return this.comboCompositions()[product.id] ?? [];
  }

  modifierGroups(product: PublicTenantMenuProduct): CatalogModifierGroup[] {
    const groups = (product as DeliveryCatalogProduct).modifier_groups;
    if (!Array.isArray(groups)) return [];
    return groups.filter((group) => Array.isArray(group.options) && group.options.length > 0);
  }

  hasModifiers(product: PublicTenantMenuProduct): boolean {
    return this.modifierGroups(product).length > 0;
  }

  override addToCart(product: PublicTenantMenuProduct): void {
    if (!product.available) return;
    const catalogProduct = product as DeliveryCatalogProduct;
    if (this.hasModifiers(product)) {
      this.customizingProduct.set(catalogProduct);
      this.modifierSelections.set({});
      this.customizationError.set(null);
      return;
    }
    this.addCatalogLine(catalogProduct, []);
  }

  closeCustomizer(): void {
    this.customizingProduct.set(null);
    this.modifierSelections.set({});
    this.customizationError.set(null);
  }

  isModifierSelected(groupId: number, optionId: number): boolean {
    return (this.modifierSelections()[groupId] ?? []).includes(optionId);
  }

  selectedCount(groupId: number): number {
    return (this.modifierSelections()[groupId] ?? []).length;
  }

  toggleModifier(group: CatalogModifierGroup, option: CatalogModifierOption): void {
    this.customizationError.set(null);
    const current = this.modifierSelections();
    const selected = [...(current[group.id] ?? [])];
    const existingIndex = selected.indexOf(option.id);

    if (existingIndex >= 0) {
      selected.splice(existingIndex, 1);
    } else if (group.max_select <= 1) {
      selected.splice(0, selected.length, option.id);
    } else if (selected.length < group.max_select) {
      selected.push(option.id);
    } else {
      this.customizationError.set(
        `Você pode escolher no máximo ${group.max_select} opção(ões) em ${group.name}.`,
      );
      return;
    }

    this.modifierSelections.set({ ...current, [group.id]: selected });
  }

  modifierRule(group: CatalogModifierGroup): string {
    const minimum = group.is_required ? Math.max(1, group.min_select) : Math.max(0, group.min_select);
    if (minimum === group.max_select) {
      return `Escolha ${group.max_select}`;
    }
    if (minimum > 0) {
      return `Escolha de ${minimum} a ${group.max_select}`;
    }
    return `Escolha até ${group.max_select}`;
  }

  confirmCustomization(): void {
    const product = this.customizingProduct();
    if (!product) return;
    const selections = this.modifierSelections();
    const selectedIds: number[] = [];

    for (const group of this.modifierGroups(product)) {
      const ids = selections[group.id] ?? [];
      const minimum = group.is_required ? Math.max(1, group.min_select) : Math.max(0, group.min_select);
      if (ids.length < minimum) {
        this.customizationError.set(
          `Selecione pelo menos ${minimum} opção(ões) em ${group.name}.`,
        );
        return;
      }
      if (ids.length > group.max_select) {
        this.customizationError.set(
          `Selecione no máximo ${group.max_select} opção(ões) em ${group.name}.`,
        );
        return;
      }
      selectedIds.push(...ids);
    }

    this.addCatalogLine(product, selectedIds);
    this.closeCustomizer();
  }

  private addCatalogLine(product: DeliveryCatalogProduct, selectedOptionIds: number[]): void {
    this.sharedCart.addCustomized(product, selectedOptionIds, this.modifierGroups(product));
  }

  setCatalogQty(key: string, quantity: number): void {
    this.sharedCart.setQuantity(key, quantity);
  }

  lineUnitCents(line: PublicOrderLine): number {
    return line.product.price_cents + line.modifierDeltaCents;
  }

}
