import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService, Order } from '../services/api.service';
import { AudioService } from '../services/audio.service';
import { PermissionService } from '../services/permission.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { pendingOrders, splitColumns, visibleOperationalOrders, type QueueLayout } from './order-management-queue';

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [SidebarComponent, RouterLink],
  template: `
    <app-sidebar [pendingOrders]="newOrders()">
      <section class="orders-page" [class.details-open]="selectedId() !== null">
        <div class="toolbar">
          <label class="order-search">
            <span class="sr-only">Pesquise por cliente ou número do pedido</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>
            <input type="search" placeholder="Pesquise por cliente ou número do pedido" [value]="query()" (input)="query.set($any($event.target).value)" />
          </label>
          @if (canUpdateStatus()) {
            <a class="action primary" routerLink="/staff/orders" [queryParams]="{create:'delivery'}" title="Criar pedido de entrega">+ NOVO PEDIDO</a>
          }
          <span class="toolbar-spacer"></span>
          <a class="action" routerLink="/staff/orders" [queryParams]="{view:'delivery'}">GESTÃO DE ENTREGAS</a>
          <details class="layout-chooser">
            <summary class="action">AJUSTAR LAYOUT</summary>
            <div class="layout-options" role="group" aria-label="Organização das filas">
              <button type="button" [class.chosen]="layout() === 'stage'" (click)="setLayout('stage')">Por etapa</button>
              <button type="button" [class.chosen]="layout() === 'recent'" (click)="setLayout('recent')">Mais recentes</button>
            </div>
          </details>
        </div>

        @if (errorMessage()) { <p class="error" role="alert">{{ errorMessage() }}</p> }
        <div class="workspace">
          <div class="queue-grid" aria-label="Filas de pedidos">
            <section class="queue" aria-label="Primeira coluna de pedidos">
              @for (order of firstColumn(); track order.id) {
                <button class="order-row" type="button" [class.selected]="selectedId() === order.id" (click)="select(order)">
                  <span class="row-top"><strong>Pedido #{{ order.id }}</strong><span class="status" [class.pending]="order.status === 'pending'">{{ statusLabel(order) }}</span></span>
                  <span class="row-name">{{ order.customer_name || order.table_name || 'Cliente não informado' }}</span>
                  <span class="row-bottom"><span>{{ channelLabel(order) }} · {{ formatTime(order.created_at) }}</span><strong>{{ formatMoney(order.total_cents) }}</strong></span>
                </button>
              } @empty { <p class="empty">{{ loading() ? 'Carregando pedidos…' : 'Seus pedidos aparecerão aqui' }}</p> }
            </section>
            <section class="queue" aria-label="Segunda coluna de pedidos">
              @for (order of secondColumn(); track order.id) {
                <button class="order-row" type="button" [class.selected]="selectedId() === order.id" (click)="select(order)">
                  <span class="row-top"><strong>Pedido #{{ order.id }}</strong><span class="status" [class.pending]="order.status === 'pending'">{{ statusLabel(order) }}</span></span>
                  <span class="row-name">{{ order.customer_name || order.table_name || 'Cliente não informado' }}</span>
                  <span class="row-bottom"><span>{{ channelLabel(order) }} · {{ formatTime(order.created_at) }}</span><strong>{{ formatMoney(order.total_cents) }}</strong></span>
                </button>
              } @empty { <p class="empty">{{ loading() ? 'Carregando pedidos…' : 'Seus pedidos aparecerão aqui' }}</p> }
            </section>
          </div>
          <aside class="order-detail" aria-label="Detalhes do pedido selecionado">
            @if (selectedOrder(); as order) {
              <header class="detail-heading"><button type="button" class="back" (click)="selectedId.set(null)" aria-label="Voltar aos pedidos">←</button><h2>Pedido #{{ order.id }}</h2><span class="status">{{ statusLabel(order) }}</span></header>
              <div class="detail-body">
                <p><strong>{{ order.customer_name || order.table_name || 'Cliente não informado' }}</strong> · {{ channelLabel(order) }}</p>
                <p>{{ formatTime(order.created_at) }}</p>
                @if (order.delivery_address) { <p>{{ order.delivery_address }}</p> }
                <h3>Itens</h3>
                @for (item of activeItems(order); track item.id) {
                  <div class="detail-item"><strong>{{ item.quantity }}× {{ item.product_name }}</strong><span>{{ formatMoney(item.price_cents * item.quantity) }}</span></div>
                  @if (item.customization_summary || item.line_modifiers_summary) { <p class="detail-customization">{{ item.customization_summary || item.line_modifiers_summary }}</p> }
                  @if (item.notes) { <p class="detail-customization">{{ item.notes }}</p> }
                }
                @if (displayNotes(order.notes)) { <p class="detail-note">Obs.: {{ displayNotes(order.notes) }}</p> }
                @if (order.payment_method) { <p>Pagamento: {{ order.payment_method }}</p> }
                <div class="detail-total"><span>Total</span><strong>{{ formatMoney(order.total_cents) }}</strong></div>
                <div class="detail-actions">
                  @if (order.status === 'pending') {
                    @if (canCancel() && canUpdateStatus()) { <button class="action reject" type="button" (click)="reject(order)" [disabled]="busyOrderId() === order.id">Recusar</button> }
                    @if (canUpdateStatus()) { <button class="action primary" type="button" (click)="accept(order)" [disabled]="busyOrderId() === order.id">Aceitar</button> }
                  } @else if (canUpdateStatus()) {
                    @if (order.status === 'preparing') { <button class="action primary" type="button" (click)="advance(order, 'ready')" [disabled]="busyOrderId() === order.id">Marcar como pronto</button> }
                    @if (order.status === 'ready') { <button class="action primary" type="button" (click)="advance(order, isDelivery(order) ? 'out_for_delivery' : 'completed')" [disabled]="busyOrderId() === order.id">{{ isDelivery(order) ? 'Saiu para entrega' : 'Pedido entregue' }}</button> }
                    @if (order.status === 'out_for_delivery' || order.status === 'partially_delivered') { <button class="action primary" type="button" (click)="advance(order, 'completed')" [disabled]="busyOrderId() === order.id">Finalizar pedido</button> }
                  }
                  <a class="detail-link" routerLink="/staff/orders" [queryParams]="{focusOrder:order.id}">Ver pedido completo</a>
                </div>
              </div>
            } @else {
              <div class="detail-empty"><svg width="45" height="45" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="m5 14 19 10 19-10-19-10zM5 14v21l19 10 19-10V14M24 24v21"/></svg><p>Nenhum pedido selecionado</p></div>
            }
          </aside>
        </div>

        @if (attentionOrder(); as pending) {
          <div class="attention-backdrop">
            <section class="attention-modal" role="alertdialog" aria-modal="true" aria-labelledby="incoming-title" aria-describedby="incoming-description">
              <span class="attention-label" id="incoming-title">NOVO PEDIDO</span>
              <div class="attention-heading"><strong>Pedido #{{ pending.id }}</strong><span>{{ formatTime(pending.created_at) }}</span></div>
              <p id="incoming-description">{{ pending.customer_name || pending.table_name || 'Cliente não informado' }} · {{ channelLabel(pending) }}</p>
              @if (pending.delivery_address) { <p>{{ pending.delivery_address }}</p> }
              <div class="attention-items">
                @for (item of activeItems(pending); track item.id) {
                  <div>{{ item.quantity }}× {{ item.product_name }}</div>
                  @if (item.customization_summary || item.line_modifiers_summary) { <small>{{ item.customization_summary || item.line_modifiers_summary }}</small> }
                }
              </div>
              <div class="detail-total"><span>Total</span><strong>{{ formatMoney(pending.total_cents) }}</strong></div>
              @if (errorMessage()) { <p class="error" role="alert">{{ errorMessage() }}</p> }
              <div class="attention-actions">
                @if (canCancel() && canUpdateStatus()) { <button class="action reject" type="button" (click)="reject(pending)" [disabled]="busyOrderId() === pending.id">RECUSAR</button> }
                @if (canUpdateStatus()) { <button class="action primary" type="button" (click)="accept(pending)" [disabled]="busyOrderId() === pending.id">ACEITAR</button> }
              </div>
              @if (!soundReady()) { <button class="sound-button" type="button" (click)="enableSound()">Ativar alertas sonoros</button> }
              @if (newOrders().length > 1) { <small class="pending-count">{{ newOrders().length - 1 }} pedido(s) aguardando atendimento</small> }
            </section>
          </div>
        }
      </section>
    </app-sidebar>
  `,
  styleUrl: './order-management.component.scss',
})
export class OrderManagementComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly audio = inject(AudioService);
  private readonly permissions = inject(PermissionService);
  private wsSub?: Subscription;
  private requestVersion = 0;

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly busyOrderId = signal<number | null>(null);
  readonly query = signal('');
  readonly selectedId = signal<number | null>(null);
  readonly soundReady = signal(false);
  readonly layout = signal<QueueLayout>('stage');
  readonly currencyCode = signal('BRL');
  readonly canUpdateStatus = computed(() => this.permissions.hasPermission(this.api.getCurrentUser(), 'order:update_status'));
  readonly canCancel = computed(() => this.permissions.hasPermission(this.api.getCurrentUser(), 'order:cancel'));
  readonly selectedOrder = computed(() => this.orders().find(o => o.id === this.selectedId()) ?? null);
  readonly newOrders = computed(() => pendingOrders(this.orders()));
  readonly attentionOrder = computed(() => this.canUpdateStatus() ? this.newOrders()[0] ?? null : null);
  readonly visibleOrders = computed(() => visibleOperationalOrders(this.orders(), this.query()));
  readonly columns = computed(() => splitColumns(this.visibleOrders(), this.layout()));
  readonly firstColumn = computed(() => this.columns()[0]);
  readonly secondColumn = computed(() => this.columns()[1]);

  ngOnInit(): void {
    this.restoreLayout();
    this.api.getTenantSettings().subscribe({ next: settings => this.currencyCode.set((settings.currency_code || 'BRL').toUpperCase()) });
    this.loadOrders();
    this.api.connectWebSocket();
    this.wsSub = this.api.orderUpdates$.subscribe(update => {
      if (update?.type === 'new_order' && this.soundReady()) this.audio.playRestaurantOrderChange();
      this.loadOrders(false);
    });
  }

  ngOnDestroy(): void { this.wsSub?.unsubscribe(); }

  loadOrders(showLoading = true): void {
    const version = ++this.requestVersion;
    if (showLoading) this.loading.set(true);
    this.api.getOrders().subscribe({
      next: orders => {
        if (version !== this.requestVersion) return;
        this.orders.set(orders);
        this.loading.set(false);
        this.errorMessage.set('');
      },
      error: () => {
        if (version !== this.requestVersion) return;
        this.loading.set(false);
        this.errorMessage.set('Não foi possível carregar os pedidos.');
      },
    });
  }

  select(order: Order): void { this.selectedId.set(order.id); }
  accept(order: Order): void { if (this.canUpdateStatus()) this.changeStatus(order, 'preparing', 'Não foi possível aceitar o pedido.'); }
  reject(order: Order): void { if (this.canCancel() && this.canUpdateStatus()) this.changeStatus(order, 'cancelled', 'Não foi possível recusar o pedido.'); }
  advance(order: Order, status: string): void { if (this.canUpdateStatus()) this.changeStatus(order, status, 'Não foi possível atualizar o pedido.'); }

  private changeStatus(order: Order, status: string, errorText: string): void {
    if (this.busyOrderId() != null) return;
    this.busyOrderId.set(order.id);
    this.errorMessage.set('');
    this.api.updateOrderStatus(order.id, status).subscribe({
      next: () => {
        this.orders.update(list => list.map(o => o.id === order.id ? { ...o, status } : o));
        this.busyOrderId.set(null);
        this.loadOrders(false);
        if (status !== 'cancelled' && this.soundReady()) this.audio.playRestaurantStatusChange();
      },
      error: () => { this.busyOrderId.set(null); this.errorMessage.set(errorText); this.loadOrders(false); },
    });
  }

  async enableSound(): Promise<void> {
    this.soundReady.set(await this.audio.enableFromGesture());
    if (!this.soundReady()) this.errorMessage.set('O navegador não liberou o som. Verifique a permissão de áudio.');
  }

  setLayout(value: QueueLayout): void {
    this.layout.set(value);
    try { localStorage.setItem(this.layoutKey(), value); } catch { /* Storage indisponível: preferência apenas nesta sessão. */ }
  }

  private restoreLayout(): void {
    try {
      const value = localStorage.getItem(this.layoutKey());
      if (value === 'stage' || value === 'recent') this.layout.set(value);
    } catch { /* Storage indisponível: usar organização padrão. */ }
  }

  private layoutKey(): string {
    const user = this.api.getCurrentUser();
    return `mds-food-order-layout:t${user?.tenant_id ?? 'none'}:u${user?.id ?? 'none'}`;
  }

  activeItems(order: Order) { return (order.items || []).filter(item => !item.removed_by_customer && item.status !== 'cancelled'); }
  displayNotes(notes?: string | null): string { return (notes || '').split('\n').filter(line => !/^\[PAID:/i.test(line.trim())).join('\n').trim(); }
  isDelivery(order: Order): boolean { return order.order_channel === 'satisfecho_delivery' || order.order_channel === 'marketplace' || !!order.delivery_integration_id || !!order.delivery_address; }
  channelLabel(order: Order): string {
    if (order.order_channel === 'marketplace' || order.delivery_integration_id) return 'Marketplace';
    if (order.order_channel === 'satisfecho_delivery' || order.delivery_address) return 'Entrega';
    if (order.table_id != null) return 'Local';
    return 'Retirada / cardápio';
  }
  statusLabel(order: Order): string {
    switch (order.status) {
      case 'pending': return 'Novo';
      case 'preparing': return 'Em preparação';
      case 'ready': return 'Pronto';
      case 'out_for_delivery': return 'Em entrega';
      case 'partially_delivered': return 'Entrega parcial';
      default: return order.status;
    }
  }
  formatMoney(cents: number): string {
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: this.currencyCode() }).format((Number(cents) || 0) / 100); }
    catch { return `R$ ${((Number(cents) || 0) / 100).toFixed(2).replace('.', ',')}`; }
  }
  formatTime(value: string): string {
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value || '');
    const date = new Date(hasTimezone ? value : `${value}Z`);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
}
