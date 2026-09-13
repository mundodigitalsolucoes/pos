import { Component, computed, inject, signal } from '@angular/core';
import { SidebarComponent } from '../shared/sidebar.component';
import { ApiService, User } from '../services/api.service';

@Component({
  selector: 'app-cardapio-online',
  standalone: true,
  imports: [SidebarComponent],
  template: `
    <app-sidebar>
      <section class="page">
        <header class="page-header">
          <div>
            <p class="eyebrow">Canal de vendas</p>
            <h1>Cardápio Online</h1>
            <p class="subtitle">Abra a vitrine pública do restaurante e confira exatamente o que o cliente está vendo.</p>
          </div>
        </header>

        @if (tenantId()) {
          <div class="channel-grid">
            <article class="channel-card channel-card--primary">
              <div>
                <span class="status-dot" aria-hidden="true"></span>
                <span class="channel-kicker">Cardápio público</span>
              </div>
              <h2>Seu cardápio online</h2>
              <p>Produtos, preços e disponibilidade publicados para o cliente.</p>
              <a class="primary-action" [href]="publicMenuUrl()" target="_blank" rel="noopener noreferrer">
                Ver cardápio online
                <span aria-hidden="true">↗</span>
              </a>
            </article>

            <article class="channel-card">
              <span class="channel-kicker">Delivery próprio</span>
              <h2>Pedido para entrega</h2>
              <p>Confira o fluxo público de delivery já disponível para este restaurante.</p>
              <a class="secondary-action" [href]="deliveryUrl()" target="_blank" rel="noopener noreferrer">
                Abrir delivery
                <span aria-hidden="true">↗</span>
              </a>
            </article>
          </div>

          <div class="tip">
            <strong>Antes de divulgar:</strong>
            valide produtos, preços e disponibilidade no Cardápio e faça um pedido de teste pelo fluxo público.
          </div>
        } @else {
          <div class="empty-state">
            <h2>Restaurante não identificado</h2>
            <p>Entre novamente na conta do restaurante para acessar os canais públicos.</p>
          </div>
        }
      </section>
    </app-sidebar>
  `,
  styles: [`
    .page { padding: 2rem; max-width: 1120px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
    .eyebrow { margin: 0 0 .35rem; color: #D6A92F; font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0; color: #2F3453; font-size: clamp(1.75rem, 4vw, 2.4rem); }
    .subtitle { max-width: 700px; margin: .55rem 0 0; color: #667085; line-height: 1.55; }
    .channel-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
    .channel-card { display: flex; flex-direction: column; min-height: 250px; padding: 1.5rem; border: 1px solid rgba(47, 52, 83, .12); border-radius: 18px; background: #fff; box-shadow: 0 10px 28px rgba(47, 52, 83, .06); }
    .channel-card--primary { border-top: 4px solid #D6A92F; }
    .channel-kicker { color: #374B89; font-size: .82rem; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
    .status-dot { display: inline-block; width: 9px; height: 9px; margin-right: .45rem; border-radius: 50%; background: #22c55e; }
    h2 { margin: 1rem 0 .5rem; color: #2F3453; font-size: 1.25rem; }
    .channel-card p { margin: 0 0 1.5rem; color: #667085; line-height: 1.5; }
    .primary-action, .secondary-action { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 46px; margin-top: auto; padding: .75rem 1rem; border-radius: 10px; font-weight: 800; text-decoration: none; }
    .primary-action { color: #fff; background: #374B89; }
    .primary-action:hover { background: #2F3453; }
    .secondary-action { color: #374B89; border: 1px solid rgba(55, 75, 137, .28); background: #F7F5EF; }
    .secondary-action:hover { border-color: #D6A92F; color: #2F3453; }
    .tip, .empty-state { margin-top: 1rem; padding: 1rem 1.15rem; border-radius: 12px; background: #F7F5EF; color: #475467; line-height: 1.5; }
    .tip strong { color: #2F3453; }
    @media (max-width: 720px) {
      .page { padding: 1rem; }
      .channel-grid { grid-template-columns: 1fr; }
      .channel-card { min-height: 220px; }
    }
  `],
})
export class CardapioOnlineComponent {
  private readonly api = inject(ApiService);
  private readonly user = signal<User | null>(null);

  readonly tenantId = computed(() => this.user()?.tenant_id ?? null);
  readonly publicMenuUrl = computed(() => `/public-menu/${this.tenantId()}`);
  readonly deliveryUrl = computed(() => `/delivery/${this.tenantId()}`);

  constructor() {
    this.api.user$.subscribe((user) => this.user.set(user));
  }
}
