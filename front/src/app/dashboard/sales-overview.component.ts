import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, SalesReport } from '../services/api.service';

/** Compact operational view of the existing tenant-scoped sales report. */
@Component({
  selector: 'app-sales-overview',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="overview" aria-label="Análise das vendas">
      <div class="overview-head"><h2>Análise das vendas</h2><a routerLink="/reports">Relatório completo →</a></div>
      <form class="filters" (ngSubmit)="load()">
        <label>De <input type="date" name="from" [(ngModel)]="from" [max]="to" required></label>
        <label>Até <input type="date" name="to" [(ngModel)]="to" [min]="from" required></label>
        <button type="submit" [disabled]="loading() || !from || !to || from > to">{{ loading() ? 'Carregando…' : 'Aplicar filtro' }}</button>
      </form>
      @if (error()) { <p role="alert" class="error">{{ error() }}</p> }
      @if (report(); as data) {
        <div class="kpis">
          <div><span>Faturamento</span><strong>{{ money(data.summary.total_revenue_cents) }}</strong></div>
          <div><span>Pedidos</span><strong>{{ data.summary.total_orders }}</strong></div>
          <div><span>Ticket médio</span><strong>{{ money(data.summary.average_revenue_per_order_cents) }}</strong></div>
        </div>
        <div class="chart">
          <h3>Faturamento por dia</h3>
          @if (data.summary.daily?.length) {
            <div class="bars" role="img" aria-label="Faturamento diário no período selecionado">
              @for (day of data.summary.daily; track day.date) {
                <div class="bar-column" [title]="day.date + ': ' + money(day.revenue_cents)">
                  <div class="bar" [style.height.%]="barHeight(day.revenue_cents, data.summary.daily)"></div>
                  <small>{{ shortDate(day.date) }}</small>
                </div>
              }
            </div>
          } @else { <p class="empty">Sem vendas registradas neste período.</p> }
        </div>
      }
    </section>
  `,
  styles: [`
    .overview{color:#2F3453;margin-bottom:16px}.overview-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px}.overview-head h2{font-size:1.12rem;margin:0}.overview-head a{color:#374B89;font-size:.8rem;font-weight:700;text-decoration:none}
    .filters{display:flex;gap:10px;align-items:end;flex-wrap:wrap;padding:11px;background:#fff;border:1px solid #e0e2e9;border-radius:8px;margin-bottom:12px}.filters label{display:grid;gap:3px;color:#626a80;font-size:.72rem;font-weight:700}.filters input,.filters button{height:34px;box-sizing:border-box;border:1px solid #d7dae4;border-radius:5px;padding:5px 9px;font:inherit}.filters button{background:#374B89;color:#fff;cursor:pointer}.filters button:disabled{opacity:.55}
    .kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));background:#fff;border:1px solid #e0e2e9;border-radius:8px 8px 0 0}.kpis>div{display:grid;gap:5px;padding:14px;border-right:1px solid #e0e2e9}.kpis>div:last-child{border:0}.kpis span{font-size:.76rem;color:#697187}.kpis strong{font-size:1.2rem}.chart{background:#fff;border:1px solid #e0e2e9;border-top:0;border-radius:0 0 8px 8px;padding:14px}.chart h3{margin:0 0 12px;font-size:.85rem}.bars{display:flex;align-items:end;gap:4px;height:150px;overflow-x:auto;border-bottom:1px solid #e0e2e9}.bar-column{height:100%;min-width:28px;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:end}.bar{width:60%;min-height:2px;background:#374B89;border-radius:3px 3px 0 0}.bar-column small{font-size:.59rem;color:#697187;white-space:nowrap;margin:4px 0}.empty{color:#697187;font-size:.85rem;margin:20px 0}.error{color:#aa3127;font-size:.85rem}
    @media(max-width:600px){.kpis strong{font-size:1rem}.kpis>div{padding:9px}.filters label{flex:1}.filters input{width:100%}}
  `],
})
export class SalesOverviewComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly report = signal<SalesReport | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  from = '';
  to = '';
  currency = 'BRL';

  ngOnInit(): void {
    const now = new Date();
    this.to = this.localDate(now);
    now.setDate(now.getDate() - 6);
    this.from = this.localDate(now);
    this.api.getTenantSettings().subscribe({ next: s => this.currency = s.currency_code || 'BRL' });
    this.load();
  }
  load(): void {
    if (!this.from || !this.to || this.from > this.to) return;
    this.loading.set(true);
    this.error.set('');
    this.api.getSalesReports(this.from, this.to).subscribe({
      next: data => { this.report.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set('Não foi possível carregar as vendas.'); },
    });
  }
  money(cents: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: this.currency }).format((Number(cents) || 0) / 100); }
  barHeight(value: number, daily: { revenue_cents: number }[]): number { return Math.max(1, ((value || 0) / Math.max(1, ...daily.map(d => d.revenue_cents))) * 88); }
  shortDate(date: string): string { return date.slice(5).split('-').reverse().join('/'); }
  private localDate(date: Date): string { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'); }
}
