import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConnectivityService } from '../services/connectivity.service';
import {
  OfflineOrderQueueService,
  OfflinePaymentIntent,
} from '../services/offline-order-queue.service';
import { PermissionService } from '../services/permission.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-offline-cash-sale',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="offline-cash" [class.offline-cash--warn]="!connectivity.isOnline()">
      <div class="offline-cash-head">
        <h2>Venda rápida</h2>
        <span
          class="offline-status"
          [class.offline-status--ok]="connectivity.isOnline()"
          [class.offline-status--bad]="!connectivity.isOnline()"
          role="status"
        >
          @if (connectivity.status() === 'online') {
            Online
          } @else if (connectivity.status() === 'degraded') {
            Servidor indisponível
          } @else {
            Offline
          }
        </span>
        @if (queue.pendingCount() > 0) {
          <span class="offline-pending">{{ queue.pendingCount() }} aguardando sincronização</span>
        }
      </div>

      <p class="offline-cash-hint">
        Registre uma venda de retirada mesmo sem internet. Quando a conexão voltar, o pedido será sincronizado automaticamente.
      </p>
      <p class="offline-cash-hint offline-cash-hint--secondary">
        Para cartão offline, o sistema registra a intenção de pagamento. A cobrança deve ser concluída no terminal quando o pedido sincronizar.
      </p>

      @if (!hasTakeAway()) {
        <p class="offline-cash-error">
          A mesa de retirada ainda não está disponível no cache. Conecte-se à internet e atualize os dados ou crie uma mesa “Retirada”.
        </p>
      } @else if (cacheProducts().length === 0) {
        <p class="offline-cash-error">Nenhum produto disponível no cache. Conecte-se e atualize os produtos.</p>
        @if (connectivity.isOnline()) {
          <button type="button" class="btn btn-secondary btn-sm" (click)="refreshCache()">
            Atualizar produtos
          </button>
        }
      } @else {
        <div class="offline-cash-form">
          <label>
            <span>Produto</span>
            <select [(ngModel)]="productId">
              <option [ngValue]="null">Selecione um produto</option>
              @for (p of cacheProducts(); track p.id) {
                <option [ngValue]="p.id">{{ p.name }} ({{ formatPrice(p.price_cents) }})</option>
              }
            </select>
          </label>
          <label>
            <span>Qtd.</span>
            <input type="number" min="1" max="99" [(ngModel)]="quantity" />
          </label>
          <label>
            <span>Cliente</span>
            <input type="text" [(ngModel)]="customerName" placeholder="Nome do cliente (opcional)" />
          </label>
          <label>
            <span>Pagamento</span>
            <select [(ngModel)]="paymentIntent">
              <option value="cash">Dinheiro</option>
              <option value="card">Cartão — cobrar após sincronizar</option>
            </select>
          </label>
          <button
            type="button"
            class="btn btn-primary"
            [disabled]="!canSubmit() || submitting()"
            (click)="submit()"
          >
            {{ submitLabel() }}
          </button>
        </div>
      }

      @if (messageKey()) {
        <p class="offline-cash-msg" role="status">{{ messageText(messageKey()!) }}</p>
      }

      @if (recent().length > 0) {
        <ul class="offline-queue-list">
          @for (q of recent(); track q.idempotency_key) {
            <li [class]="'st-' + q.status">
              {{ q.product_names?.join(', ') || 'Pedido' }} ×{{ q.items[0]?.quantity || 1 }}
              · {{ q.payment_intent === 'card' ? 'Cartão' : 'Dinheiro' }}
              — {{ queueStatusLabel(q.status) }}
              @if (q.order_id) { (#{{ q.order_id }}) }
              @if (q.needs_payment) { — pagamento por cartão pendente }
              @if (q.error) { — {{ q.error }} }
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    .offline-cash {
      margin-bottom: 1rem;
      padding: 0.9rem 1rem;
      border: 1px solid rgba(47, 52, 83, .14);
      border-radius: 10px;
      background: var(--color-surface, #fff);
    }
    .offline-cash--warn {
      border-color: #d97706;
      background: #fffbeb;
    }
    .offline-cash-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 0.75rem;
    }
    .offline-cash-head h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #2F3453;
    }
    .offline-status {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
    }
    .offline-status--ok {
      background: #d1fae5;
      color: #065f46;
    }
    .offline-status--bad {
      background: #fee2e2;
      color: #991b1b;
    }
    .offline-pending {
      font-size: 0.75rem;
      color: #92400e;
    }
    .offline-cash-hint {
      margin: 0.4rem 0 0.3rem;
      font-size: 0.8125rem;
      color: var(--color-text-muted, #6b7280);
      line-height: 1.45;
    }
    .offline-cash-hint--secondary {
      margin-top: 0;
      margin-bottom: 0.8rem;
    }
    .offline-cash-error {
      color: #991b1b;
      font-size: 0.875rem;
      line-height: 1.45;
    }
    .offline-cash-form {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: flex-end;
    }
    .offline-cash-form label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: #2F3453;
      font-weight: 600;
    }
    .offline-cash-form select,
    .offline-cash-form input[type='text'],
    .offline-cash-form input[type='number'] {
      min-width: 8rem;
      padding: 0.45rem 0.6rem;
      border: 1px solid var(--color-border, #d1d5db);
      border-radius: 7px;
      background: #fff;
    }
    .offline-cash-msg {
      margin: 0.6rem 0 0;
      font-size: 0.875rem;
      color: #065f46;
    }
    .offline-queue-list {
      margin: 0.7rem 0 0;
      padding-left: 1.1rem;
      font-size: 0.75rem;
      color: #4b5563;
    }
    .offline-queue-list .st-failed {
      color: #991b1b;
    }
    .offline-queue-list .st-synced {
      color: #065f46;
    }
    .btn-sm {
      font-size: 0.8125rem;
      padding: 0.3rem 0.6rem;
    }
  `,
})
export class OfflineCashSaleComponent implements OnInit {
  readonly connectivity = inject(ConnectivityService);
  readonly queue = inject(OfflineOrderQueueService);
  private readonly permissions = inject(PermissionService);
  private readonly api = inject(ApiService);

  productId: number | null = null;
  quantity = 1;
  customerName = '';
  paymentIntent: OfflinePaymentIntent = 'cash';
  readonly submitting = signal(false);
  readonly messageKey = signal<string | null>(null);

  readonly cacheProducts = computed(() => this.queue.cache()?.products ?? []);
  readonly hasTakeAway = computed(() => !!this.queue.cache()?.take_away_table);
  readonly recent = computed(() => [...this.queue.queue()].slice(-8).reverse());

  ngOnInit(): void {
    if (!this.canUse()) return;
    this.queue.refreshCacheFromServer();
  }

  canUse(): boolean {
    const u = this.api.getCurrentUser();
    return (
      this.permissions.hasPermission(u, 'order:update_status') &&
      this.permissions.hasPermission(u, 'order:mark_paid')
    );
  }

  canSubmit(): boolean {
    return this.canUse() && this.productId != null && this.quantity >= 1 && this.hasTakeAway();
  }

  submitLabel(): string {
    const online = this.connectivity.isOnline();
    if (this.paymentIntent === 'card') {
      return online ? 'Registrar venda no cartão' : 'Salvar venda no cartão';
    }
    return online ? 'Registrar venda em dinheiro' : 'Salvar venda em dinheiro';
  }

  refreshCache(): void {
    this.queue.refreshCacheFromServer();
  }

  formatPrice(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  queueStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'aguardando sincronização',
      syncing: 'sincronizando',
      synced: 'sincronizado',
      failed: 'falha na sincronização',
    };
    return labels[status] ?? 'aguardando';
  }

  messageText(key: string): string {
    const messages: Record<string, string> = {
      'OFFLINE.ENQUEUE_FAILED': 'Não foi possível registrar a venda. Atualize os dados e tente novamente.',
      'OFFLINE.QUEUED_CARD_ONLINE': 'Venda registrada. O pagamento no cartão ficou pendente para cobrança.',
      'OFFLINE.QUEUED_CARD_OFFLINE': 'Venda salva offline. O pagamento no cartão deverá ser cobrado após a sincronização.',
      'OFFLINE.QUEUED_ONLINE': 'Venda registrada com sucesso.',
      'OFFLINE.QUEUED_OFFLINE': 'Venda salva offline e será sincronizada quando a conexão voltar.',
    };
    return messages[key] ?? 'Operação registrada.';
  }

  submit(): void {
    if (!this.canSubmit() || this.productId == null) return;
    this.submitting.set(true);
    this.messageKey.set(null);
    const item = this.queue.enqueueCashSale({
      productId: this.productId,
      quantity: this.quantity,
      customerName: this.customerName,
      paymentIntent: this.paymentIntent,
    });
    this.submitting.set(false);
    if (!item) {
      this.messageKey.set('OFFLINE.ENQUEUE_FAILED');
      return;
    }
    if (this.paymentIntent === 'card') {
      this.messageKey.set(
        this.connectivity.isOnline() ? 'OFFLINE.QUEUED_CARD_ONLINE' : 'OFFLINE.QUEUED_CARD_OFFLINE'
      );
    } else {
      this.messageKey.set(
        this.connectivity.isOnline() ? 'OFFLINE.QUEUED_ONLINE' : 'OFFLINE.QUEUED_OFFLINE'
      );
    }
    this.quantity = 1;
    this.customerName = '';
  }
}
