(() => {
  const CARD_ATTR = 'data-mds-commercial-dashboard-card';
  const COMPANY_NAV_ATTR = 'data-mds-company-nav-link';
  const CASHIER_NAV_ATTR = 'data-mds-cashier-nav-link';

  const commercialCards = [
    {
      href: '/caixa',
      label: 'Caixa / PDV',
      description: 'Registre vendas rápidas em dinheiro ou cartão pendente',
      icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h4M15 13h2"/>'
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
      #staff-sidebar-nav .mds-company-nav-link,
      #staff-sidebar-nav .mds-cashier-nav-link {
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
      #staff-sidebar-nav .mds-company-nav-link:hover,
      #staff-sidebar-nav .mds-cashier-nav-link:hover {
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
      .quick-actions .mds-commercial-dashboard-card[href="/caixa"] { order: 80; }
      .quick-actions .mds-commercial-dashboard-card[href="/minha-empresa"] { order: 170; }
      .quick-actions .mds-commercial-dashboard-card[href="/fidelidade"] { order: 180; }
      .quick-actions .mds-commercial-dashboard-card[href="/promocoes"] { order: 190; }
      .quick-actions .mds-commercial-dashboard-card[href="/integracoes"] { order: 200; }
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

  const ensureExtraNav = (adminMarker) => {
    const nav = document.querySelector('#staff-sidebar-nav');
    if (!nav) return;

    if (!nav.querySelector(`[${CASHIER_NAV_ATTR}]`)) {
      const cashierLink = createNavLink({
        className: 'mds-cashier-nav-link',
        href: '/caixa',
        attr: CASHIER_NAV_ATTR,
        label: 'Caixa / PDV',
        icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h4M15 13h2"/>'
      });
      nav.insertBefore(cashierLink, adminMarker);
    }

    if (!nav.querySelector(`[${COMPANY_NAV_ATTR}]`)) {
      const companyLink = createNavLink({
        className: 'mds-company-nav-link',
        href: '/minha-empresa',
        attr: COMPANY_NAV_ATTR,
        label: 'Minha empresa',
        icon: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h2M13 10h2M9 14h2M13 14h2"/>'
      });
      nav.insertBefore(companyLink, adminMarker);
    }
  };

  const ensureCommercialUi = () => {
    const adminMarker = document.querySelector('#staff-sidebar-nav [data-mds-commercial-links]');
    if (!adminMarker) return;

    ensureStyles();
    ensureExtraNav(adminMarker);

    const actions = document.querySelector('.quick-actions');
    if (!actions) return;

    for (const item of commercialCards) {
      if (actions.querySelector(`[${CARD_ATTR}="${item.href}"]`)) continue;

      const card = document.createElement('a');
      card.className = 'action-card mds-commercial-dashboard-card';
      card.href = item.href;
      card.setAttribute(CARD_ATTR, item.href);
      card.innerHTML = `
        <div class="action-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${item.icon}</svg>
        </div>
        <span class="action-label">${item.label}</span>
        <span class="action-desc">${item.description}</span>
      `;
      actions.appendChild(card);
    }
  };

  const observer = new MutationObserver(() => ensureCommercialUi());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureCommercialUi, { once: true });
  } else {
    ensureCommercialUi();
  }
})();
