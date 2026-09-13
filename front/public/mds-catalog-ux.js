(() => {
  const isProductsPage = () => window.location.pathname === '/products';

  const clickNativeProducts = () => {
    const tabs = document.querySelectorAll('.main-tabs-container .main-tab');
    const tab = tabs.item(0);
    if (tab instanceof HTMLButtonElement) tab.click();
  };

  const ensureCatalogShell = () => {
    document.body.classList.toggle('mds-products-page', isProductsPage());
    if (!isProductsPage()) return;

    const header = document.querySelector('.page-header');
    const nativeTabs = document.querySelector('.main-tabs-container');
    if (!header || !nativeTabs || document.querySelector('[data-mds-catalog-shell]')) return;

    const heading = header.querySelector('h1');
    if (heading) heading.textContent = 'Cardápio';

    const shell = document.createElement('section');
    shell.className = 'mds-catalog-shell';
    shell.setAttribute('data-mds-catalog-shell', 'true');
    shell.innerHTML = `
      <div class="mds-catalog-shell-head">
        <div>
          <p class="mds-catalog-shell-eyebrow">Catálogo de venda</p>
          <h2 class="mds-catalog-shell-title">Organize o que seu cliente vê e compra</h2>
          <p class="mds-catalog-shell-copy">Gerencie produtos, categorias, destaques, etiquetas e promoções usando recursos reais do MDS Food.</p>
        </div>
        <nav class="mds-catalog-nav" aria-label="Áreas do cardápio">
          <button type="button" data-mds-catalog-products class="is-active">Produtos</button>
          <a href="/cardapio/categorias">Categorias</a>
          <a href="/cardapio/destaques">Destaques e etiquetas</a>
          <a href="/promocoes">Promoções</a>
        </nav>
      </div>
    `;

    nativeTabs.insertAdjacentElement('beforebegin', shell);
    shell.querySelector('[data-mds-catalog-products]')?.addEventListener('click', clickNativeProducts);
  };

  const observer = new MutationObserver(ensureCatalogShell);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', ensureCatalogShell);
  ensureCatalogShell();
})();
