import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../shared/sidebar.component';

interface CatalogCategory {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
}

@Component({
  selector: 'app-catalog-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent],
  template: `
    <app-sidebar>
      <main class="page">
        <header class="page-head">
          <div>
            <p class="eyebrow">Cardápio</p>
            <h1>Categorias</h1>
            <p>Crie, organize e ative as categorias que aparecem no cadastro dos seus produtos.</p>
          </div>
          <a routerLink="/products" class="btn secondary">Voltar ao Cardápio</a>
        </header>

        <section class="create-card">
          <div>
            <h2>Nova categoria</h2>
            <p>Ex.: Pizzas especiais, Combos, Bebidas, Sobremesas.</p>
          </div>
          <form (ngSubmit)="create()" class="create-form">
            <input
              type="text"
              maxlength="128"
              [(ngModel)]="newName"
              name="newName"
              placeholder="Nome da categoria"
              [disabled]="saving()"
            />
            <button type="submit" class="btn primary" [disabled]="saving() || !newName.trim()">
              + Criar categoria
            </button>
          </form>
        </section>

        @if (error()) {
          <div class="message error" role="alert">{{ error() }}</div>
        }

        <section class="list-card">
          <div class="list-head">
            <div>
              <h2>Categorias do restaurante</h2>
              <p>As categorias ativas ficam disponíveis ao criar ou editar produtos.</p>
            </div>
            <span class="count">{{ categories().length }} cadastrada(s)</span>
          </div>

          @if (loading()) {
            <div class="empty">Carregando categorias…</div>
          } @else if (categories().length === 0) {
            <div class="empty">
              <strong>Nenhuma categoria personalizada ainda.</strong>
              <span>Crie a primeira categoria acima. As categorias padrão continuam disponíveis.</span>
            </div>
          } @else {
            <div class="category-list">
              @for (category of categories(); track category.id; let index = $index) {
                <article class="category-row" [class.inactive]="!category.is_active">
                  <div class="order-actions" aria-label="Ordenação">
                    <button type="button" (click)="move(index, -1)" [disabled]="index === 0 || saving()" title="Mover para cima">↑</button>
                    <button type="button" (click)="move(index, 1)" [disabled]="index === categories().length - 1 || saving()" title="Mover para baixo">↓</button>
                  </div>

                  <div class="category-name">
                    @if (editingId() === category.id) {
                      <input
                        type="text"
                        maxlength="128"
                        [(ngModel)]="editName"
                        (keyup.enter)="saveName(category)"
                        (keyup.escape)="cancelEdit()"
                        autofocus
                      />
                    } @else {
                      <strong>{{ category.name }}</strong>
                      <small>Ordem {{ category.sort_order }}</small>
                    }
                  </div>

                  <label class="status-toggle">
                    <input
                      type="checkbox"
                      [checked]="category.is_active"
                      (change)="toggle(category, $event)"
                      [disabled]="saving()"
                    />
                    <span>{{ category.is_active ? 'Ativa' : 'Inativa' }}</span>
                  </label>

                  <div class="row-actions">
                    @if (editingId() === category.id) {
                      <button type="button" class="text-btn" (click)="saveName(category)" [disabled]="saving()">Salvar</button>
                      <button type="button" class="text-btn" (click)="cancelEdit()">Cancelar</button>
                    } @else {
                      <button type="button" class="text-btn" (click)="startEdit(category)">Renomear</button>
                      <button type="button" class="text-btn danger" (click)="remove(category)" [disabled]="saving()">Excluir</button>
                    }
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
    .page { max-width: 1180px; margin: 0 auto; padding: 2rem; }
    .page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
    .eyebrow { margin: 0 0 .3rem; color: #D6A92F; font-size: .76rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
    h1 { margin: 0; color: #2F3453; font-size: clamp(1.9rem, 4vw, 2.4rem); }
    .page-head p:last-child, .create-card p, .list-head p { color: #667085; margin: .45rem 0 0; }
    .create-card, .list-card { background: #fff; border: 1px solid rgba(47,52,83,.12); border-radius: 16px; box-shadow: 0 10px 28px rgba(47,52,83,.05); }
    .create-card { padding: 1.1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .create-card h2, .list-head h2 { margin: 0; color: #2F3453; font-size: 1rem; }
    .create-form { display: flex; gap: .6rem; flex: 1 1 430px; max-width: 560px; }
    .create-form input, .category-name input { width: 100%; min-height: 42px; border: 1px solid #d7dbe6; border-radius: 9px; padding: .65rem .75rem; font: inherit; }
    .create-form input:focus, .category-name input:focus { outline: 2px solid rgba(55,75,137,.18); border-color: #374B89; }
    .btn { min-height: 42px; padding: .65rem .9rem; border-radius: 9px; font: inherit; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; white-space: nowrap; }
    .btn.primary { border: 1px solid #374B89; background: #374B89; color: #fff; }
    .btn.secondary { border: 1px solid rgba(55,75,137,.35); background: #fff; color: #374B89; }
    .btn:disabled { opacity: .55; cursor: not-allowed; }
    .list-head { padding: 1.15rem 1.25rem; border-bottom: 1px solid rgba(47,52,83,.1); display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .count { font-size: .82rem; font-weight: 700; color: #374B89; background: rgba(55,75,137,.08); padding: .35rem .55rem; border-radius: 999px; }
    .category-list { display: flex; flex-direction: column; }
    .category-row { min-height: 70px; display: grid; grid-template-columns: 70px minmax(220px,1fr) 120px auto; align-items: center; gap: 1rem; padding: .8rem 1.1rem; border-bottom: 1px solid rgba(47,52,83,.08); }
    .category-row:last-child { border-bottom: 0; }
    .category-row.inactive { background: #fafafa; opacity: .72; }
    .order-actions { display: flex; gap: .3rem; }
    .order-actions button { width: 30px; height: 30px; border: 1px solid #d7dbe6; border-radius: 7px; background: #fff; color: #374B89; cursor: pointer; }
    .order-actions button:disabled { opacity: .35; cursor: default; }
    .category-name { display: flex; flex-direction: column; gap: .2rem; color: #2F3453; }
    .category-name small { color: #98a2b3; }
    .status-toggle { display: flex; align-items: center; gap: .45rem; font-size: .88rem; color: #475467; }
    .row-actions { display: flex; justify-content: flex-end; gap: .65rem; }
    .text-btn { border: 0; background: transparent; color: #374B89; font: inherit; font-size: .86rem; font-weight: 700; cursor: pointer; padding: .35rem; }
    .text-btn.danger { color: #b42318; }
    .empty { padding: 2.2rem 1.2rem; display: flex; flex-direction: column; align-items: center; gap: .35rem; color: #667085; text-align: center; }
    .message { padding: .75rem 1rem; border-radius: 10px; margin-bottom: 1rem; }
    .message.error { background: #fff1f0; color: #b42318; border: 1px solid #ffd0cc; }
    @media (max-width: 760px) {
      .page { padding: 1rem; }
      .page-head, .create-card { align-items: stretch; flex-direction: column; }
      .create-form { max-width: none; flex-basis: auto; flex-direction: column; }
      .category-row { grid-template-columns: 58px 1fr; gap: .65rem; }
      .status-toggle { grid-column: 2; }
      .row-actions { grid-column: 2; justify-content: flex-start; }
    }
  `]
})
export class CatalogCategoriesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBase = String((window as Window & { __API_URL__?: string }).__API_URL__ || '/api').replace(/\/$/, '');

  readonly categories = signal<CatalogCategory[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);
  newName = '';
  editName = '';

  ngOnInit(): void { this.load(); }

  private endpoint(suffix = ''): string {
    return `${this.apiBase}/tenant/subcategories/catalog-categories${suffix}`;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<CatalogCategory[]>(this.endpoint(), { withCredentials: true }).subscribe({
      next: rows => { this.categories.set(rows); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.detail || 'Não foi possível carregar as categorias.'); this.loading.set(false); }
    });
  }

  create(): void {
    const name = this.newName.trim();
    if (!name || this.saving()) return;
    this.saving.set(true);
    const nextOrder = this.categories().length ? Math.max(...this.categories().map(c => c.sort_order)) + 10 : 10;
    this.http.post<CatalogCategory>(this.endpoint(), { name, sort_order: nextOrder }, { withCredentials: true }).subscribe({
      next: () => { this.newName = ''; this.saving.set(false); this.load(); },
      error: err => { this.error.set(err?.error?.detail || 'Não foi possível criar a categoria.'); this.saving.set(false); }
    });
  }

  startEdit(category: CatalogCategory): void {
    this.editingId.set(category.id);
    this.editName = category.name;
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editName = '';
  }

  saveName(category: CatalogCategory): void {
    const name = this.editName.trim();
    if (!name || name === category.name) { this.cancelEdit(); return; }
    this.update(category.id, { name }, () => this.cancelEdit());
  }

  toggle(category: CatalogCategory, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.update(category.id, { is_active: checked });
  }

  move(index: number, direction: number): void {
    const rows = [...this.categories()];
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const current = rows[index];
    const other = rows[target];
    const currentOrder = current.sort_order;
    const otherOrder = other.sort_order;
    this.saving.set(true);
    this.http.put(this.endpoint(`/${current.id}`), { sort_order: otherOrder }, { withCredentials: true }).subscribe({
      next: () => {
        this.http.put(this.endpoint(`/${other.id}`), { sort_order: currentOrder }, { withCredentials: true }).subscribe({
          next: () => { this.saving.set(false); this.load(); },
          error: err => { this.error.set(err?.error?.detail || 'Não foi possível reordenar as categorias.'); this.saving.set(false); this.load(); }
        });
      },
      error: err => { this.error.set(err?.error?.detail || 'Não foi possível reordenar as categorias.'); this.saving.set(false); }
    });
  }

  remove(category: CatalogCategory): void {
    if (!window.confirm(`Excluir a categoria “${category.name}”? Os produtos existentes não serão apagados.`)) return;
    this.saving.set(true);
    this.http.delete(this.endpoint(`/${category.id}`), { withCredentials: true }).subscribe({
      next: () => { this.saving.set(false); this.load(); },
      error: err => { this.error.set(err?.error?.detail || 'Não foi possível excluir a categoria.'); this.saving.set(false); }
    });
  }

  private update(id: number, body: Partial<CatalogCategory>, done?: () => void): void {
    this.saving.set(true);
    this.error.set(null);
    this.http.put<CatalogCategory>(this.endpoint(`/${id}`), body, { withCredentials: true }).subscribe({
      next: () => { this.saving.set(false); done?.(); this.load(); },
      error: err => { this.error.set(err?.error?.detail || 'Não foi possível atualizar a categoria.'); this.saving.set(false); }
    });
  }
}
