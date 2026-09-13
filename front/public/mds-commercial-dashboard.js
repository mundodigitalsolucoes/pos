(() => {
  const CARD_ATTR = 'data-mds-commercial-dashboard-card';
  const ORDER_MANAGEMENT_NAV_ATTR = 'data-mds-order-management-nav-link';
  const COMPANY_NAV_ATTR = 'data-mds-company-nav-link';
  const CASHIER_NAV_ATTR = 'data-mds-cashier-nav-link';
  const DELIVERY_NAV_ATTR = 'data-mds-delivery-nav-link';
  const HISTORY_NAV_ATTR = 'data-mds-order-history-nav-link';

  const commercialCards = [
    {
      href: '/gestao-pedidos',
      label: 'Gestão de pedidos',
      description: 'Receba, aceite e acompanhe pedidos em tempo real',
      icon: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8M8 17h5"/>'
    },
    {
      href: '/caixa',
      label: 'Caixa / PDV',
      description: 'Registre vendas rápidas em dinheiro ou cartão pendente',
      icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h4M15 13h2"/>'
    },
    {
      href: '/staff/orders?view=delivery',
      label: 'Delivery',
      description: 'Acompanhe e gerencie os pedidos de entrega em um só lugar',
      icon: '<path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>'
    },
    {
      href: '/staff/orders?view=history',
      label: 'Histórico de pedidos',
      description: 'Consulte pedidos concluídos, pagos e cancelados',
      icon: '<path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>'
    },
    {
      href: '/minha-empresa',
      label: 'Minha empresa',
      description: 'Confira os dados do estabelecimento usados na operação e nos canais públicos',
      icon: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h2M13 10h2M9 14h2M13 14h2"/>'
    },
    {
      href: '/fidelidade',
      label: 'Fidelidade',
      description: 'Configure pontos, benefícios e relacionamento com clientes',
      icon: '<path d="M12 21s-7-4.35-7-10a4 4 0 017-2.65A4 4 0 0119 11c0 5.65-7 10-7 10z"/>'
    },
    {
      href: '/promocoes',
      label: 'Cupons e promoções',
      description: 'Crie e gerencie campanhas promocionais do restaurante',
      icon: '<path d="M20 12l-8 8-8-8V4h8z"/><circle cx="9" cy="8" r="1"/>'
    },
    {
      href: '/integracoes',
      label: 'Integrações',
      description: 'Gerencie canais externos e integrações de delivery',
      icon: '<path d="M8 12h8M12 8v8"/><circle cx="12" cy="12" r="9"/>'
    }
  ];

  const ensureStyles = () => {
    if (document.getElementById('mds-commercial-dashboard-styles')) return;
    const style = document.createElement('style');
    style.id = 'mds-commercial-dashboard-styles';
    style.textContent = `
      #staff-sidebar-nav .mds-order-management-nav-link,
      #staff-sidebar-nav .mds-company-nav-link,
      #staff-sidebar-nav .mds-cashier-nav-link,
      #staff-sidebar-nav .mds-delivery-nav-link,
      #staff-sidebar-nav .mds-order-history-nav-link {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 42px;
        padding: 10px 20px;
        color: #374B89;
        font-weight: 600;
        text-decoration: none;
        border-left: 3px solid transparent;
      }
      #staff-sidebar-nav .mds-order-management-nav-link {
        font-weight: 800;
      }
      #staff-sidebar-nav .mds-order-management-nav-link:hover,
      #staff-sidebar-nav .mds-company-nav-link:hover,
      #staff-sidebar-nav .mds-cashier-nav-link:hover,
      #staff-sidebar-nav .mds-delivery-nav-link:hover,
      #staff-sidebar-nav .mds-order-history-nav-link:hover {
        background: rgba(55, 75, 137, .08);
        border-left-color: #D6A92F;
        color: #2F3453;
      }
      .quick-actions .mds-commercial-dashboard-card {
        border-top: 3px solid #374B89;
        box-shadow: 0 8px 20px rgba(47, 52, 83, .06);
      }
      .quick-actions .mds-commercial-dashboard-card .action-icon {
        background: rgba(55, 75, 137, .10);
        color: #374B89;
      }
      .quick-actions .mds-commercial-dashboard-card[href="/gestao-pedidos"] { order: 5; border-top-color: #D6A92F; }
      .quick-actions .mds-commercial-dashboard-card[href="/caixa"] { order: 80; }
      .quick-actions .mds-commercial-dashboard-card[href="/staff/orders?view=delivery"] { order: 90; }
      .quick-actions .mds-commercial-dashboard-card[href="/staff/orders?view=history"] { order: 160; }
      .quick-actions .mds-commercial-dashboard-card[href="/minha-empresa"] { order: 170; }
      .quick-actions .mds-commercial-dashboard-card[href="/fidelidade"] { order: 180; }
      .quick-actions .mds-commercial-dashboard-card[href="/promocoes"] { order: 190; }
      .quick-actions .mds-commercial-dashboard-card[href="/integracoes"] { order: 200; }
      .mds-operational-kpi[data-kpi="new-orders"] .mds-operational-kpi-value { color: #374B89; }
      .mds-operational-kpi[data-kpi="unavailable-products"] .mds-operational-kpi-value { color: #C19620; }
    `;
    document.head.appendChild(style);
  };

  const createNavLink = ({ className, href, attr, label, icon }) => {
    const link = document.createElement('a');
    link.className = `nav-link ${className}`;
    link.href = href;
    link.setAttribute(attr, 'true');
    link.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${icon}</svg>
      <span>${label}</span>
    `;
    return link;
  };

  const ensureOrderOperationalNav = () => {
    const nav = document.querySelector('#staff-sidebar-nav');
    if (!nav) return;
    const ordersLink = nav.querySelector('a[href="/staff/orders"]');
    if (!ordersLink) return;

    if (!nav.querySelector(`[${ORDER_MANAGEMENT_NAV_ATTR}]`)) {
      const managementLink = createNavLink({
        className: 'mds-order-management-nav-link',
        href: '/gestao-pedidos',
        attr: ORDER_MANAGEMENT_NAV_ATTR,
        label: 'Gestão de pedidos',
        icon: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8M8 17h5"/>'
      });
      const homeLink = nav.querySelector('a[href="/dashboard"]');
      if (homeLink) homeLink.insertAdjacentElement('afterend', managementLink);
      else nav.insertBefore(managementLink, nav.firstChild);
      ordersLink.style.display = 'none';
      ordersLink.setAttribute('aria-hidden', 'true');
    }

    if (!nav.querySelector(`[${DELIVERY_NAV_ATTR}]`)) {
      const deliveryLink = createNavLink({
        className: 'mds-delivery-nav-link',
        href: '/staff/orders?view=delivery',
        attr: DELIVERY_NAV_ATTR,
        label: 'Delivery',
        icon: '<path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>'
      });
      const managementLink = nav.querySelector(`[${ORDER_MANAGEMENT_NAV_ATTR}]`);
      (managementLink || ordersLink).insertAdjacentElement('afterend', deliveryLink);
    }

    if (!nav.querySelector(`[${HISTORY_NAV_ATTR}]`)) {
      const historyLink = createNavLink({
        className: 'mds-order-history-nav-link',
        href: '/staff/orders?view=history',
        attr: HISTORY_NAV_ATTR,
        label: 'Histórico de pedidos',
        icon: '<path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>'
      });
      const deliveryLink = nav.querySelector(`[${DELIVERY_NAV_ATTR}]`);
      (deliveryLink || ordersLink).insertAdjacentElement('afterend', historyLink);
    }
  };

  const ensureAdminExtraNav = (adminMarker) => {
    const nav = document.querySelector('#staff-sidebar-nav');
    if (!nav) return;

    if (!nav.querySelector(`[${CASHIER_NAV_ATTR}]`)) {
      const cashierLink = createNavLink({
        className: 'mds-cashier-nav-link', href: '/caixa', attr: CASHIER_NAV_ATTR, label: 'Caixa / PDV',
        icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h4M15 13h2"/>'
      });
      nav.insertBefore(cashierLink, adminMarker);
    }

    if (!nav.querySelector(`[${COMPANY_NAV_ATTR}]`)) {
      const companyLink = createNavLink({
        className: 'mds-company-nav-link', href: '/minha-empresa', attr: COMPANY_NAV_ATTR, label: 'Minha empresa',
        icon: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h2M13 10h2M9 14h2M13 14h2"/>'
      });
      nav.insertBefore(companyLink, adminMarker);
    }
  };

  const applyOrdersViewFromQuery = () => {
    if (window.location.pathname !== '/staff/orders') return;
    const view = new URLSearchParams(window.location.search).get('view');
    if (view !== 'history' && view !== 'delivery') return;
    const tabs = document.querySelectorAll('.filter-tabs .filter-tab');
    const index = view === 'history' ? 2 : 3;
    const tab = tabs.item(index);
    if (!(tab instanceof HTMLButtonElement)) return;
    tab.click();
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const apiUrl = (path) => {
    const base = String(window.__API_URL__ || '/api').replace(/\/$/, '');
    return `${base}${path}`;
  };

  const setKpiValue = (summary, key, value) => {
    const el = summary.querySelector(`[data-kpi-value="${key}"]`);
    if (el) el.textContent = value;
  };

  const ensureAdditionalOperationalKpis = () => {
    const summary = document.querySelector('[data-mds-operational-summary]');
    if (!summary || summary.dataset.mdsExtraKpis === 'true') return;
    const grid = summary.querySelector('.mds-operational-summary-grid');
    if (!grid) return;
    summary.dataset.mdsExtraKpis = 'true';

    const newOrders = document.createElement('a');
    newOrders.className = 'mds-operational-kpi';
    newOrders.dataset.kpi = 'new-orders';
    newOrders.href = '/gestao-pedidos';
    newOrders.innerHTML = '<span class="mds-operational-kpi-label">Pedidos novos</span><strong class="mds-operational-kpi-value" data-kpi-value="new-orders">…</strong>';
    grid.prepend(newOrders);

    const products = document.createElement('a');
    products.className = 'mds-operational-kpi';
    products.dataset.kpi = 'unavailable-products';
    products.href = '/products';
    products.innerHTML = '<span class="mds-operational-kpi-label">Produtos indisponíveis</span><strong class="mds-operational-kpi-value" data-kpi-value="unavailable-products">…</strong>';
    grid.appendChild(products);

    fetch(apiUrl('/orders?include_removed=false'), { credentials: 'include' })
      .then(response => { if (!response.ok) throw new Error('orders'); return response.json(); })
      .then(orders => setKpiValue(summary, 'new-orders', String(Array.isArray(orders) ? orders.filter(order => order && order.status === 'pending').length : 0)))
      .catch(() => setKpiValue(summary, 'new-orders', '—'));

    fetch(apiUrl('/tenant-products?active_only=false'), { credentials: 'include' })
      .then(response => { if (!response.ok) throw new Error('products'); return response.json(); })
      .then(items => setKpiValue(summary, 'unavailable-products', String(Array.isArray(items) ? items.filter(item => item && item.is_active === false).length : 0)))
      .catch(() => setKpiValue(summary, 'unavailable-products', '—'));
  };

  const ensureCommercialUi = () => {
    ensureStyles();
    ensureOrderOperationalNav();
    applyOrdersViewFromQuery();
    ensureAdditionalOperationalKpis();

    const adminMarker = document.querySelector('#staff-sidebar-nav [data-mds-commercial-links]');
    if (adminMarker) ensureAdminExtraNav(adminMarker);

    const actions = document.querySelector('.quick-actions');
    if (!actions) return;
    const hasOrdersAccess = !!document.querySelector('#staff-sidebar-nav a[href="/staff/orders"]');

    for (const item of commercialCards) {
      const isOrderArea = item.href === '/gestao-pedidos' || item.href.startsWith('/staff/orders?view=');
      if (isOrderArea && !hasOrdersAccess) continue;
      if (!isOrderArea && !adminMarker) continue;
      if (actions.querySelector(`[${CARD_ATTR}="${item.href}"]`)) continue;
      const card = document.createElement('a');
      card.className = 'action-card mds-commercial-dashboard-card';
      card.href = item.href;
      card.setAttribute(CARD_ATTR, item.href);
      card.innerHTML = `<div class="action-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${item.icon}</svg></div><span class="action-label">${item.label}</span><span class="action-desc">${item.description}</span>`;
      actions.appendChild(card);
    }
  };

  const observer = new MutationObserver(() => ensureCommercialUi());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureCommercialUi, { once: true });
  else ensureCommercialUi();
})();
