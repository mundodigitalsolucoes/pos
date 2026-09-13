(() => {
  const STORAGE_KEY = 'mds-food-sidebar-collapsed';
  const DESKTOP_MIN = 769;

  const isDesktop = () => window.innerWidth >= DESKTOP_MIN;
  const sidebar = () => document.querySelector('.sidebar');
  const layout = () => document.querySelector('.layout');

  const setCollapsed = (collapsed) => {
    const root = layout();
    if (!root || !isDesktop()) return;
    root.classList.toggle('mds-sidebar-collapsed', collapsed);
    try { localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0'); } catch (_) {}
    const button = document.querySelector('[data-mds-sidebar-collapse]');
    if (button) {
      button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      button.setAttribute('title', collapsed ? 'Expandir menu' : 'Recolher menu');
      button.setAttribute('aria-label', collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral');
    }
  };

  const ensureToggle = () => {
    if (!isDesktop()) return;
    const aside = sidebar();
    const header = aside?.querySelector('.sidebar-header');
    const root = layout();
    if (!aside || !header || !root || header.querySelector('[data-mds-sidebar-collapse]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mds-sidebar-collapse-btn';
    button.setAttribute('data-mds-sidebar-collapse', 'true');
    button.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>';
    button.addEventListener('click', () => setCollapsed(!root.classList.contains('mds-sidebar-collapsed')));
    header.appendChild(button);

    let saved = false;
    try { saved = localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) {}
    setCollapsed(saved);
  };

  const observer = new MutationObserver(ensureToggle);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', () => {
    if (!isDesktop()) layout()?.classList.remove('mds-sidebar-collapsed');
    else ensureToggle();
  });
  ensureToggle();
})();
