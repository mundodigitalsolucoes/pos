import { Component, inject, signal, OnInit, computed, AfterViewInit, OnDestroy, ViewChild, ElementRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { ApiService, TenantSettings, TenantUiModuleKey, User } from '../services/api.service';
import { PermissionService, Permission } from '../services/permission.service';
import { environment } from '../../environments/environment';
import { LanguagePickerComponent } from './language-picker.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { StaffLayoutService } from '../services/staff-layout.service';
import { ConnectivityService } from '../services/connectivity.service';
import { OfflineOrderQueueService } from '../services/offline-order-queue.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LanguagePickerComponent, TranslateModule],
  template: `
    <div class="layout" [class.sidebar-open]="sidebarOpen()" [class.layout--nav-collapsed]="staffLayout.sidebarCollapsed()">
      <header class="mobile-header">
        <button class="menu-toggle" (click)="toggleSidebar()" [attr.aria-expanded]="sidebarOpen()" aria-controls="staff-sidebar-nav">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div class="mobile-brand" [attr.title]="brandTitle()" [attr.aria-label]="brandTitle()">
          <span class="header-title">MDS Food</span>
          @if (tenantOrgName()) {
            <span class="header-org-name" [attr.title]="tenantOrgName()!" [attr.aria-label]="tenantOrgName()!">{{
              tenantOrgName()
            }}</span>
          }
        </div>
      </header>

      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="logo-container" [attr.title]="brandTitle()" [attr.aria-label]="brandTitle()">
            <img class="brand-logo" src="/logo-mds-food-header.png" alt="MDS Food" />
            <span class="version">
              {{ version }}
              <span class="commit-hash">{{ commitHash }}</span>
              @if (tenantId(); as tid) {
                <span class="tenant-id" title="Tenant ID">{{ tid }}</span>
              }
            </span>
          </div>
          <button class="close-btn" (click)="closeSidebar()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        @if (tenantOrgName()) {
          <div class="tenant-card">
            @if (tenantLogoUrl()) { <img [src]="tenantLogoUrl()!" alt="" class="tenant-avatar" /> }
            @else { <span class="tenant-avatar tenant-initial" aria-hidden="true">{{ tenantOrgName().charAt(0) }}</span> }
            <div class="tenant-details">
              <strong [title]="tenantOrgName()">{{ tenantOrgName() }}</strong>
              @if (tenantSettings()?.address) { <small [title]="tenantSettings()!.address!">{{ tenantSettings()!.address }}</small> }
            </div>
          </div>
        }

        <nav class="nav" id="staff-sidebar-nav" #navScroll tabindex="-1" (scroll)="persistNavScroll()" aria-label="Navegação principal">
          @if (canAccess('/staff/orders')) {
            <a routerLink="/gestao-pedidos" routerLinkActive="active" class="nav-link" (click)="closeSidebar()"><span>Gestão de pedidos</span></a>
          }
          @if (moduleEnabled('kitchen_bar') && canAccess('/kitchen')) {
            <a routerLink="/kitchen" routerLinkActive="active" class="nav-link" (click)="closeSidebar()"><span>KDS / Cozinha</span></a>
          }
          @if (hasPermission('order:update_status') && hasPermission('order:mark_paid')) {
            <a routerLink="/caixa" routerLinkActive="active" class="nav-link" (click)="closeSidebar()"><span>Caixa / PDV</span></a>
          }
          @if (canViewReports()) {
            <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link" (click)="closeSidebar()"><span>Desempenho</span></a>
          }
          @if (canAccess('/staff/orders')) {
            <a routerLink="/staff/orders" [queryParams]="{view:'history'}" class="nav-link" [class.active]="currentPath() === '/staff/orders'" (click)="closeSidebar()"><span>Histórico de pedidos</span></a>
          }
          @if (canViewSettings()) {
            <a routerLink="/minha-empresa" routerLinkActive="active" class="nav-link" (click)="closeSidebar()"><span>Minha empresa</span></a>
          }
          <a routerLink="/products" routerLinkActive="active" class="nav-link" (click)="closeSidebar()"><span>Catálogo</span></a>
          @if (canViewSettings()) {
            <a routerLink="/integracoes" routerLinkActive="active" class="nav-link" (click)="closeSidebar()"><span>Integrações</span></a>
            <a routerLink="/settings" routerLinkActive="active" class="nav-link" (click)="closeSidebar()"><span>Configurações</span></a>
          }
        </nav>

        <div class="sidebar-footer">
          <a routerLink="/manual-usuario" class="footer-link" (click)="closeSidebar()">Ajuda</a>
          <details class="account-menu">
            <summary>{{ user()?.full_name || user()?.email || 'Minha conta' }}</summary>
            @if (canViewMyShift()) { <a routerLink="/my-shift" (click)="closeSidebar()">Meu turno</a> }
            @if (canViewWorkingPlan() && moduleEnabled('working_plan')) {
              <a routerLink="/working-plan" (click)="closeSidebar()">Escalas @if (api.workingPlanHasUpdates()) { <span aria-label="Atualizações">*</span> }</a>
            }
            <a routerLink="/talk" (click)="closeSidebar()">Assistente</a>
            <app-language-picker></app-language-picker>
          </details>
          @if (user()) {
            <div class="user-info">
              <span class="user-email">{{ user()?.email }}</span>
              <span class="user-role">{{ getRoleDisplayName() }}</span>
            </div>
          }
          <button class="logout-btn" (click)="logout()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>{{ 'NAV.LOGOUT' | translate }}</span>
          </button>
        </div>
      </aside>

      <div class="overlay" (click)="closeSidebar()"></div>

      <main class="main">
        <header class="work-topbar">
          <strong>{{ pageTitle() }}</strong>
          <div class="topbar-actions">
            <span [title]="user()?.email || ''">{{ user()?.full_name || user()?.email }}</span>
          </div>
        </header>
        @if (showOfflineBanner()) {
          <div
            class="connectivity-banner"
            [class.connectivity-banner--offline]="connectivity.status() !== 'online'"
            [class.connectivity-banner--pending]="offlineQueue.pendingCount() > 0 && connectivity.isOnline()"
            role="status"
          >
            @if (connectivity.status() === 'offline') {
              {{ 'OFFLINE.BANNER_OFFLINE' | translate }}
            } @else if (connectivity.status() === 'degraded') {
              {{ 'OFFLINE.BANNER_DEGRADED' | translate }}
            } @else if (offlineQueue.pendingCount() > 0) {
              {{ 'OFFLINE.BANNER_PENDING' | translate: { count: offlineQueue.pendingCount() } }}
            }
          </div>
        }
        <ng-content></ng-content>
      </main>
    </div>
  `,
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit, AfterViewInit, OnDestroy {
  api = inject(ApiService);
  private router = inject(Router);
  private permissions = inject(PermissionService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  staffLayout = inject(StaffLayoutService);
  readonly connectivity = inject(ConnectivityService);
  readonly offlineQueue = inject(OfflineOrderQueueService);

  @ViewChild('navScroll') navScroll?: ElementRef<HTMLElement>;

  user = signal<User | null>(null);
  tenantSettings = signal<TenantSettings | null>(null);
  currentPath = signal('');
  sidebarOpen = signal(false);
  version = environment.version;
  commitHash = environment.commitHash;

  showOfflineBanner = computed(
    () =>
      !!this.user() &&
      (this.connectivity.status() !== 'online' || this.offlineQueue.pendingCount() > 0)
  );

  canViewSettings = computed(() => this.permissions.isAdmin(this.user()));
  canViewReports = computed(() => this.permissions.isAdmin(this.user()));
  canViewWorkingPlan = computed(() => this.permissions.hasPermission(this.user(), 'schedule:read'));
  canViewMyShift = computed(() => {
    const u = this.user();
    return !!u && u.tenant_id != null && String(u.role).toLowerCase() !== 'provider';
  });


  tenantOrgName = computed(() => this.api.tenantDisplayName()?.trim() ?? '');
  tenantLogoUrl = computed(() => this.api.getTenantLogoUrl(this.tenantSettings()?.logo_filename, this.tenantId()));
  pageTitle = computed(() => {
    const path = this.currentPath();
    if (path === '/dashboard') return 'Desempenho';
    if (path === '/gestao-pedidos') return 'Gestão de pedidos';
    if (path === '/products' || path.startsWith('/cardapio/')) return 'Catálogo';
    if (path === '/minha-empresa') return 'Minha empresa';
    if (path === '/reports') return 'Desempenho';
    if (path === '/caixa') return 'Caixa';
    if (path === '/kitchen') return 'KDS / Cozinha';
    return 'MDS Food';
  });

  tenantId = computed(() => {
    const id = this.user()?.tenant_id;
    return id != null ? id : null;
  });

  brandTitle = computed(() => {
    const org = this.tenantOrgName();
    return org ? `MDS Food (${org})` : 'MDS Food';
  });

  ngOnInit() {
    this.api.ensureTenantUiModulesLoaded().subscribe();
    this.api.getTenantSettings().subscribe({ next: settings => this.tenantSettings.set(settings) });
    this.currentPath.set(this.router.url.split('?')[0]);
    this.api.user$.subscribe(user => {
      this.user.set(user);
      if (user && String(user.role).toLowerCase() === 'owner') {
        this.api.getScheduleNotification().subscribe({
          next: (n) => this.api.workingPlanHasUpdates.set(n.has_updates),
          error: () => this.api.workingPlanHasUpdates.set(false),
        });
      } else {
        this.api.workingPlanHasUpdates.set(false);
      }
    });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.currentPath.set(event.urlAfterRedirects.split('?')[0]);
        this.syncNavScrollAfterRouteChange();
      });
  }

  ngAfterViewInit() {
    this.syncNavScrollAfterRouteChange();
  }

  ngOnDestroy() {
    const el = this.navScroll?.nativeElement;
    if (!el || el.scrollTop <= 0) return;
    this.persistNavScroll();
  }

  private navScrollStorageKey(): string {
    const u = this.user();
    if (!u) return 'anon';
    return `t${u.tenant_id ?? 'none'}-u${u.id}`;
  }

  persistNavScroll(): void {
    const el = this.navScroll?.nativeElement;
    if (!el) return;
    this.staffLayout.setNavScrollTop(this.navScrollStorageKey(), el.scrollTop);
  }

  private syncNavScrollAfterRouteChange(): void {
    requestAnimationFrame(() => {
      this.restoreNavScroll();
      this.ensureActiveNavLinkVisible();
    });
  }

  private restoreNavScroll(): void {
    const el = this.navScroll?.nativeElement;
    if (!el) return;
    const saved = this.staffLayout.getNavScrollTop(this.navScrollStorageKey());
    if (saved != null && saved > 0) {
      el.scrollTop = saved;
    }
  }

  private ensureActiveNavLinkVisible(): void {
    if (this.staffLayout.sidebarCollapsed()) return;
    const nav = this.navScroll?.nativeElement;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('.nav-link.active, .nav-sublink.active');
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  moduleEnabled(key: TenantUiModuleKey): boolean {
    return this.api.isUiModuleEnabled(key);
  }

  hasPermission(permission: Permission): boolean {
    return this.permissions.hasPermission(this.user(), permission);
  }

  canAccess(route: string): boolean {
    return this.permissions.canAccessRoute(this.user(), route);
  }

  getRoleDisplayName(): string {
    const user = this.user();
    if (!user) return '';
    const roleKey = `USERS.ROLES.${user.role.toUpperCase()}`;
    return this.translate.instant(roleKey);
  }

  toggleSidebar() {
    const opening = !this.sidebarOpen();
    this.sidebarOpen.update(v => !v);
    if (opening) {
      requestAnimationFrame(() => this.navScroll?.nativeElement?.focus());
    }
  }

  closeSidebar() {
    this.persistNavScroll();
    this.sidebarOpen.set(false);
  }

  logout() {
    this.api.logout().subscribe(() => this.router.navigate(['/']));
  }
}
