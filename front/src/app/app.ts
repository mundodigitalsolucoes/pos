import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { LanguageService } from './services/language.service';
import { SeoService } from './services/seo.service';
import { ApiService } from './services/api.service';

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
      #staff-sidebar-nav .mds-public-menu-link {
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
      #staff-sidebar-nav .mds-public-menu-link:hover {
        background: rgba(55, 75, 137, .08);
        border-left-color: #D6A92F;
        color: #2F3453;
      }
      #staff-sidebar-nav .mds-public-menu-link svg {
        flex: 0 0 auto;
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
    `;
    document.head.appendChild(style);
  }

  private scheduleStaffShortcuts(): void {
    window.setTimeout(() => this.ensureStaffShortcuts(), 0);
  }

  /**
   * Keep the public digital menu visible from the operational area.
   * This is intentionally added at the application shell so every staff page
   * gets the shortcut without coupling the public menu to a specific module.
   */
  private ensureStaffShortcuts(): void {
    const tenantId = this.currentTenantId;
    if (tenantId == null) return;

    const publicMenuHref = `/public-menu/${tenantId}`;
    const nav = document.querySelector<HTMLElement>('#staff-sidebar-nav');
    if (nav && !nav.querySelector('[data-mds-public-menu-link]')) {
      const link = document.createElement('a');
      link.className = 'nav-link mds-public-menu-link';
      link.href = publicMenuHref;
      link.target = '_blank';
      link.rel = 'noopener';
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

    if (this.router.url.split('?')[0] !== '/dashboard') return;

    const actions = document.querySelector<HTMLElement>('.quick-actions');
    if (!actions || actions.querySelector('[data-mds-public-menu-card]')) return;

    const card = document.createElement('a');
    card.className = 'action-card mds-public-menu-card';
    card.href = publicMenuHref;
    card.target = '_blank';
    card.rel = 'noopener';
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
      <span class="action-desc">Visualize o cardápio público do seu restaurante</span>
    `;

    const insertBefore = actions.children.item(1);
    actions.insertBefore(card, insertBefore);
  }
}
