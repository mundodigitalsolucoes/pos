import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { LanguageService } from './services/language.service';
import { SeoService } from './services/seo.service';
import { ApiService } from './services/api.service';
import { PermissionService } from './services/permission.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('MDS Food');
  private router = inject(Router);
  private api = inject(ApiService);
  private permissions = inject(PermissionService);
  private routerSub?: Subscription;
  private userSub?: Subscription;
  private currentTenantId: number | null = null;
  private languageService = inject(LanguageService);
  private seo = inject(SeoService);

  ngOnInit() {
    this.seo.start();
    this.updateFavicon();
    this.ensureStaffShortcutStyles();

    this.userSub = this.api.user$.subscribe((user) => {
      this.currentTenantId = user?.tenant_id ?? null;
      this.scheduleStaffShortcuts();
    });

    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateFavicon();
        this.scheduleStaffShortcuts();
      });

    this.scheduleStaffShortcuts();
  }

  ngOnDestroy() {
    this.seo.stop();
    this.routerSub?.unsubscribe();
    this.userSub?.unsubscribe();
  }

  private updateFavicon() {
    this.setFavicon('/favicon.png');
  }

  private setFavicon(path: string) {
    const existingLinks = document.querySelectorAll('link[rel*="icon"]');
    existingLinks.forEach(link => link.remove());

    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = `${path}?v=6.0.0`;
    document.head.appendChild(link);

    const shortcutLink = document.createElement('link');
    shortcutLink.rel = 'shortcut icon';
    shortcutLink.type = 'image/png';
    shortcutLink.href = `${path}?v=6.0.0`;
    document.head.appendChild(shortcutLink);

    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = `${path}?v=6.0.0`;
    document.head.appendChild(appleLink);
  }

  private ensureStaffShortcutStyles(): void {
    if (document.getElementById('mds-public-menu-shortcut-styles')) return;

    const style = document.createElement('style');
    style.id = 'mds-public-menu-shortcut-styles';
    style.textContent = `
      #staff-sidebar-nav .mds-public-menu-link,
      #staff-sidebar-nav .mds-commercial-link {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 42px;
        padding: 10px 20px;
        color: #374B89;
        font-weight: 700;
        text-decoration: none;
        border-left: 3px solid transparent;
      }
      #staff-sidebar-nav .mds-public-menu-link:hover,
      #staff-sidebar-nav .mds-commercial-link:hover {
        background: rgba(55, 75, 137, .08);
        border-left-color: #D6A92F;
        color: #2F3453;
      }
      #staff-sidebar-nav .mds-public-menu-link svg,
      #staff-sidebar-nav .mds-commercial-link svg {
        flex: 0 0 auto;
      }
      #staff-sidebar-nav .mds-commercial-link {
        font-weight: 600;
      }
      .quick-actions .mds-public-menu-card {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        min-height: 160px;
        padding: 20px;
        border: 2px solid #D6A92F;
        border-radius: 14px;
        background: #fff;
        color: #2F3453;
        text-decoration: none;
        box-shadow: 0 8px 24px rgba(47, 52, 83, .08);
        transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
      }
      .quick-actions .mds-public-menu-card:hover {
        transform: translateY(-2px);
        border-color: #C19620;
        box-shadow: 0 12px 28px rgba(47, 52, 83, .13);
        text-decoration: none;
      }
      .quick-actions .mds-public-menu-icon {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        background: rgba(214, 169, 47, .15);
        color: #374B89;
      }
      .quick-actions .mds-public-menu-card .action-label {
        margin-top: 2px;
        color: #2F3453;
        font-weight: 800;
      }
      .quick-actions .mds-public-menu-card .action-desc {
        color: #6F7895;
        line-height: 1.45;
      }
      .mds-operational-summary {
        margin: 0 0 24px;
      }
      .mds-operational-summary-header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 12px;
      }
      .mds-operational-summary-title {
        margin: 0;
        color: #2F3453;
        font-size: 1.15rem;
        font-weight: 800;
      }
      .mds-operational-summary-caption {
        margin: 0;
        color: #6F7895;
        font-size: .82rem;
      }
      .mds-operational-summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      .mds-operational-kpi {
        display: flex;
        min-height: 112px;
        flex-direction: column;
        justify-content: space-between;
        gap: 10px;
        padding: 16px;
        border: 1px solid rgba(47, 52, 83, .14);
        border-radius: 14px;
        background: #fff;
        color: #2F3453;
        text-decoration: none;
        box-shadow: 0 6px 18px rgba(47, 52, 83, .05);
        transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease;
      }
      .mds-operational-kpi:hover {
        transform: translateY(-1px);
        border-color: #D6A92F;
        box-shadow: 0 9px 22px rgba(47, 52, 83, .09);
        text-decoration: none;
      }
      .mds-operational-kpi-label {
        color: #6F7895;
        font-size: .82rem;
        font-weight: 700;
      }
      .mds-operational-kpi-value {
        color: #2F3453;
        font-size: 1.65rem;
        line-height: 1;
        font-weight: 800;
      }
      .mds-operational-kpi[data-kpi="urgent"] .mds-operational-kpi-value {
        color: #C19620;
      }
      @media (max-width: 980px) {
        .mds-operational-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 560px) {
        .mds-operational-summary-header { align-items: flex-start; flex-direction: column; gap: 4px; }
        .mds-operational-summary-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  private scheduleStaffShortcuts(): void {
    window.setTimeout(() => this.ensureStaffShortcuts(), 0);
  }

  /**
   * Keep the public digital menu visible from the operational area.
   * Owner/admin use the internal commercial area; other staff keep the public preview shortcut.
   */
  private ensureStaffShortcuts(): void {
    const tenantId = this.currentTenantId;
    if (tenantId == null) return;

    const user = this.api.getCurrentUser();
    const isAdmin = this.permissions.isAdmin(user);
    const publicMenuHref = `/public-menu/${tenantId}`;
    const menuHref = isAdmin ? '/cardapio-online' : publicMenuHref;
    const nav = document.querySelector<HTMLElement>('#staff-sidebar-nav');
    if (nav && !nav.querySelector('[data-mds-public-menu-link]')) {
      const link = document.createElement('a');
      link.className = 'nav-link mds-public-menu-link';
      link.href = menuHref;
      if (!isAdmin) {
        link.target = '_blank';
        link.rel = 'noopener';
      }
      link.dataset['mdsPublicMenuLink'] = 'true';
      link.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M4 5h16v14H4z"/>
          <path d="M8 9h8M8 13h5"/>
          <path d="M7 2v3M17 2v3"/>
        </svg>
        <span>Cardápio Online</span>
      `;

      const homeLink = nav.querySelector<HTMLElement>('a.nav-link');
      if (homeLink?.nextSibling) {
        nav.insertBefore(link, homeLink.nextSibling);
      } else {
        nav.appendChild(link);
      }
    }

    if (nav && isAdmin && !nav.querySelector('[data-mds-commercial-links]')) {
      const links = [
        { href: '/fidelidade', label: 'Fidelidade', icon: '<path d="M12 21s-7-4.35-7-10a4 4 0 017-2.65A4 4 0 0119 11c0 5.65-7 10-7 10z"/>' },
        { href: '/promocoes', label: 'Cupons e promoções', icon: '<path d="M20 12l-8 8-8-8V4h8z"/><circle cx="9" cy="8" r="1"/>' },
        { href: '/integracoes', label: 'Integrações', icon: '<path d="M8 12h8M12 8v8"/><circle cx="12" cy="12" r="9"/>' },
      ];
      const fragment = document.createDocumentFragment();
      const marker = document.createElement('span');
      marker.hidden = true;
      marker.dataset['mdsCommercialLinks'] = 'true';
      fragment.appendChild(marker);

      for (const item of links) {
        const commercialLink = document.createElement('a');
        commercialLink.className = 'nav-link mds-commercial-link';
        commercialLink.href = item.href;
        commercialLink.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${item.icon}</svg>
          <span>${item.label}</span>
        `;
        fragment.appendChild(commercialLink);
      }

      const menuLink = nav.querySelector<HTMLElement>('[data-mds-public-menu-link]');
      if (menuLink?.nextSibling) {
        nav.insertBefore(fragment, menuLink.nextSibling);
      } else {
        nav.appendChild(fragment);
      }
    }

    if (this.router.url.split('?')[0] !== '/dashboard') return;

    const actions = document.querySelector<HTMLElement>('.quick-actions');
    if (!actions) return;

    this.ensureOperationalSummary(actions);

    if (actions.querySelector('[data-mds-public-menu-card]')) return;

    const card = document.createElement('a');
    card.className = 'action-card mds-public-menu-card';
    card.href = menuHref;
    if (!isAdmin) {
      card.target = '_blank';
      card.rel = 'noopener';
    }
    card.dataset['mdsPublicMenuCard'] = 'true';
    card.innerHTML = `
      <div class="action-icon mds-public-menu-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M4 5h16v14H4z"/>
          <path d="M8 9h8M8 13h5"/>
          <path d="M7 2v3M17 2v3"/>
        </svg>
      </div>
      <span class="action-label">Cardápio Online</span>
      <span class="action-desc">${isAdmin ? 'Gerencie e compartilhe os canais públicos do restaurante' : 'Visualize o cardápio público do seu restaurante'}</span>
    `;

    const insertBefore = actions.children.item(1);
    actions.insertBefore(card, insertBefore);
  }

  /**
   * Operational summary for the commercial dashboard.
   * Values come from existing tenant-scoped APIs; failed/unauthorized requests stay as an em dash.
   */
  private ensureOperationalSummary(actions: HTMLElement): void {
    const parent = actions.parentElement;
    if (!parent || parent.querySelector('[data-mds-operational-summary]')) return;

    const user = this.api.getCurrentUser();
    if (!user) return;

    const canViewTables = this.permissions.canAccessRoute(user, '/tables');
    const canViewReports = this.permissions.hasPermission(user, 'report:read');

    const section = document.createElement('section');
    section.className = 'mds-operational-summary';
    section.dataset['mdsOperationalSummary'] = 'true';
    section.setAttribute('aria-labelledby', 'mds-operational-summary-title');

    const tableCard = canViewTables
      ? `
        <a class="mds-operational-kpi" data-kpi="tables" href="/tables">
          <span class="mds-operational-kpi-label">Mesas em atendimento</span>
          <strong class="mds-operational-kpi-value" data-kpi-value="tables">…</strong>
        </a>`
      : '';
    const reportCards = canViewReports
      ? `
        <a class="mds-operational-kpi" data-kpi="sales" href="/reports">
          <span class="mds-operational-kpi-label">Vendas hoje</span>
          <strong class="mds-operational-kpi-value" data-kpi-value="sales">…</strong>
        </a>
        <a class="mds-operational-kpi" data-kpi="ticket" href="/reports">
          <span class="mds-operational-kpi-label">Ticket médio</span>
          <strong class="mds-operational-kpi-value" data-kpi-value="ticket">…</strong>
        </a>`
      : '';

    section.innerHTML = `
      <div class="mds-operational-summary-header">
        <h2 id="mds-operational-summary-title" class="mds-operational-summary-title">Operação agora</h2>
        <p class="mds-operational-summary-caption">Indicadores do restaurante atualizados com dados reais</p>
      </div>
      <div class="mds-operational-summary-grid">
        <a class="mds-operational-kpi" data-kpi="urgent" href="/staff/orders">
          <span class="mds-operational-kpi-label">Pedidos urgentes</span>
          <strong class="mds-operational-kpi-value" data-kpi-value="urgent">…</strong>
        </a>
        ${tableCard}
        ${reportCards}
      </div>
    `;

    parent.insertBefore(section, actions);

    this.api.getOrders().subscribe({
      next: (orders) => {
        const urgent = orders.filter((order) => order.staff_urgent === true).length;
        this.setOperationalKpi(section, 'urgent', String(urgent));
      },
      error: () => this.setOperationalKpi(section, 'urgent', '—'),
    });

    if (canViewTables) {
      this.api.getTablesWithStatus().subscribe({
        next: (tables) => {
          const activeStatuses = new Set(['occupied', 'open_order', 'ready_to_serve']);
          const active = tables.filter((table) =>
            table.operational_status != null && activeStatuses.has(table.operational_status)
          ).length;
          this.setOperationalKpi(section, 'tables', String(active));
        },
        error: () => this.setOperationalKpi(section, 'tables', '—'),
      });
    }

    if (canViewReports) {
      this.loadTodaySalesKpis(section);
    }
  }

  private loadTodaySalesKpis(section: HTMLElement): void {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const loadReport = (currencyLabel: string) => {
      this.api.getSalesReports(today, today).subscribe({
        next: (report) => {
          this.setOperationalKpi(
            section,
            'sales',
            this.formatOperationalMoney(report.summary?.total_revenue_cents, currencyLabel),
          );
          this.setOperationalKpi(
            section,
            'ticket',
            this.formatOperationalMoney(report.summary?.average_revenue_per_order_cents, currencyLabel),
          );
        },
        error: () => {
          this.setOperationalKpi(section, 'sales', '—');
          this.setOperationalKpi(section, 'ticket', '—');
        },
      });
    };

    this.api.getTenantSettings().subscribe({
      next: (settings) => loadReport((settings.currency || settings.currency_code || '').trim()),
      error: () => loadReport(''),
    });
  }

  private setOperationalKpi(section: HTMLElement, key: string, value: string): void {
    const element = section.querySelector<HTMLElement>(`[data-kpi-value="${key}"]`);
    if (element) element.textContent = value;
  }

  private formatOperationalMoney(value: unknown, currencyLabel: string): string {
    const cents = Number(value);
    if (!Number.isFinite(cents)) return '—';
    const amount = (cents / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return currencyLabel ? `${currencyLabel} ${amount}` : amount;
  }
}
