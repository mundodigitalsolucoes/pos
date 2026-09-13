import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../shared/sidebar.component';

interface ComboItem {
  product_id: number;
  name: string;
  quantity: number;
}

interface CatalogCombo {
  id: number;
  product_id: number;
  name: string;
  price_cents: number;
  description?: string | null;
  is_active: boolean;
  items: ComboItem[];
}

interface CatalogProductOption {
  id: number;
  name: string;
  price_cents: number;
  category?: string | null;
}

interface ComboPayload {
  combos: CatalogCombo[];
  available_products: CatalogProductOption[];
}

@Component({
  selector: 'app-catalog-combos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent],
  template: `
    <app-sidebar>
      <main class="page">
        <header class="page-head">
          <div>
            <p class="eyebrow">Cardápio</p>
            <h1>Combos</h1>
            <p>Monte ofertas com vários produtos e venda o conjunto por um preço próprio.</p>
          </div>
          <a routerLink="/products" class="btn secondary">Voltar ao Cardápio</a>
        </header>

        @if (error()) {
          <div class="message error" role="alert">{{ error() }}</div>
        }

        <section class="editor-card">
          <div class="editor-title">
            <div>
              <h2>{{ editingId() ? 'Editar combo' : 'Novo combo' }}</h2>
              <p>O combo vira um item vendável do cardápio e pode receber destaque, etiqueta e promoção como qualquer produto.</p>
            </div>
            @if (editingId()) {
              <button type="button" class="text-btn" (click)="resetForm()">Cancelar edição</button>
            }
          </div>

          <div class="form-grid">
            <label>
              Nome do combo
              <input type="text" maxlength="180" [(ngModel)]="name" placeholder="Ex.: Combo Família" />
            </label>
            <label>
              Preço de venda
              <div class="money-input"><span>R$</span><input type="text" inputmode="decimal" [(ngModel)]="price" placeholder="0,00" /></div>
            </label>
            <label class="full">
              Descrição
              <textarea rows="2" maxlength="4000" [(ngModel)]="description" placeholder="Explique a oferta em poucas palavras"></textarea>
            </label>
          </div>

          <div class="products-head">
            <div>
              <h3>Produtos do combo</h3>
              <p>Selecione os itens e informe a quantidade de cada um.</p>
            </div>
            <input class="search" type="search" [(ngModel)]="productSearch" placeholder="Buscar produto" />
          </div>

          <div class="product-grid">
            @for (product of filteredProducts(); track product.id) {
              <label class="product-option" [class.selected]="isSelected(product.id)">
                <input type="checkbox" [checked]="isSelected(product.id)" (change)="toggleProduct(product.id, $event)" />
                <span class="product-copy">
                  <strong>{{ product.name }}</strong>
                  <small>{{ product.category || 'Sem categoria' }} · {{ formatMoney(product.price_cents) }}</small>
                </span>
                @if (isSelected(product.id)) {
                  <span class="qty-wrap" (click)="$event.preventDefault(); $event.stopPropagation()">
                    <span>Qtd.</span>
                    <input type="number" min="1" max="99" [ngModel]="selectedItems()[product.id]" (ngModelChange)="setQuantity(product.id, $event)" />
                  </span>
                }
              </label>
            } @empty {
              <p class="empty-products">Nenhum produto encontrado.</p>
            }
          </div>

          <div class="editor-actions">
            <span>{{ selectedCount() }} produto(s) selecionado(s)</span>
            <button type="button" class="btn primary" [disabled]="saving() || !canSave()" (click)="save()">
              {{ saving() ? 'Salvando…' : (editingId() ? 'Salvar combo' : '+ Criar combo') }}
            </button>
          </div>
        </section>

        <section class="list-card">
          <div class="list-head">
            <div>
              <h2>Combos cadastrados</h2>
              <p>Combos ativos ficam disponíveis para venda no cardápio.</p>
            </div>
            <span class="count">{{ combos().length }} cadastrado(s)</span>
          </div>

          @if (loading()) {
            <div class="empty">Carregando combos…</div>
          } @else if (combos().length === 0) {
            <div class="empty"><strong>Nenhum combo ainda.</strong><span>Crie a primeira oferta usando o formulário acima.</span></div>
          } @else {
            <div class="combo-list">
              @for (combo of combos(); track combo.id) {
                <article class="combo-row" [class.inactive]="!combo.is_active">
                  <div class="combo-main">
                    <div class="combo-name-line">
                      <strong>{{ combo.name }}</strong>
                      <span class="price">{{ formatMoney(combo.price_cents) }}</span>
                      <span class="status" [class.active]="combo.is_active">{{ combo.is_active ? 'Ativo' : 'Inativo' }}</span>
                    </div>
                    @if (combo.description) { <p>{{ combo.description }}</p> }
                    <div class="combo-items">
                      @for (item of combo.items; track item.product_id) {
                        <span>{{ item.quantity }}× {{ item.name }}</span>
                      }
                    </div>
                  </div>
                  <div class="row-actions">
                    <button type="button" class="text-btn" (click)="edit(combo)">Editar</button>
                    <button type="button" class="text-btn" (click)="toggleActive(combo)" [disabled]="saving()">
                      {{ combo.is_active ? 'Desativar' : 'Ativar' }}
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        </section>
      </main>
    </app-sidebar>
  `,
  styles: [`
    .page{max-width:1200px;margin:0 auto;padding:2rem}.page-head{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1.25rem}.eyebrow{margin:0 0 .25rem;color:#D6A92F;font-size:.75rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}h1{margin:0;color:#2F3453;font-size:clamp(1.9rem,4vw,2.4rem)}.page-head p:last-child,.editor-title p,.products-head p,.list-head p{margin:.4rem 0 0;color:#667085}.editor-card,.list-card{background:#fff;border:1px solid rgba(47,52,83,.12);border-radius:16px;box-shadow:0 10px 28px rgba(47,52,83,.05)}.editor-card{padding:1.25rem;margin-bottom:1rem}.editor-title,.products-head,.list-head{display:flex;justify-content:space-between;align-items:center;gap:1rem}.editor-title h2,.list-head h2{margin:0;color:#2F3453;font-size:1.05rem}.products-head{margin-top:1.25rem}.products-head h3{margin:0;color:#2F3453;font-size:1rem}.form-grid{display:grid;grid-template-columns:2fr 1fr;gap:1rem;margin-top:1rem}.form-grid label{display:flex;flex-direction:column;gap:.35rem;color:#344054;font-size:.86rem;font-weight:700}.form-grid .full{grid-column:1/-1}.form-grid input,.form-grid textarea,.search{border:1px solid #d7dbe6;border-radius:9px;padding:.65rem .75rem;font:inherit}.money-input{display:flex;align-items:center;border:1px solid #d7dbe6;border-radius:9px;overflow:hidden}.money-input span{padding:0 .7rem;color:#667085}.money-input input{border:0;flex:1;min-width:0}.search{width:min(300px,100%)}.product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem;margin-top:.8rem;max-height:360px;overflow:auto;padding-right:.2rem}.product-option{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:.65rem;padding:.75rem;border:1px solid #e2e5ec;border-radius:10px;cursor:pointer}.product-option.selected{border-color:#374B89;background:rgba(55,75,137,.05)}.product-copy{display:flex;flex-direction:column;min-width:0}.product-copy strong{color:#2F3453}.product-copy small{color:#667085;margin-top:.15rem}.qty-wrap{display:flex;align-items:center;gap:.35rem;color:#667085;font-size:.75rem}.qty-wrap input{width:56px;border:1px solid #d7dbe6;border-radius:7px;padding:.35rem}.editor-actions{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:1rem;padding-top:1rem;border-top:1px solid rgba(47,52,83,.08);color:#667085;font-size:.85rem}.btn{min-height:42px;padding:.65rem .9rem;border-radius:9px;font:inherit;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.btn.primary{border:1px solid #374B89;background:#374B89;color:#fff}.btn.secondary{border:1px solid rgba(55,75,137,.35);background:#fff;color:#374B89}.btn:disabled{opacity:.55;cursor:not-allowed}.list-head{padding:1.1rem 1.25rem;border-bottom:1px solid rgba(47,52,83,.1)}.count{font-size:.82rem;font-weight:700;color:#374B89;background:rgba(55,75,137,.08);padding:.35rem .55rem;border-radius:999px}.combo-row{display:flex;justify-content:space-between;gap:1rem;padding:1rem 1.2rem;border-bottom:1px solid rgba(47,52,83,.08)}.combo-row:last-child{border-bottom:0}.combo-row.inactive{background:#fafafa;opacity:.7}.combo-main{min-width:0;flex:1}.combo-name-line{display:flex;align-items:center;gap:.55rem;flex-wrap:wrap;color:#2F3453}.price{color:#008f3f;font-weight:800}.status{font-size:.72rem;font-weight:800;padding:.2rem .45rem;border-radius:999px;background:#f2f4f7;color:#667085}.status.active{background:#ecfdf3;color:#027a48}.combo-main p{margin:.35rem 0;color:#667085}.combo-items{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.45rem}.combo-items span{background:#F7F5EF;border-radius:999px;padding:.3rem .55rem;color:#475467;font-size:.78rem}.row-actions{display:flex;align-items:center;gap:.45rem}.text-btn{border:0;background:transparent;color:#374B89;font:inherit;font-size:.84rem;font-weight:700;cursor:pointer}.empty,.empty-products{padding:2rem;text-align:center;color:#667085}.empty{display:flex;flex-direction:column;gap:.3rem}.message{padding:.75rem 1rem;border-radius:10px;margin-bottom:1rem}.message.error{background:#fff1f0;color:#b42318;border:1px solid #ffd0cc}@media(max-width:760px){.page{padding:1rem}.page-head,.editor-title,.products-head,.editor-actions,.combo-row{align-items:stretch;flex-direction:column}.form-grid,.product-grid{grid-template-columns:1fr}.search{width:100%}.row-actions{justify-content:flex-start}}
  `],
})
export class CatalogCombosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBase = String((window as Window & { __API_URL__?: string }).__API_URL__ || '/api').replace(/\/$/, '');

  readonly combos = signal<CatalogCombo[]>([]);
  readonly products = signal<CatalogProductOption[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  readonly selectedItems = signal<Record<number, number>>({});

  name = '';
  price = '';
  description = '';
  productSearch = '';

  readonly filteredProducts = computed(() => {
    const term = this.productSearch.trim().toLocaleLowerCase('pt-BR');
    return this.products().filter(product => !term || product.name.toLocaleLowerCase('pt-BR').includes(term));
  });
  readonly selectedCount = computed(() => Object.keys(this.selectedItems()).length);

  ngOnInit(): void { this.load(); }

  private endpoint(suffix = ''): string { return `${this.apiBase}/tenant/subcategories/combos${suffix}`; }

  load(): void {
    this.loading.set(true); this.error.set(null);
    this.http.get<ComboPayload>(this.endpoint(), { withCredentials: true }).subscribe({
      next: data => { this.applyPayload(data); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.detail || 'Não foi possível carregar os combos.'); this.loading.set(false); },
    });
  }

  isSelected(productId: number): boolean { return this.selectedItems()[productId] != null; }

  toggleProduct(productId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = { ...this.selectedItems() };
    if (checked) next[productId] = 1; else delete next[productId];
    this.selectedItems.set(next);
  }

  setQuantity(productId: number, value: number | string): void {
    const qty = Math.min(99, Math.max(1, Number(value) || 1));
    this.selectedItems.set({ ...this.selectedItems(), [productId]: qty });
  }

  canSave(): boolean {
    return !!this.name.trim() && this.parsePrice() >= 0 && this.selectedCount() > 0;
  }

  save(): void {
    if (!this.canSave() || this.saving()) return;
    const body = {
      name: this.name.trim(),
      price_cents: this.parsePrice(),
      description: this.description.trim() || null,
      items: Object.entries(this.selectedItems()).map(([productId, quantity]) => ({ product_id: Number(productId), quantity })),
    };
    this.saving.set(true); this.error.set(null);
    const request = this.editingId()
      ? this.http.put<ComboPayload>(this.endpoint(`/${this.editingId()}`), body, { withCredentials: true })
      : this.http.post<ComboPayload>(this.endpoint(), body, { withCredentials: true });
    request.subscribe({
      next: data => { this.applyPayload(data); this.saving.set(false); this.resetForm(); },
      error: err => { this.error.set(err?.error?.detail || 'Não foi possível salvar o combo.'); this.saving.set(false); },
    });
  }

  edit(combo: CatalogCombo): void {
    this.editingId.set(combo.id);
    this.name = combo.name;
    this.price = (combo.price_cents / 100).toFixed(2).replace('.', ',');
    this.description = combo.description || '';
    const selected: Record<number, number> = {};
    for (const item of combo.items) selected[item.product_id] = item.quantity;
    this.selectedItems.set(selected);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleActive(combo: CatalogCombo): void {
    if (this.saving()) return;
    this.saving.set(true); this.error.set(null);
    this.http.put<ComboPayload>(this.endpoint(`/${combo.id}`), { is_active: !combo.is_active }, { withCredentials: true }).subscribe({
      next: data => { this.applyPayload(data); this.saving.set(false); },
      error: err => { this.error.set(err?.error?.detail || 'Não foi possível alterar o status do combo.'); this.saving.set(false); },
    });
  }

  resetForm(): void {
    this.editingId.set(null); this.name = ''; this.price = ''; this.description = ''; this.selectedItems.set({}); this.productSearch = '';
  }

  formatMoney(cents: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(cents) || 0) / 100);
  }

  private parsePrice(): number {
    const normalized = this.price.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
    const value = Number(normalized);
    return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : -1;
  }

  private applyPayload(data: ComboPayload): void {
    this.combos.set(Array.isArray(data.combos) ? data.combos : []);
    this.products.set(Array.isArray(data.available_products) ? data.available_products : []);
  }
}
