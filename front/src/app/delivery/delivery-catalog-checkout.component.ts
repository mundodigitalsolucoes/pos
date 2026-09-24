import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../environments/environment';
import { ApiService, PublicTenantMenuProduct } from '../services/api.service';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { LegalLinksComponent } from '../shared/legal-links.component';
import { contactPhoneValid } from '../shared/contact-validators';
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

interface CatalogCheckoutResponse {
  id: number;
  public_order_token: string;
  total_cents: number;
  subtotal_cents?: number;
  delivery_fee_cents?: number;
  revolut_configured?: boolean;
  stripe_publishable_key?: string | null;
}

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
  private readonly catalogApi = inject(ApiService);
  private readonly catalogTranslate = inject(TranslateService);
  private readonly sharedCart = inject(PublicOrderCartService);

  readonly customizingProduct = signal<DeliveryCatalogProduct | null>(null);
  readonly modifierSelections = signal<Record<number, number[]>>({});
  readonly customizationError = signal<string | null>(null);
  readonly comboCompositions = signal<Record<number, CatalogComboItem[]>>({});

  readonly catalogCart = computed(
    () => this.cart(),
  );

  override cartCount = computed(() =>
    this.catalogCart().reduce((total, line) => total + line.quantity, 0),
  );

  override cartSubtotalCents = computed(() =>
    this.catalogCart().reduce(
      (total, line) =>
        total + (line.product.price_cents + line.modifierDeltaCents) * line.quantity,
      0,
    ),
  );

  override cartTotalCents = computed(() => {
    const fee = this.deliveryConfig()?.delivery_fee_cents ?? 0;
    return this.cartSubtotalCents() + Math.max(0, fee);
  });

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

  override submitAddress(): void {
    this.formError.set(null);
    const address = this.deliveryAddress.trim();
    const phone = this.customerPhone.trim();
    const cfg = this.deliveryConfig();

    if (!address) {
      this.formError.set(this.catalogTranslate.instant('DELIVERY_CHECKOUT.ADDRESS_REQUIRED'));
      return;
    }
    if (!phone || !contactPhoneValid(phone)) {
      this.formError.set(this.catalogTranslate.instant('DELIVERY_CHECKOUT.PHONE_INVALID'));
      return;
    }
    if (cfg?.postal_codes_required && !this.postalCode.trim()) {
      this.formError.set(this.catalogTranslate.instant('DELIVERY_CHECKOUT.POSTAL_REQUIRED'));
      return;
    }
    if (cfg?.delivery_radius_meters && (this.deliveryLat() == null || this.deliveryLng() == null)) {
      this.formError.set(this.catalogTranslate.instant('DELIVERY_CHECKOUT.LOCATION_REQUIRED'));
      this.requestDeliveryLocation();
      return;
    }
    if (this.cartCount() < 1) {
      this.formError.set(this.catalogTranslate.instant('DELIVERY_CHECKOUT.CART_EMPTY'));
      return;
    }

    const base = (environment.apiUrl || '').replace(/\/$/, '');
    this.submitting.set(true);
    this.catalogHttp
      .post<CatalogCheckoutResponse>(
        `${base}/tenant/subcategories/public/catalog-checkout/${this.tenantId()}`,
        {
          items: this.catalogCart().map((line) => ({
            product_id: line.product.id,
            quantity: line.quantity,
            customization_answers: {
              catalog_modifier_option_ids: line.selectedOptionIds,
            },
          })),
          delivery_address: address,
          customer_phone: phone,
          customer_name: this.customerName.trim() || null,
          notes: this.deliveryNotes.trim() || null,
          postal_code: this.postalCode.trim() || null,
          delivery_latitude: this.deliveryLat(),
          delivery_longitude: this.deliveryLng(),
        },
      )
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.orderId.set(res.id);
          this.publicOrderToken.set(res.public_order_token);
          this.totalCents.set(res.total_cents);
          this.subtotalCents.set(res.subtotal_cents ?? res.total_cents);
          this.deliveryFeeCents.set(res.delivery_fee_cents ?? 0);
          this.revolutConfigured.set(!!res.revolut_configured);
          const key = res.stripe_publishable_key || environment.stripePublishableKey || '';
          this.catalogApi.setTenantStripeKey(res.stripe_publishable_key || null);
          this.stripeReady.set(!!key);
          this.step.set('pay');
        },
        error: (err) => {
          this.submitting.set(false);
          const detail = err.error?.detail;
          let message = this.catalogTranslate.instant('DELIVERY_CHECKOUT.CREATE_FAILED');
          if (typeof detail === 'string') {
            if (detail.includes('outside the delivery zone')) {
              message = this.catalogTranslate.instant('DELIVERY_CHECKOUT.OUTSIDE_ZONE');
            } else if (detail.includes('outside the delivery radius')) {
              message = this.catalogTranslate.instant('DELIVERY_CHECKOUT.OUTSIDE_RADIUS');
            } else if (detail.includes('postal_code')) {
              message = this.catalogTranslate.instant('DELIVERY_CHECKOUT.POSTAL_REQUIRED');
            } else if (detail.toLowerCase().includes('location')) {
              message = this.catalogTranslate.instant('DELIVERY_CHECKOUT.LOCATION_REQUIRED');
            } else {
              message = detail;
            }
          }
          this.formError.set(message);
        },
      });
  }
}
