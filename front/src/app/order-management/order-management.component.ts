import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService, Order } from '../services/api.service';
import { AudioService } from '../services/audio.service';
import { PermissionService } from '../services/permission.service';
import { SidebarComponent } from '../shared/sidebar.component';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [SidebarComponent],
  template: `
    <app-sidebar>
      <section class="orders-page">
        <header class="page-header">
          <div>
            <span class="eyebrow">Operação</span>
            <h1>Gestão de pedidos</h1>
            <p>Receba, aceite e acompanhe os pedidos do cardápio em tempo real.</p>
          </div>
          <div class="header-actions">
            <a class="btn btn-secondary" href="/staff/orders">Visão detalhada</a>
            <button class="btn btn-primary" type="button" (click)="loadOrders()" [disabled]="loading()">
              {{ loading() ? 'Atualizando…' : 'Atualizar' }}
            </button>
          </div>
        </header>

        <div class="flow-strip" aria-label="Fluxo dos pedidos">
          <div class="flow-step" [class.has-items]="newOrders().length > 0"><strong>{{ newOrders().length }}</strong><span>Novos</span></div>
          <span class="flow-arrow">→</span>
          <div class="flow-step" [class.has-items]="preparingOrders().length > 0"><strong>{{ preparingOrders().length }}</strong><span>Em preparação</span></div>
          <span class="flow-arrow">→</span>
          <div class="flow-step" [class.has-items]="readyOrders().length > 0"><strong>{{ readyOrders().length }}</strong><span>Prontos</span></div>
          <span class="flow-arrow">→</span>
          <div class="flow-step" [class.has-items]="deliveryOrders().length > 0"><strong>{{ deliveryOrders().length }}</strong><span>Entrega</span></div>
          <span class="flow-arrow">→</span>
          <div class="flow-step"><strong>{{ completedToday().length }}</strong><span>Finalizados</span></div>
        </div>

        @if (errorMessage()) { <div class="alert error" role="alert">{{ errorMessage() }}</div> }

        @if (loading() && orders().length === 0) {
          <div class="empty-state">Carregando pedidos…</div>
        } @else {
          <div class="board">
            <section class="lane lane-new">
              <div class="lane-header"><div><span class="lane-dot"></span><h2>Novos</h2></div><span class="lane-count">{{ newOrders().length }}</span></div>
              <div class="lane-body">
                @for (order of newOrders(); track order.id) {
                  <article class="order-card new-order-card">
                    <div class="card-top"><div><span class="order-number">#{{ order.id }}</span><span class="channel">{{ channelLabel(order) }}</span></div><span class="order-age">{{ formatTime(order.created_at) }}</span></div>
                    <h3>{{ order.customer_name || order.table_name || 'Pedido' }}</h3>
                    @if (order.delivery_address) { <p class="meta">{{ order.delivery_address }}</p> }
                    <div class="items">
                      @for (item of activeItems(order); track item.id) { <div class="item"><span>{{ item.quantity }}× {{ item.product_name }}</span><span>{{ formatMoney(item.price_cents * item.quantity) }}</span></div> }
                    </div>
                    @if (displayNotes(order.notes)) { <p class="notes">Obs.: {{ displayNotes(order.notes) }}</p> }
                    <div class="card-total"><span>Total</span><strong>{{ formatMoney(order.total_cents) }}</strong></div>
                    <div class="card-actions two">
                      @if (canCancel()) { <button class="btn btn-reject" type="button" (click)="reject(order)" [disabled]="busyOrderId() === order.id">Recusar</button> }
                      @if (canUpdateStatus()) { <button class="btn btn-accept" type="button" (click)="accept(order)" [disabled]="busyOrderId() === order.id">Aceitar pedido</button> }
                    </div>
                  </article>
                } @empty { <div class="lane-empty">Nenhum pedido aguardando aceite.</div> }
              </div>
            </section>

            <section class="lane">
              <div class="lane-header"><div><span class="lane-dot preparing"></span><h2>Em preparação</h2></div><span class="lane-count">{{ preparingOrders().length }}</span></div>
              <div class="lane-body">
                @for (order of preparingOrders(); track order.id) {
                  <article class="order-card">
                    <div class="card-top"><div><span class="order-number">#{{ order.id }}</span><span class="channel">{{ channelLabel(order) }}</span></div><span class="order-age">{{ formatTime(order.created_at) }}</span></div>
                    <h3>{{ order.customer_name || order.table_name || 'Pedido' }}</h3>
                    <div class="items">@for (item of activeItems(order); track item.id) { <div class="item"><span>{{ item.quantity }}× {{ item.product_name }}</span></div> }</div>
                    <div class="card-total"><span>Total</span><strong>{{ formatMoney(order.total_cents) }}</strong></div>
                    @if (canUpdateStatus()) { <button class="btn btn-primary full" type="button" (click)="advance(order, 'ready')" [disabled]="busyOrderId() === order.id">Marcar como pronto</button> }
                  </article>
                } @empty { <div class="lane-empty">Fila de preparação vazia.</div> }
              </div>
            </section>

            <section class="lane">
              <div class="lane-header"><div><span class="lane-dot ready"></span><h2>Prontos</h2></div><span class="lane-count">{{ readyOrders().length }}</span></div>
              <div class="lane-body">
                @for (order of readyOrders(); track order.id) {
                  <article class="order-card">
                    <div class="card-top"><div><span class="order-number">#{{ order.id }}</span><span class="channel">{{ channelLabel(order) }}</span></div><span class="order-age">{{ formatTime(order.created_at) }}</span></div>
                    <h3>{{ order.customer_name || order.table_name || 'Pedido' }}</h3>
                    <div class="items">@for (item of activeItems(order); track item.id) { <div class="item"><span>{{ item.quantity }}× {{ item.product_name }}</span></div> }</div>
                    <div class="card-total"><span>Total</span><strong>{{ formatMoney(order.total_cents) }}</strong></div>
                    @if (canUpdateStatus()) {
                      @if (isDelivery(order)) { <button class="btn btn-primary full" type="button" (click)="advance(order, 'out_for_delivery')" [disabled]="busyOrderId() === order.id">Saiu para entrega</button> }
                      @else { <button class="btn btn-primary full" type="button" (click)="advance(order, 'completed')" [disabled]="busyOrderId() === order.id">Pedido entregue</button> }
                    }
                  </article>
                } @empty { <div class="lane-empty">Nenhum pedido pronto.</div> }
              </div>
            </section>

            <section class="lane">
              <div class="lane-header"><div><span class="lane-dot delivery"></span><h2>Entrega</h2></div><span class="lane-count">{{ deliveryOrders().length }}</span></div>
              <div class="lane-body">
                @for (order of deliveryOrders(); track order.id) {
                  <article class="order-card">
                    <div class="card-top"><div><span class="order-number">#{{ order.id }}</span><span class="channel">{{ channelLabel(order) }}</span></div><span class="order-age">{{ formatTime(order.created_at) }}</span></div>
                    <h3>{{ order.customer_name || order.table_name || 'Pedido' }}</h3>
                    @if (order.delivery_address) { <p class="meta">{{ order.delivery_address }}</p> }
                    <div class="card-total"><span>Total</span><strong>{{ formatMoney(order.total_cents) }}</strong></div>
                    @if (canUpdateStatus()) { <button class="btn btn-primary full" type="button" (click)="advance(order, 'completed')" [disabled]="busyOrderId() === order.id">Finalizar pedido</button> }
                  </article>
                } @empty { <div class="lane-empty">Nenhum pedido em entrega.</div> }
              </div>
            </section>
          </div>
        }

        <section class="finished-section">
          <div class="finished-header"><div><span class="eyebrow">Hoje</span><h2>Finalizados</h2></div><a href="/staff/orders?view=history">Ver histórico completo</a></div>
          @if (completedToday().length > 0) {
            <div class="finished-list">
              @for (order of completedToday().slice(0, 8); track order.id) {
                <div class="finished-row"><span>#{{ order.id }}</span><strong>{{ order.customer_name || order.table_name || 'Pedido' }}</strong><span>{{ formatTime(order.created_at) }}</span><span>{{ formatMoney(order.total_cents) }}</span></div>
              }
            </div>
          } @else { <div class="lane-empty">Ainda não há pedidos finalizados hoje.</div> }
        </section>

        @if (latestPending(); as pending) {
          <aside class="incoming-dock" role="alert" aria-live="assertive">
            <div class="incoming-pulse" aria-hidden="true"></div>
            <div class="incoming-main">
              <span class="incoming-label">Novo pedido recebido</span>
              <strong>#{{ pending.id }} · {{ pending.customer_name || pending.table_name || channelLabel(pending) }}</strong>
              <span>{{ itemCount(pending) }} item(ns) · {{ formatMoney(pending.total_cents) }} · {{ formatTime(pending.created_at) }}</span>
            </div>
            <div class="incoming-actions">
              @if (canCancel()) { <button class="btn btn-reject" type="button" (click)="reject(pending)" [disabled]="busyOrderId() === pending.id">Recusar</button> }
              @if (canUpdateStatus()) { <button class="btn btn-accept" type="button" (click)="accept(pending)" [disabled]="busyOrderId() === pending.id">Aceitar pedido</button> }
            </div>
          </aside>
        }
      </section>
    </app-sidebar>
  `,
  styles: [`
    .orders-page{padding-bottom:110px}.page-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;margin-bottom:22px}.eyebrow{color:#D6A92F;text-transform:uppercase;letter-spacing:.08em;font-size:.72rem;font-weight:800}h1{margin:4px 0 6px;color:#2F3453;font-size:1.75rem}.page-header p{margin:0;color:#6F7895}.header-actions{display:flex;gap:10px;flex-wrap:wrap}.btn{border:0;border-radius:9px;padding:10px 14px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;transition:.15s ease}.btn:disabled{opacity:.55;cursor:not-allowed}.btn-primary{background:#374B89;color:#fff}.btn-primary:hover:not(:disabled){background:#2F3453}.btn-secondary{background:#fff;color:#374B89;border:1px solid rgba(47,52,83,.18)}.btn-accept{background:#15803d;color:#fff}.btn-reject{background:#fff;color:#b42318;border:1px solid rgba(180,35,24,.25)}.full{width:100%}.flow-strip{display:flex;align-items:center;gap:10px;overflow-x:auto;padding:12px 14px;margin-bottom:18px;border:1px solid rgba(47,52,83,.10);border-radius:13px;background:#fff}.flow-step{display:flex;align-items:center;gap:7px;min-width:max-content;color:#6F7895}.flow-step strong{display:grid;place-items:center;min-width:28px;height:28px;padding:0 7px;border-radius:999px;background:#F1F2F7;color:#2F3453}.flow-step.has-items strong{background:rgba(214,169,47,.18);color:#80620e}.flow-arrow{color:#B0B5C5}.board{display:grid;grid-template-columns:repeat(4,minmax(245px,1fr));gap:14px;align-items:start}.lane{min-width:0;background:#F7F5EF;border:1px solid rgba(47,52,83,.10);border-radius:14px;overflow:hidden}.lane-new{border-color:rgba(214,169,47,.42)}.lane-header{display:flex;align-items:center;justify-content:space-between;padding:14px;background:#fff;border-bottom:1px solid rgba(47,52,83,.08)}.lane-header>div{display:flex;align-items:center;gap:8px}.lane-header h2{margin:0;font-size:.95rem;color:#2F3453}.lane-dot{width:9px;height:9px;border-radius:50%;background:#D6A92F}.lane-dot.preparing{background:#374B89}.lane-dot.ready{background:#15803d}.lane-dot.delivery{background:#7c3aed}.lane-count{min-width:25px;height:25px;display:grid;place-items:center;border-radius:999px;background:#F1F2F7;color:#2F3453;font-size:.75rem;font-weight:800}.lane-body{display:flex;flex-direction:column;gap:10px;padding:10px;max-height:68vh;overflow-y:auto}.order-card{background:#fff;border:1px solid rgba(47,52,83,.10);border-radius:12px;padding:13px;box-shadow:0 4px 12px rgba(47,52,83,.04)}.new-order-card{border-left:4px solid #D6A92F}.card-top{display:flex;justify-content:space-between;gap:10px;margin-bottom:8px}.card-top>div{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.order-number{font-weight:900;color:#2F3453}.channel{padding:3px 7px;border-radius:999px;background:#F1F2F7;color:#5f6885;font-size:.68rem;font-weight:700}.order-age{color:#7C849B;font-size:.72rem;white-space:nowrap}.order-card h3{margin:0 0 7px;color:#2F3453;font-size:.98rem}.meta,.notes{margin:6px 0;font-size:.77rem;color:#6F7895;line-height:1.4}.notes{padding:7px 8px;border-radius:7px;background:#FFF9E8;color:#7a5d0b}.items{margin:10px 0;padding:8px 0;border-top:1px solid #ECEEF4;border-bottom:1px solid #ECEEF4}.item{display:flex;justify-content:space-between;gap:8px;padding:3px 0;color:#434A61;font-size:.76rem}.card-total{display:flex;justify-content:space-between;color:#2F3453;font-size:.85rem;margin-bottom:10px}.card-actions{display:grid;gap:8px}.card-actions.two{grid-template-columns:1fr 1.35fr}.lane-empty,.empty-state{padding:24px 12px;text-align:center;color:#8A91A5;font-size:.82rem}.alert.error{margin:0 0 14px;padding:10px 12px;border-radius:9px;background:#fff1f0;color:#b42318;border:1px solid #ffd5d2}.finished-section{margin-top:20px;padding:16px;border:1px solid rgba(47,52,83,.10);border-radius:14px;background:#fff}.finished-header{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:10px}.finished-header h2{margin:2px 0 0;color:#2F3453;font-size:1.1rem}.finished-header a{color:#374B89;text-decoration:none;font-weight:700;font-size:.8rem}.finished-list{display:grid;gap:2px}.finished-row{display:grid;grid-template-columns:70px 1fr 120px 110px;gap:10px;padding:9px 8px;border-top:1px solid #EEF0F5;align-items:center;font-size:.78rem;color:#606980}.finished-row strong{color:#2F3453}.incoming-dock{position:fixed;left:calc(var(--sidebar-width,240px) + 22px);right:22px;bottom:18px;z-index:850;display:flex;align-items:center;gap:14px;padding:14px 16px;border:2px solid #D6A92F;border-radius:14px;background:#fff;box-shadow:0 15px 40px rgba(47,52,83,.22)}.incoming-pulse{width:13px;height:13px;border-radius:50%;background:#D6A92F;box-shadow:0 0 0 0 rgba(214,169,47,.45);animation:pulse 1.35s infinite;flex:0 0 auto}.incoming-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.incoming-label{color:#8a680d;font-size:.7rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em}.incoming-main strong{color:#2F3453}.incoming-main>span:last-child{color:#6F7895;font-size:.76rem}.incoming-actions{display:flex;gap:8px;flex-wrap:wrap}@keyframes pulse{70%{box-shadow:0 0 0 11px rgba(214,169,47,0)}100%{box-shadow:0 0 0 0 rgba(214,169,47,0)}}@media(max-width:1200px){.board{grid-template-columns:repeat(2,minmax(260px,1fr))}}@media(max-width:768px){.page-header{align-items:flex-start;flex-direction:column}.board{grid-template-columns:1fr}.lane-body{max-height:none}.incoming-dock{left:12px;right:12px;bottom:12px;align-items:flex-start;flex-wrap:wrap}.incoming-main{min-width:220px}.incoming-actions{width:100%;display:grid;grid-template-columns:1fr 1.3fr}.finished-row{grid-template-columns:55px 1fr}.finished-row span:nth-child(3),.finished-row span:nth-child(4){display:none}}
  `]
})
export class OrderManagementComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private audio = inject(AudioService);
  private permissions = inject(PermissionService);
  private wsSub?: Subscription;
  private alertTimer?: ReturnType<typeof setInterval>;

  orders = signal<Order[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  busyOrderId = signal<number | null>(null);
  currencyCode = signal('BRL');

  canUpdateStatus = computed(() => this.permissions.hasPermission(this.api.getCurrentUser(), 'order:update_status'));
  canCancel = computed(() => this.permissions.hasPermission(this.api.getCurrentUser(), 'order:cancel'));
  newOrders = computed(() => this.orders().filter(o => o.status === 'pending').sort((a,b) => a.id - b.id));
  preparingOrders = computed(() => this.orders().filter(o => o.status === 'preparing').sort((a,b) => a.id - b.id));
  readyOrders = computed(() => this.orders().filter(o => o.status === 'ready').sort((a,b) => a.id - b.id));
  deliveryOrders = computed(() => this.orders().filter(o => o.status === 'out_for_delivery' || o.status === 'partially_delivered').sort((a,b) => a.id - b.id));
  completedToday = computed(() => this.orders().filter(o => (o.status === 'completed' || o.status === 'paid') && this.isToday(o.created_at)).sort((a,b) => b.id - a.id));
  latestPending = computed(() => this.newOrders().at(-1) ?? null);

  ngOnInit(): void {
    this.api.getTenantSettings().subscribe({ next: settings => this.currencyCode.set((settings.currency_code || 'BRL').toUpperCase()) });
    this.loadOrders();
    this.api.connectWebSocket();
    this.wsSub = this.api.orderUpdates$.subscribe(update => {
      if (update?.type === 'new_order') this.audio.playRestaurantOrderChange();
      this.loadOrders(false);
    });
    this.alertTimer = setInterval(() => { if (this.newOrders().length > 0) this.audio.playRestaurantOrderChange(); }, 6000);
  }

  ngOnDestroy(): void { this.wsSub?.unsubscribe(); if (this.alertTimer) clearInterval(this.alertTimer); }

  loadOrders(showLoading = true): void {
    if (showLoading) this.loading.set(true);
    this.errorMessage.set('');
    this.api.getOrders().subscribe({
      next: orders => { this.orders.set(orders); this.loading.set(false); },
      error: () => { this.loading.set(false); this.errorMessage.set('Não foi possível carregar os pedidos.'); }
    });
  }

  accept(order: Order): void { this.changeStatus(order, 'preparing', 'Não foi possível aceitar o pedido.'); }
  reject(order: Order): void { this.changeStatus(order, 'cancelled', 'Não foi possível recusar o pedido.'); }
  advance(order: Order, status: string): void { this.changeStatus(order, status, 'Não foi possível atualizar o pedido.'); }

  private changeStatus(order: Order, status: string, errorText: string): void {
    this.busyOrderId.set(order.id);
    this.errorMessage.set('');
    this.api.updateOrderStatus(order.id, status).subscribe({
      next: () => {
        this.orders.update(list => list.map(o => o.id === order.id ? { ...o, status } : o));
        this.busyOrderId.set(null);
        if (status !== 'cancelled') this.audio.playRestaurantStatusChange();
      },
      error: () => { this.busyOrderId.set(null); this.errorMessage.set(errorText); }
    });
  }

  activeItems(order: Order) { return (order.items || []).filter(item => !item.removed_by_customer && item.status !== 'cancelled'); }
  itemCount(order: Order): number { return this.activeItems(order).reduce((sum,item) => sum + (item.quantity || 0), 0); }
  displayNotes(notes?: string | null): string { return (notes || '').split('\n').filter(line => !/^\[PAID:/i.test(line.trim())).join('\n').trim(); }

  isDelivery(order: Order): boolean { return order.order_channel === 'satisfecho_delivery' || order.order_channel === 'marketplace' || !!order.delivery_integration_id || !!order.delivery_address; }
  channelLabel(order: Order): string {
    if (order.order_channel === 'marketplace' || order.delivery_integration_id) return 'Marketplace';
    if (order.order_channel === 'satisfecho_delivery' || order.delivery_address) return 'Delivery';
    if (order.table_id != null) return 'Mesa / QR';
    return 'Cardápio';
  }

  formatMoney(cents: number): string {
    try { return new Intl.NumberFormat('pt-BR', { style:'currency', currency:this.currencyCode() }).format((Number(cents) || 0) / 100); }
    catch { return `R$ ${((Number(cents) || 0) / 100).toFixed(2).replace('.', ',')}`; }
  }

  formatTime(value: string): string {
    const date = this.parseBackendDate(value);
    if (Number.isNaN(date.getTime())) return '';
    const mins = Math.floor(Math.max(0, Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours} h`;
    return date.toLocaleDateString('pt-BR');
  }

  private isToday(value: string): boolean {
    const d = this.parseBackendDate(value);
    const now = new Date();
    return !Number.isNaN(d.getTime()) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }

  private parseBackendDate(value: string): Date {
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value || '');
    return new Date(hasTimezone ? value : `${value}Z`);
  }
}
