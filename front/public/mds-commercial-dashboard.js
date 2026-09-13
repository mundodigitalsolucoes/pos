(() => {
  const CARD_ATTR = 'data-mds-commercial-dashboard-card';

  const commercialCards = [
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
      .quick-actions .mds-commercial-dashboard-card {
        border-top: 3px solid #374B89;
        box-shadow: 0 8px 20px rgba(47, 52, 83, .06);
      }
      .quick-actions .mds-commercial-dashboard-card .action-icon {
        background: rgba(55, 75, 137, .10);
        color: #374B89;
      }
      .quick-actions .mds-commercial-dashboard-card[href="/fidelidade"] { order: 180; }
      .quick-actions .mds-commercial-dashboard-card[href="/promocoes"] { order: 190; }
      .quick-actions .mds-commercial-dashboard-card[href="/integracoes"] { order: 200; }
    `;
    document.head.appendChild(style);
  };

  const ensureCards = () => {
    const actions = document.querySelector('.quick-actions');
    const adminMarker = document.querySelector('#staff-sidebar-nav [data-mds-commercial-links]');
    if (!actions || !adminMarker) return;

    ensureStyles();

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

  const observer = new MutationObserver(() => ensureCards());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureCards, { once: true });
  } else {
    ensureCards();
  }
})();
