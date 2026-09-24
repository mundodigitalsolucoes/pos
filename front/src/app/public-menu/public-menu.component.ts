import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  DestroyRef,
  afterNextRender,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl, SafeStyle, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { merge } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiService,
  LoyaltyProgramPublic,
  PublicTenantMenuCategory,
  PublicTenantMenuProduct,
  PublicTenantMenuResponse,
  TenantSummary,
} from '../services/api.service';
import { LanguagePickerComponent } from '../shared/language-picker.component';
import { LanguageService } from '../services/language.service';
import { LegalLinksComponent } from '../shared/legal-links.component';
import { PublicOrderCartService } from '../services/public-order-cart.service';

interface PublicCatalogMerchandising {
  product_id: number;
  is_featured: boolean;
  labels: string[];
}

interface PublicModifierOption {
  id: number;
  name: string;
  price_delta_cents: number;
}

interface PublicModifierGroup {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  is_required: boolean;
  options: PublicModifierOption[];
}

interface PublicComboItem {
  product_id: number;
  quantity: number;
  name: string;
}

interface PublicComboComposition {
  product_id: number;
  items: PublicComboItem[];
}

@Component({
  selector: 'app-public-menu',
  standalone: true,
  imports: [RouterLink, TranslateModule, LanguagePickerComponent, LegalLinksComponent],
  templateUrl: './public-menu.component.html',
  styleUrls: ['../book/book.component.scss', './public-menu.component.scss'],
})
export class PublicMenuComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private translate = inject(TranslateService);
  private language = inject(LanguageService);
  private sanitizer = inject(DomSanitizer);
  private title = inject(Title);
  private destroyRef = inject(DestroyRef);
  private orderCart = inject(PublicOrderCartService);
  cart = this.orderCart.lines;
  cartCount = this.orderCart.count;
  cartSubtotalCents = this.orderCart.subtotalCents;
  selectedProduct = signal<PublicTenantMenuProduct | null>(null);

  tenantId = signal(0);
  tenant = signal<TenantSummary | null>(null);
  menu = signal<PublicTenantMenuResponse | null>(null);
  logoUrl = signal<string | null>(null);
  loading = signal(true);
  menuLoading = signal(false);
  errorKind = signal<'invalid_tenant' | 'tenant_not_found' | 'menu_load_failed' | null>(null);
  merchandising = signal<Record<number, PublicCatalogMerchandising>>({});
  comboCompositions = signal<Record<number, PublicComboItem[]>>({});
  loyaltyProgram = signal<LoyaltyProgramPublic | null>(null);
  searchQuery = signal('');
  infoOpen = signal(false);
  private collapsedCategoryIds = signal<Set<string>>(new Set());

  constructor() {
    afterNextRender(() => this.updateDocumentTitle());
  }

  ngOnInit(): void {
    const langParam = this.route.snapshot.queryParamMap.get('lang');
    if (langParam?.trim()) this.language.setLanguage(langParam.trim());

    merge(
      this.translate.onLangChange,
      this.translate.onTranslationChange,
      this.translate.onDefaultLangChange,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateDocumentTitle();
        if (this.tenant() && !this.errorKind()) this.reloadMenu();
      });

    const idParam = this.route.snapshot.paramMap.get('tenantId');
    const tid = idParam ? parseInt(idParam, 10) : NaN;
    if (!Number.isFinite(tid) || tid < 1) {
      this.errorKind.set('invalid_tenant');
      this.loading.set(false);
      this.updateDocumentTitle();
      return;
    }

    this.tenantId.set(tid);
    this.orderCart.useTenant(tid);
    this.updateDocumentTitle();
    this.loadMerchandising(tid);
    this.loadComboCompositions(tid);
    this.loadLoyalty(tid);

    this.api.getPublicTenant(tid).subscribe({
      next: (t) => {
        this.tenant.set(t);
        this.logoUrl.set(this.api.getTenantLogoUrl(t.logo_filename ?? undefined, t.id));
        this.loadMenu(tid);
      },
      error: () => {
        this.errorKind.set('tenant_not_found');
        this.loading.set(false);
        this.updateDocumentTitle();
      },
    });
  }

  ngOnDestroy(): void {}

  private loadMenu(tenantId: number): void {
    this.menuLoading.set(true);
    this.api.getPublicTenantMenu(tenantId).subscribe({
      next: (data) => {
        this.menu.set(data);
        this.menuLoading.set(false);
        this.loading.set(false);
        this.updateDocumentTitle();
      },
      error: () => {
        this.errorKind.set('menu_load_failed');
        this.menuLoading.set(false);
        this.loading.set(false);
        this.updateDocumentTitle();
      },
    });
  }

  private loadMerchandising(tenantId: number): void {
    const base = environment.apiUrl.replace(/\/$/, '');
    this.http
      .get<PublicCatalogMerchandising[]>(`${base}/tenant/subcategories/public/catalog-merchandising/${tenantId}`)
      .subscribe({
        next: (rows) => {
          const mapped: Record<number, PublicCatalogMerchandising> = {};
          for (const row of rows) {
            mapped[row.product_id] = { ...row, labels: Array.isArray(row.labels) ? row.labels : [] };
          }
          this.merchandising.set(mapped);
        },
        error: () => this.merchandising.set({}),
      });
  }

  private loadComboCompositions(tenantId: number): void {
    const base = environment.apiUrl.replace(/\/$/, '');
    this.http
      .get<PublicComboComposition[]>(`${base}/tenant/subcategories/public/combo-compositions/${tenantId}`)
      .subscribe({
        next: (rows) => {
          const mapped: Record<number, PublicComboItem[]> = {};
          for (const row of rows) mapped[row.product_id] = Array.isArray(row.items) ? row.items : [];
          this.comboCompositions.set(mapped);
        },
        error: () => this.comboCompositions.set({}),
      });
  }

  private loadLoyalty(tenantId: number): void {
    this.api.getPublicLoyaltyProgram(tenantId).subscribe({
      next: (program) => this.loyaltyProgram.set(program),
      error: () => this.loyaltyProgram.set(null),
    });
  }

  private reloadMenu(): void {
    const tid = this.tenantId();
    if (!tid) return;
    this.menuLoading.set(true);
    this.api.getPublicTenantMenu(tid).subscribe({
      next: (data) => {
        this.menu.set(data);
        this.menuLoading.set(false);
      },
      error: () => this.menuLoading.set(false),
    });
  }

  categories(): PublicTenantMenuCategory[] {
    return this.menu()?.categories ?? [];
  }

  visibleCategories(): PublicTenantMenuCategory[] {
    const query = this.normalizedSearchQuery();
    if (!query) return this.categories();
    return this.categories()
      .map((category) => ({
        ...category,
        products: category.products.filter((product) => this.productMatchesSearch(product, category, query)),
      }))
      .filter((category) => category.products.length > 0);
  }

  featuredProducts(): PublicTenantMenuProduct[] {
    const query = this.normalizedSearchQuery();
    const featured: PublicTenantMenuProduct[] = [];
    for (const category of this.categories()) {
      for (const product of category.products) {
        if (!this.isFeatured(product.id)) continue;
        if (query && !this.productMatchesSearch(product, category, query)) continue;
        featured.push(product);
      }
    }
    return featured;
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement | null)?.value ?? '');
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  openInfo(): void {
    this.infoOpen.set(true);
  }

  closeInfo(): void {
    this.infoOpen.set(false);
  }

  scrollToCategory(categoryId: string): void {
    if (typeof document === 'undefined') return;
    if (!this.isCategoryExpanded(categoryId)) this.toggleCategory(categoryId);
    document.getElementById(`cat-${categoryId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openProduct(product: PublicTenantMenuProduct): void { this.selectedProduct.set(product); }
  closeProduct(): void { this.selectedProduct.set(null); }
  addSelectedProduct(): void {
    const product = this.selectedProduct();
    if (!product || this.modifierGroups(product).length > 0) return;
    this.orderCart.add(product);
    this.closeProduct();
  }
  changeQuantity(productId: number, quantity: number): void {
    this.orderCart.setQuantity(productId, quantity);
  }
  formatCents(cents: number): string {
    const currency = this.currencyLabel() || 'EUR';
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100); }
    catch { return `${(cents / 100).toFixed(2)} ${currency}`; }
  }

  scrollToFeatured(): void {
    if (typeof document === 'undefined') return;
    document.getElementById('public-menu-featured')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  isCategoryExpanded(categoryId: string): boolean {
    if (this.normalizedSearchQuery()) return true;
    return !this.collapsedCategoryIds().has(categoryId);
  }

  toggleCategory(categoryId: string): void {
    if (this.normalizedSearchQuery()) return;
    this.collapsedCategoryIds.update((ids) => {
      const next = new Set(ids);
      next.has(categoryId) ? next.delete(categoryId) : next.add(categoryId);
      return next;
    });
  }

  getCategoryLabel(category: string): string {
    const keyMap: Record<string, string> = {
      Starters: 'PRODUCTS.CATEGORY_STARTERS',
      'Main Course': 'PRODUCTS.CATEGORY_MAIN_COURSE',
      Desserts: 'PRODUCTS.CATEGORY_DESSERTS',
      Beverages: 'PRODUCTS.CATEGORY_BEVERAGES',
      Sides: 'PRODUCTS.CATEGORY_SIDES',
      Other: 'PUBLIC_MENU.CATEGORY_OTHER',
    };
    const key = keyMap[category];
    return key ? this.translate.instant(key) : category;
  }

  categoryPanelId(categoryId: string): string {
    return `public-menu-cat-panel-${categoryId}`;
  }

  categoryToggleAriaLabel(category: PublicTenantMenuCategory): string {
    const name = this.getCategoryLabel(category.name);
    const key = this.isCategoryExpanded(category.id)
      ? 'PUBLIC_MENU.COLLAPSE_CATEGORY'
      : 'PUBLIC_MENU.EXPAND_CATEGORY';
    return this.translate.instant(key, { category: name });
  }

  displayName(): string {
    return this.menu()?.tenant_name?.trim() || this.tenant()?.name?.trim() || '';
  }

  currencyLabel(): string {
    return this.menu()?.currency?.trim() || '';
  }

  getLogoSafeUrl(url: string | null): SafeResourceUrl | string {
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : '';
  }

  headerBackgroundStyle(): SafeStyle | null {
    const filename = this.tenant()?.header_background_filename;
    const tid = this.tenant()?.id;
    if (!filename || tid == null) return null;
    const url = this.api.getTenantHeaderBackgroundUrl(filename, tid);
    return this.sanitizer.bypassSecurityTrustStyle(`url('${url}')`);
  }

  productImageUrl(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = environment.apiUrl.replace(/\/$/, '');
    return url.startsWith('/') ? base + url : `${base}/${url}`;
  }

  formatPrice(product: { price_formatted: string }): string {
    const amount = product.price_formatted;
    const code = this.currencyLabel();
    return code ? `${amount} ${code}` : amount;
  }

  modifierGroups(product: unknown): PublicModifierGroup[] {
    const raw = (product as { modifier_groups?: unknown })?.modifier_groups;
    if (!Array.isArray(raw)) return [];
    return raw.filter((group): group is PublicModifierGroup => {
      if (!group || typeof group !== 'object') return false;
      const candidate = group as Partial<PublicModifierGroup>;
      return typeof candidate.id === 'number' && typeof candidate.name === 'string' && Array.isArray(candidate.options);
    });
  }

  modifierRule(group: PublicModifierGroup): string {
    if (group.is_required) {
      if (group.min_select === group.max_select) return `Escolha ${group.min_select}`;
      return `Escolha de ${group.min_select} a ${group.max_select}`;
    }
    if (group.max_select === 1) return 'Opcional · escolha até 1';
    return `Opcional · escolha até ${group.max_select}`;
  }

  formatModifierPrice(cents: number): string {
    if (!cents) return 'sem acréscimo';
    const code = this.currencyLabel() || 'BRL';
    try {
      return `+ ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: code }).format(cents / 100)}`;
    } catch {
      return `+ R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
    }
  }

  comboItems(productId: number): PublicComboItem[] {
    return this.comboCompositions()[productId] ?? [];
  }

  isFeatured(productId: number): boolean {
    return this.merchandising()[productId]?.is_featured === true;
  }

  productLabels(productId: number): string[] {
    return this.merchandising()[productId]?.labels ?? [];
  }

  whatsappHref(): string | null {
    const value = this.tenant()?.whatsapp?.replace(/\D/g, '') ?? '';
    return value ? `https://wa.me/${value}` : null;
  }

  phoneHref(): string | null {
    const value = this.tenant()?.phone?.trim();
    return value ? `tel:${value.replace(/\s/g, '')}` : null;
  }

  private normalizedSearchQuery(): string {
    return this.normalizeSearchValue(this.searchQuery());
  }

  private productMatchesSearch(
    product: PublicTenantMenuProduct,
    category: PublicTenantMenuCategory,
    normalizedQuery: string,
  ): boolean {
    const searchable = [
      product.name,
      product.description,
      product.category,
      product.subcategory,
      category.name,
      ...this.productLabels(product.id),
      ...this.comboItems(product.id).map((item) => item.name),
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ');
    return this.normalizeSearchValue(searchable).includes(normalizedQuery);
  }

  private normalizeSearchValue(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  private updateDocumentTitle(): void {
    const name = this.displayName();
    const err = this.errorKind();
    let key: string;
    if (this.loading() && !err) key = 'PUBLIC_MENU.LOADING';
    else if (err === 'invalid_tenant') key = 'PUBLIC_MENU.INVALID_TENANT';
    else if (err === 'tenant_not_found') key = 'PUBLIC_MENU.TENANT_NOT_FOUND';
    else if (err === 'menu_load_failed') key = 'PUBLIC_MENU.LOAD_FAILED';
    else if (name) {
      this.title.setTitle(`${name} — ${this.translate.instant('PUBLIC_MENU.PAGE_TITLE')}`);
      return;
    } else key = 'PUBLIC_MENU.PAGE_TITLE';
    this.title.setTitle(this.translate.instant(key));
  }
}
