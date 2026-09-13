import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../shared/sidebar.component';
import { ApiService, User } from '../services/api.service';

@Component({
  selector: 'app-cardapio-online',
  standalone: true,
  imports: [SidebarComponent, RouterLink],
  template: `
    <app-sidebar>
      <section class="page">
        <header class="page-header">
          <div>
            <p class="eyebrow">Canal de vendas</p>
            <h1>Cardápio Online</h1>
            <p class="subtitle">Gerencie o catálogo e confira exatamente os canais públicos disponíveis para este restaurante.</p>
          </div>
        </header>

        @if (tenantId()) {
          <div class="channel-grid">
            <article class="channel-card channel-card--primary">
              <span class="channel-kicker">Cardápio público</span>
              <h2>Seu cardápio online</h2>
              <p>Produtos, preços e disponibilidade publicados para o cliente.</p>

              <div class="url-box">
                <span>{{ publicMenuAbsoluteUrl() }}</span>
                <button type="button" (click)="copyPublicMenuLink()">
                  {{ copiedChannel() === 'menu' ? 'Link copiado' : 'Copiar link' }}
                </button>
              </div>

              <div class="actions-row">
                <a class="primary-action" [href]="publicMenuUrl()" target="_blank" rel="noopener noreferrer">
                  Ver cardápio online
                  <span aria-hidden="true">↗</span>
                </a>
                <a class="secondary-action" routerLink="/products">Gerenciar produtos</a>
              </div>
            </article>

            <article class="channel-card">
              <span class="channel-kicker">Delivery próprio</span>
              <h2>Pedido para entrega</h2>
              <p>Confira o fluxo público de delivery já disponível para este restaurante.</p>

              <div class="url-box">
                <span>{{ deliveryAbsoluteUrl() }}</span>
                <button type="button" (click)="copyDeliveryLink()">
                  {{ copiedChannel() === 'delivery' ? 'Link copiado' : 'Copiar link' }}
                </button>
              </div>

              <div class="actions-row">
                <a class="secondary-action" [href]="deliveryUrl()" target="_blank" rel="noopener noreferrer">
                  Abrir delivery
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          </div>

          <div class="tip">
            <strong>Antes de divulgar:</strong>
            valide produtos, preços e disponibilidade em Cardápio e faça um pedido de teste pelos canais públicos.
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
    .channel-card { display: flex; flex-direction: column; min-height: 290px; padding: 1.5rem; border: 1px solid rgba(47, 52, 83, .12); border-radius: 18px; background: #fff; box-shadow: 0 10px 28px rgba(47, 52, 83, .06); }
    .channel-card--primary { border-top: 4px solid #D6A92F; }
    .channel-kicker { color: #374B89; font-size: .82rem; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
    h2 { margin: 1rem 0 .5rem; color: #2F3453; font-size: 1.25rem; }
    .channel-card p { margin: 0 0 1rem; color: #667085; line-height: 1.5; }
    .url-box { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: .75rem; margin: .25rem 0 1rem; padding: .7rem .8rem; border: 1px solid rgba(55, 75, 137, .14); border-radius: 10px; background: #F7F5EF; }
    .url-box span { min-width: 0; overflow: hidden; color: #475467; font-size: .82rem; text-overflow: ellipsis; white-space: nowrap; }
    .url-box button { min-height: 34px; padding: .4rem .65rem; border: 1px solid rgba(55, 75, 137, .24); border-radius: 8px; background: #fff; color: #374B89; font-weight: 700; cursor: pointer; }
    .url-box button:hover { border-color: #D6A92F; color: #2F3453; }
    .actions-row { display: flex; flex-wrap: wrap; gap: .65rem; margin-top: auto; }
    .primary-action, .secondary-action { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 46px; padding: .75rem 1rem; border-radius: 10px; font-weight: 800; text-decoration: none; }
    .primary-action { color: #fff; background: #374B89; }
    .primary-action:hover { background: #2F3453; }
    .secondary-action { color: #374B89; border: 1px solid rgba(55, 75, 137, .28); background: #F7F5EF; }
    .secondary-action:hover { border-color: #D6A92F; color: #2F3453; }
    .tip, .empty-state { margin-top: 1rem; padding: 1rem 1.15rem; border-radius: 12px; background: #F7F5EF; color: #475467; line-height: 1.5; }
    .tip strong { color: #2F3453; }
    @media (max-width: 720px) {
      .page { padding: 1rem; }
      .channel-grid { grid-template-columns: 1fr; }
      .channel-card { min-height: 250px; }
      .url-box { grid-template-columns: 1fr; }
      .url-box button { width: 100%; }
      .actions-row > * { flex: 1 1 100%; }
    }
  `],
})
export class CardapioOnlineComponent {
  private readonly api = inject(ApiService);
  private readonly user = signal<User | null>(null);

  readonly tenantId = computed(() => this.user()?.tenant_id ?? null);
  readonly copiedChannel = signal<'menu' | 'delivery' | null>(null);
  readonly publicMenuUrl = computed(() => `/public-menu/${this.tenantId()}`);
  readonly deliveryUrl = computed(() => `/delivery/${this.tenantId()}`);
  readonly publicMenuAbsoluteUrl = computed(() => this.absoluteUrl(this.publicMenuUrl()));
  readonly deliveryAbsoluteUrl = computed(() => this.absoluteUrl(this.deliveryUrl()));

  constructor() {
    this.api.user$.subscribe((user) => this.user.set(user));
  }

  async copyPublicMenuLink(): Promise<void> {
    await this.copyLink(this.publicMenuAbsoluteUrl(), 'menu');
  }

  async copyDeliveryLink(): Promise<void> {
    await this.copyLink(this.deliveryAbsoluteUrl(), 'delivery');
  }

  private absoluteUrl(path: string): string {
    if (typeof window === 'undefined') return path;
    return `${window.location.origin}${path}`;
  }

  private async copyLink(value: string, channel: 'menu' | 'delivery'): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      this.copiedChannel.set(channel);
      window.setTimeout(() => this.copiedChannel.set(null), 1800);
    } catch {
      this.copiedChannel.set(null);
    }
  }
}
