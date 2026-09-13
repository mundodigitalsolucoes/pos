import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../shared/sidebar.component';
import { OfflineCashSaleComponent } from '../orders/offline-cash-sale.component';

@Component({
  selector: 'app-caixa',
  standalone: true,
  imports: [SidebarComponent, OfflineCashSaleComponent, RouterLink],
  template: `
    <app-sidebar>
      <main class="cashier-page">
        <header class="page-header">
          <div>
            <p class="eyebrow">Operação de venda</p>
            <h1>Caixa / PDV</h1>
            <p class="subtitle">Registre vendas rápidas com dinheiro ou cartão pendente usando o fluxo operacional já existente.</p>
          </div>
          <a routerLink="/staff/orders" class="secondary-action">Ver pedidos</a>
        </header>

        <section class="cashier-shell">
          <app-offline-cash-sale />
        </section>

        <section class="cashier-note">
          <strong>Como funciona</strong>
          <p>A venda usa o catálogo em cache e a mesa de retirada configurada. Em caso de perda de conexão, o pedido fica na fila local e sincroniza quando a operação voltar a ficar online.</p>
        </section>
      </main>
    </app-sidebar>
  `,
  styles: [`
    .cashier-page { max-width: 1100px; margin: 0 auto; padding: 1.5rem; color: #2F3453; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.5rem; }
    .eyebrow { margin: 0 0 .35rem; color: #374B89; font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(1.8rem, 4vw, 2.35rem); }
    .subtitle { max-width: 700px; margin: .5rem 0 0; color: #6F7895; line-height: 1.55; }
    .secondary-action { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: .7rem 1rem; border: 1px solid #374B89; border-radius: 10px; color: #374B89; background: #fff; font-weight: 800; text-decoration: none; }
    .cashier-shell { padding: 1rem; border: 1px solid rgba(47, 52, 83, .13); border-top: 4px solid #D6A92F; border-radius: 16px; background: #fff; box-shadow: 0 8px 24px rgba(47, 52, 83, .05); }
    .cashier-shell app-offline-cash-sale { display: block; }
    .cashier-note { margin-top: 1rem; padding: 1rem 1.15rem; border-radius: 14px; background: #F7F5EF; border: 1px solid rgba(47, 52, 83, .1); }
    .cashier-note p { margin: .4rem 0 0; color: #6F7895; line-height: 1.55; }
    @media (max-width: 640px) {
      .cashier-page { padding: 1rem; }
      .page-header { flex-direction: column; }
      .secondary-action { width: 100%; box-sizing: border-box; }
    }
  `]
})
export class CaixaComponent {}
