(() => {
  const translations = {
    'SETTINGS.LOYALTY_TITLE': 'Programa de fidelidade',
    'SETTINGS.LOYALTY_SUBTITLE': 'Configure pontos, recompensas e benefícios para seus clientes.',
    'SETTINGS.LOYALTY_SECTION_PROGRAM': 'Configuração do programa',
    'SETTINGS.LOYALTY_ENABLED': 'Ativar programa de fidelidade',
    'SETTINGS.LOYALTY_FIELD_HELP': 'Ajuda sobre este campo',
    'SETTINGS.LOYALTY_ENABLED_HINT': 'Quando ativado, clientes podem acumular e resgatar benefícios.',
    'SETTINGS.LOYALTY_PROGRAM_NAME': 'Nome do programa',
    'SETTINGS.LOYALTY_PROGRAM_NAME_HINT': 'Nome exibido para seus clientes.',
    'SETTINGS.LOYALTY_MODE': 'Modelo de fidelidade',
    'SETTINGS.LOYALTY_MODE_HINT': 'Escolha entre pontos ou selos.',
    'SETTINGS.LOYALTY_MODE_POINTS': 'Pontos',
    'SETTINGS.LOYALTY_MODE_STAMPS': 'Selos',
    'SETTINGS.LOYALTY_SECTION_EARN_REDEEM': 'Acúmulo e resgate',
    'SETTINGS.LOYALTY_EARN': 'Pontos por compra',
    'SETTINGS.LOYALTY_EARN_HINT': 'Quantidade de pontos creditada por evento de compra.',
    'SETTINGS.LOYALTY_THRESHOLD': 'Pontos para resgate',
    'SETTINGS.LOYALTY_THRESHOLD_HINT': 'Saldo mínimo necessário para liberar uma recompensa.',
    'SETTINGS.LOYALTY_REWARD_CENTS': 'Valor da recompensa (centavos)',
    'SETTINGS.LOYALTY_REWARD_CENTS_HINT': 'Valor do benefício concedido no resgate.',
    'SETTINGS.LOYALTY_SECTION_EXTRAS': 'Benefícios adicionais',
    'SETTINGS.LOYALTY_BIRTHDAY_BONUS': 'Bônus de aniversário',
    'SETTINGS.LOYALTY_BIRTHDAY_BONUS_HINT': 'Pontos extras concedidos no aniversário do cliente.',
    'SETTINGS.LOYALTY_VIP_SILVER': 'Faixa VIP Prata',
    'SETTINGS.LOYALTY_VIP_GOLD': 'Faixa VIP Ouro',
    'SETTINGS.LOYALTY_VIP_HINT': 'Saldo necessário para atingir este nível VIP.',
    'SETTINGS.LOYALTY_REFERRAL_BONUS': 'Bônus por indicação',
    'SETTINGS.LOYALTY_REFERRAL_HINT': 'Pontos concedidos a quem indicar um novo cliente.',
    'SETTINGS.LOYALTY_REFERRAL_INVITEE': 'Bônus para indicado',
    'SETTINGS.LOYALTY_REFERRAL_INVITEE_HINT': 'Pontos concedidos ao novo cliente indicado.',
    'SETTINGS.LOYALTY_SECTION_PUBLIC': 'Acesso do cliente',
    'SETTINGS.LOYALTY_JOIN_URL': 'Link para participar',
    'SETTINGS.LOYALTY_JOIN_URL_HINT': 'Compartilhe este link para o cliente entrar no programa.',
    'SETTINGS.LOYALTY_WALLET_ENABLED': 'Carteira digital do programa',
    'SETTINGS.LOYALTY_WALLET_ENABLED_HINT': 'Ativa emissão de cartão compatível com carteiras digitais quando configuradas.',
    'SETTINGS.LOYALTY_WALLET_NOTE': 'O cartão de fidelidade funciona normalmente. Apple Wallet e Google Wallet exigem configuração adicional de certificados e credenciais.',
    'SETTINGS.LOYALTY_MEMBERS': 'Clientes participantes',
    'SETTINGS.LOYALTY_MEMBERS_EMPTY': 'Nenhum cliente participante ainda.',
    'SETTINGS.LOYALTY_MEMBERS_EMPTY_HINT': 'Compartilhe o link acima para começar a cadastrar clientes no programa.',
    'SETTINGS.LOYALTY_BALANCE': 'Saldo',
    'SETTINGS.LOYALTY_VIP_TIER': 'Nível VIP',
    'SETTINGS.LOYALTY_REFERRAL_CODE': 'Código de indicação',

    'SETTINGS.PROMOS_TITLE': 'Promoções',
    'SETTINGS.PROMOS_SUBTITLE': 'Crie descontos por categoria, canal e horário.',
    'SETTINGS.PROMOS_NAME': 'Nome da promoção',
    'SETTINGS.PROMOS_PERCENT': 'Desconto (%)',
    'SETTINGS.PROMOS_CATEGORY': 'Categoria',
    'SETTINGS.PROMOS_CATEGORY_HINT': 'Ex.: Pizzas, Bebidas, Sobremesas',
    'SETTINGS.PROMOS_CHANNELS': 'Canal de venda',
    'SETTINGS.PROMOS_CHANNELS_ALL': 'Todos os canais',
    'SETTINGS.PROMOS_START_TIME': 'Horário inicial',
    'SETTINGS.PROMOS_END_TIME': 'Horário final',
    'SETTINGS.PROMOS_CREATE': 'Criar promoção',
    'SETTINGS.PROMOS_LIST': 'Promoções cadastradas',
    'SETTINGS.PROMOS_EMPTY': 'Nenhuma promoção cadastrada.',
    'SETTINGS.PROMOS_ENABLED': 'Ativa',
    'SETTINGS.PROMOS_DISABLE': 'Desativar',

    'TALK.TITLE': 'Assistente operacional',
    'TALK.SUBTITLE': 'Acesse áreas do MDS Food por voz ou comando rápido.',
    'TALK.HINT': 'Diga ou digite para onde deseja ir. O assistente apenas navega pelo sistema e não altera dados.',
    'TALK.EXAMPLES_LABEL': 'Exemplos rápidos',
    'TALK.LISTEN': 'Ouvir comando',
    'TALK.STOP': 'Parar de ouvir',
    'TALK.NO_SPEECH': 'Seu navegador não oferece suporte a comando por voz. Use o campo abaixo.',
    'TALK.TYPED_LABEL': 'Digite um comando',
    'TALK.TYPED_PLACEHOLDER': 'Ex.: abrir pedidos, cozinha, mesas ou meu turno',
    'TALK.GO': 'Ir',
    'TALK.ERR_EMPTY': 'Digite ou fale um comando.',
    'TALK.ERR_NO_MATCH': 'Não reconheci esse destino. Tente um dos exemplos disponíveis.',
    'TALK.ERR_SPEECH': 'Não foi possível usar o microfone. Verifique a permissão do navegador.',
    'TALK.LISTENING': 'Ouvindo…',
    'TALK.MATCHED': 'Abrindo a área solicitada…'
  };

  const exampleTranslations = {
    kitchen: 'cozinha',
    bar: 'bar',
    tables: 'mesas',
    orders: 'pedidos',
    reservations: 'reservas',
    'my shift': 'meu turno'
  };

  const replaceExactText = (node) => {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const raw = node.nodeValue || '';
    const trimmed = raw.trim();
    if (!trimmed) return;
    const translated = translations[trimmed];
    if (!translated) return;
    const left = raw.match(/^\s*/)?.[0] || '';
    const right = raw.match(/\s*$/)?.[0] || '';
    node.nodeValue = `${left}${translated}${right}`;
  };

  const translateElement = (el) => {
    if (!(el instanceof Element)) return;

    el.childNodes.forEach(replaceExactText);

    if (el instanceof HTMLInputElement && el.placeholder && translations[el.placeholder]) {
      el.placeholder = translations[el.placeholder];
    }
    if (el instanceof HTMLElement && el.title && translations[el.title]) {
      el.title = translations[el.title];
    }
    if (el.getAttribute('aria-label') && translations[el.getAttribute('aria-label')]) {
      el.setAttribute('aria-label', translations[el.getAttribute('aria-label')]);
    }

    if (el.matches('.talk-page .example-chip')) {
      const key = (el.textContent || '').trim().toLowerCase();
      if (exampleTranslations[key]) el.textContent = exampleTranslations[key];
    }

    if (el.matches('.wallet-note')) {
      const text = (el.textContent || '').trim();
      if (text.startsWith('Wallet pass issuance requires')) {
        el.textContent = 'O cartão de fidelidade funciona normalmente. Apple Wallet e Google Wallet exigem configuração adicional de certificados e credenciais.';
      }
    }
  };

  const apply = (root = document) => {
    if (root instanceof Element) translateElement(root);
    root.querySelectorAll?.('*').forEach(translateElement);
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) replaceExactText(node);
        else if (node instanceof Element) apply(node);
      });
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => apply());
  else apply();
})();
