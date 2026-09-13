import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from '../shared/sidebar.component';
import { environment } from '../../environments/environment';

interface CatalogMerchandisingRow {
  product_id: number;
  product_name: string;
  category: string | null;
  is_featured: boolean;
  labels: string[];
}

@Component({
  selector: 'app-catalog-merchandising',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <main class="main-content merchandising-page">
        <header class="page-header">
          <div>
            <p class="eyebrow">Cardápio</p>
            <h1>Destaques e etiquetas</h1>
            <p>Defina produtos em evidência e etiquetas comerciais como “Mais pedido”, “Novo” ou “Vegetariano”.</p>
          </div>
        </header>

        <section class="toolbar">
          <label class="search-field">
            <span>Buscar produto</span>
            <input [(ngModel)]="search" placeholder="Digite nome ou categoria" />
          </label>
          <div class="summary">
            <strong>{{ featuredCount() }}</strong>
            <span>produto(s) em destaque</span>
          </div>
        </section>

        @if (loading()) {
          <section class="state-card">Carregando produtos…</section>
        } @else if (error()) {
          <section class="state-card error">{{ error() }}</section>
        } @else {
          <section class="product-grid">
            @for (item of filteredRows(); track item.product_id) {
              <article class="product-card" [class.featured]="item.is_featured">
                <div class="product-head">
                  <div>
                    <span class="category">{{ item.category || 'Sem categoria' }}</span>
                    <h2>{{ item.product_name }}</h2>
                  </div>
                  <label class="featured-toggle">
                    <input
                      type="checkbox"
                      [checked]="item.is_featured"
                      (change)="toggleFeatured(item, $any($event.target).checked)"
                    />
                    <span>Destacar</span>
                  </label>
                </div>

                <div class="labels-block">
                  <label>Etiquetas</label>
                  <div class="chips">
                    @for (label of item.labels; track label) {
                      <button type="button" class="chip" (click)="removeLabel(item, label)" [title]="'Remover ' + label">
                        {{ label }} <span aria-hidden="true">×</span>
                      </button>
                    }
                  </div>
                  <div class="label-entry">
                    <input
                      #labelInput
                      maxlength="40"
                      placeholder="Ex.: Mais pedido"
                      (keyup.enter)="addLabel(item, labelInput)"
                    />
                    <button type="button" (click)="addLabel(item, labelInput)">Adicionar</button>
                  </div>
                  <small>Até 12 etiquetas por produto. Clique em uma etiqueta para removê-la.</small>
                </div>

                @if (savingProductId() === item.product_id) {
                  <div class="saving">Salvando…</div>
                }
              </article>
            } @empty {
              <section class="state-card">Nenhum produto encontrado.</section>
            }
          </section>
        }
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #F7F5EF; }
    .main-content { padding: 32px; }
    .merchandising-page { min-height: 100vh; }
    .page-header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
    .eyebrow { margin: 0 0 6px; color: #374B89; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0; color: #2F3453; font-size: clamp(28px, 3vw, 40px); }
    .page-header p:last-child { margin: 8px 0 0; max-width: 760px; color: #666B7E; }
    .toolbar { display: flex; align-items: end; justify-content: space-between; gap: 20px; padding: 18px; margin-bottom: 22px; background: #fff; border: 1px solid rgba(47,52,83,.10); border-radius: 18px; box-shadow: 0 8px 24px rgba(47,52,83,.06); }
    .search-field { display: grid; gap: 7px; flex: 1; max-width: 520px; color: #2F3453; font-size: 13px; font-weight: 700; }
    .search-field input, .label-entry input { width: 100%; box-sizing: border-box; border: 1px solid #D9DBE5; border-radius: 10px; padding: 11px 12px; font: inherit; background: #fff; color: #2F3453; }
    .search-field input:focus, .label-entry input:focus { outline: 2px solid rgba(55,75,137,.18); border-color: #374B89; }
    .summary { display: flex; align-items: baseline; gap: 8px; color: #666B7E; }
    .summary strong { color: #374B89; font-size: 26px; }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; }
    .product-card { position: relative; background: #fff; border: 1px solid rgba(47,52,83,.10); border-radius: 18px; padding: 20px; box-shadow: 0 8px 24px rgba(47,52,83,.05); }
    .product-card.featured { border-color: rgba(214,169,47,.62); box-shadow: 0 10px 28px rgba(214,169,47,.12); }
    .product-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
    .category { display: inline-block; margin-bottom: 6px; color: #777C8F; font-size: 12px; font-weight: 700; }
    h2 { margin: 0; color: #2F3453; font-size: 18px; }
    .featured-toggle { display: flex; align-items: center; gap: 7px; color: #2F3453; font-size: 13px; font-weight: 700; white-space: nowrap; }
    .featured-toggle input { accent-color: #D6A92F; width: 18px; height: 18px; }
    .labels-block { margin-top: 18px; padding-top: 16px; border-top: 1px solid #EEEFF3; }
    .labels-block > label { display: block; margin-bottom: 9px; color: #2F3453; font-size: 13px; font-weight: 800; }
    .chips { display: flex; flex-wrap: wrap; gap: 7px; min-height: 28px; margin-bottom: 10px; }
    .chip { border: 1px solid rgba(55,75,137,.16); background: #F3F5FB; color: #374B89; border-radius: 999px; padding: 6px 10px; cursor: pointer; }
    .chip:hover { background: #E9ECF7; }
    .label-entry { display: flex; gap: 8px; }
    .label-entry button { border: 0; border-radius: 10px; padding: 0 14px; background: #374B89; color: #fff; font-weight: 800; cursor: pointer; }
    .label-entry button:hover { background: #2F3453; }
    small { display: block; margin-top: 8px; color: #85899A; }
    .saving { position: absolute; right: 18px; bottom: 12px; color: #374B89; font-size: 12px; font-weight: 700; }
    .state-card { padding: 28px; background: #fff; border: 1px solid rgba(47,52,83,.10); border-radius: 16px; color: #666B7E; }
    .state-card.error { color: #9B2C2C; border-color: rgba(155,44,44,.24); background: #FFF8F8; }
    @media (max-width: 768px) {
      .main-content { padding: 20px 16px 30px; }
      .toolbar { align-items: stretch; flex-direction: column; }
      .summary { justify-content: space-between; }
      .product-grid { grid-template-columns: 1fr; }
      .product-head { flex-direction: column; }
      .label-entry { flex-direction: column; }
      .label-entry button { min-height: 42px; }
    }
  `]
})
export class CatalogMerchandisingComponent {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  readonly rows = signal<CatalogMerchandisingRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly savingProductId = signal<number | null>(null);
  search = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.http.get<CatalogMerchandisingRow[]>(`${this.apiUrl}/tenant/subcategories/catalog-merchandising`).subscribe({
      next: (rows) => {
        this.rows.set(rows.map((row) => ({ ...row, labels: Array.isArray(row.labels) ? row.labels : [] })));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar os destaques e etiquetas do cardápio.');
        this.loading.set(false);
      }
    });
  }

  filteredRows(): CatalogMerchandisingRow[] {
    const term = this.search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return this.rows();
    return this.rows().filter((row) =>
      row.product_name.toLocaleLowerCase('pt-BR').includes(term) ||
      (row.category || '').toLocaleLowerCase('pt-BR').includes(term) ||
      row.labels.some((label) => label.toLocaleLowerCase('pt-BR').includes(term))
    );
  }

  featuredCount(): number {
    return this.rows().filter((row) => row.is_featured).length;
  }

  toggleFeatured(item: CatalogMerchandisingRow, isFeatured: boolean): void {
    this.persist(item, { ...item, is_featured: isFeatured });
  }

  addLabel(item: CatalogMerchandisingRow, input: HTMLInputElement): void {
    const label = input.value.trim();
    if (!label || item.labels.some((existing) => existing.toLocaleLowerCase('pt-BR') === label.toLocaleLowerCase('pt-BR'))) {
      input.value = '';
      return;
    }
    if (item.labels.length >= 12) return;
    this.persist(item, { ...item, labels: [...item.labels, label] });
    input.value = '';
  }

  removeLabel(item: CatalogMerchandisingRow, label: string): void {
    this.persist(item, { ...item, labels: item.labels.filter((value) => value !== label) });
  }

  private persist(current: CatalogMerchandisingRow, updated: CatalogMerchandisingRow): void {
    this.savingProductId.set(current.product_id);
    this.http.put<CatalogMerchandisingRow>(
      `${this.apiUrl}/tenant/subcategories/catalog-merchandising/${current.product_id}`,
      { is_featured: updated.is_featured, labels: updated.labels }
    ).subscribe({
      next: (saved) => {
        this.rows.update((rows) => rows.map((row) => row.product_id === current.product_id
          ? { ...updated, is_featured: saved.is_featured, labels: saved.labels || [] }
          : row));
        this.savingProductId.set(null);
      },
      error: () => {
        this.error.set('Não foi possível salvar a configuração deste produto.');
        this.savingProductId.set(null);
      }
    });
  }
}
