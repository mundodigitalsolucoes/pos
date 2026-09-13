(() => {
  const isProductsPage = () => window.location.pathname === '/products';

  const clickNativeTab = (index) => {
    const tabs = document.querySelectorAll('.main-tabs-container .main-tab');
    const tab = tabs.item(index);
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
          <p class="mds-catalog-shell-copy">Gerencie produtos, categorias e promoções usando os recursos reais do MDS Food.</p>
        </div>
        <nav class="mds-catalog-nav" aria-label="Áreas do cardápio">
          <button type="button" data-mds-catalog-products class="is-active">Produtos</button>
          <button type="button" data-mds-catalog-categories>Categorias</button>
          <a href="/promocoes">Promoções</a>
        </nav>
      </div>
    `;

    nativeTabs.insertAdjacentElement('beforebegin', shell);

    shell.querySelector('[data-mds-catalog-products]')?.addEventListener('click', () => clickNativeTab(0));
    shell.querySelector('[data-mds-catalog-categories]')?.addEventListener('click', () => clickNativeTab(1));

    const nativeButtons = nativeTabs.querySelectorAll('.main-tab');
    nativeButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        shell.querySelector('[data-mds-catalog-products]')?.classList.toggle('is-active', index === 0);
        shell.querySelector('[data-mds-catalog-categories]')?.classList.toggle('is-active', index === 1);
      });
    });
  };

  const observer = new MutationObserver(ensureCatalogShell);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', ensureCatalogShell);
  ensureCatalogShell();
})();
