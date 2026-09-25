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
import { TablesAreaPreferenceService } from '../services/tables-area-preference.service';
import { StaffLayoutService } from '../services/staff-layout.service';
import { ConnectivityService } from '../services/connectivity.service';
import { OfflineOrderQueueService } from '../services/offline-order-queue.service';

type NavGroupKey = 'operations' | 'planning' | 'catalog' | 'admin';

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

        <nav class="nav" id="staff-sidebar-nav" #navScroll tabindex="-1" (scroll)="persistNavScroll()">
          <div class="nav-label">Operação</div>
          <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link" (click)="closeSidebar()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
            <span>{{ 'NAV.HOME' | translate }}</span>
          </a>
          <a routerLink="/gestao-pedidos" routerLinkActive="active" class="nav-link" (click)="closeSidebar()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h14v16H5zM8 9h8M8 13h8M8 17h5"/></svg>
            <span>Gestão de pedidos</span>
          </a>
          @if (moduleEnabled('kitchen_bar')) {
            <a routerLink="/kitchen" routerLinkActive="active" class="nav-link" (click)="closeSidebar()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8h18v12H3zM7 8V5a5 5 0 0 1 10 0v3"/></svg><span>KDS / Cozinha</span>
            </a>
          }
          @if (hasPermission('order:update_status') && hasPermission('order:mark_paid')) {
            <a routerLink="/caixa" routerLinkActive="active" class="nav-link" (click)="closeSidebar()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="15" rx="2"/><path d="M2 11h20M6 3h12"/></svg><span>Caixa</span>
            </a>
          }
          <div class="nav-label">Gestão</div>
          @if (canViewReports()) {
            <a routerLink="/reports" routerLinkActive="active" class="nav-link" (click)="closeSidebar()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20V4M3 20h18M7 16l4-5 4 2 5-7"/></svg><span>Desempenho</span></a>
          }
          <a routerLink="/staff/orders" [queryParams]="{view:'history'}" class="nav-link" (click)="closeSidebar()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>Histórico de pedidos</span></a>
          @if (canViewSettings()) {
            <a routerLink="/minha-empresa" routerLinkActive="active" class="nav-link" (click)="closeSidebar()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h18v11H3zM2 10l3-6h14l3 6M8 21v-7h8v7"/></svg><span>Minha empresa</span></a>
          }
          <a routerLink="/products" routerLinkActive="active" class="nav-link" (click)="closeSidebar()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg><span>Catálogo</span></a>
          <div class="nav-label">Outras ferramentas</div>
          @if (canViewMyShift()) {
            <a routerLink="/my-shift" routerLinkActive="active" class="nav-link" (click)="closeSidebar()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <span>{{ 'NAV.MY_SHIFT' | translate }}</span>
            </a>
          }
          <a routerLink="/talk" routerLinkActive="active" class="nav-link" data-testid="nav-talk" (click)="closeSidebar()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            <span>{{ 'NAV.TALK' | translate }}</span>
          </a>
          <a routerLink="/staff/orders" routerLinkActive="active" class="nav-link" (click)="closeSidebar()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            <span>{{ 'NAV.ORDERS' | translate }}</span>
          </a>

          @if (showOperationsGroup()) {
            <div class="nav-section">
              <button
                type="button"
                class="nav-section-header"
                [attr.aria-expanded]="operationsOpen()"
                aria-controls="nav-group-operations"
                (click)="toggleNavGroup('operations')"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
                <span>{{ 'NAV.GROUP_OPERATIONS' | translate }}</span>
                <svg class="chevron" [class.open]="operationsOpen()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              @if (operationsOpen()) {
                <div class="nav-submenu" id="nav-group-operations">
                  @if (canViewTables() && moduleEnabled('tables')) {
                    <a [routerLink]="tablesArea.entryPath()" class="nav-sublink" [class.active]="isTablesNavActive()" (click)="closeSidebar()">
                      <span>{{ 'NAV.TABLES' | translate }}</span>
                    </a>
                  }
                  @if (moduleEnabled('kitchen_bar')) {
                    <a routerLink="/bar" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                      <span>{{ 'NAV.BEVERAGES_DISPLAY' | translate }}</span>
                    </a>
                  }
                  @if (canViewCustomers()) {
                    <a routerLink="/customers" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                      <span>{{ 'NAV.CUSTOMERS' | translate }}</span>
                    </a>
                  }
                </div>
              }
            </div>
          }

          @if (showPlanningGroup()) {
            <div class="nav-section">
              <button
                type="button"
                class="nav-section-header"
                [attr.aria-expanded]="planningOpen()"
                aria-controls="nav-group-planning"
                (click)="toggleNavGroup('planning')"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>{{ 'NAV.GROUP_PLANNING' | translate }}</span>
                <svg class="chevron" [class.open]="planningOpen()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              @if (planningOpen()) {
                <div class="nav-submenu" id="nav-group-planning">
                  @if (canViewWorkingPlan() && moduleEnabled('working_plan')) {
                    <a routerLink="/working-plan" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                      <span>{{ 'NAV.WORKING_PLAN' | translate }}</span>
                      @if (api.workingPlanHasUpdates()) {
                        <span class="nav-update-star" aria-label="Updated">*</span>
                      }
                    </a>
                  }
                  @if (canViewReservations() && moduleEnabled('reservations')) {
                    <a routerLink="/reservations" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                      <span>{{ 'NAV.RESERVATIONS' | translate }}</span>
                    </a>
                    <a routerLink="/guest-feedback" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                      <span>{{ 'NAV.GUEST_FEEDBACK' | translate }}</span>
                    </a>
                  }
                </div>
              }
            </div>
          }

          @if (showCatalogGroup()) {
            <div class="nav-section">
              <button
                type="button"
                class="nav-section-header"
                [attr.aria-expanded]="catalogOpen()"
                aria-controls="nav-group-catalog"
                (click)="toggleNavGroup('catalog')"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                </svg>
                <span>{{ 'NAV.GROUP_CATALOG' | translate }}</span>
                <svg class="chevron" [class.open]="catalogOpen()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              @if (catalogOpen()) {
                <div class="nav-submenu" id="nav-group-catalog">
                  <a routerLink="/products" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                    <span>{{ 'NAV.PRODUCTS' | translate }}</span>
                  </a>
                  @if (moduleEnabled('providers')) {
                    <a routerLink="/catalog" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                      <span>{{ 'NAV.CATALOG' | translate }}</span>
                    </a>
                  }
                  @if (canViewInventory() && moduleEnabled('inventory')) {
                    <div class="nav-nested-section">
                      <button
                        type="button"
                        class="nav-nested-header"
                        [attr.aria-expanded]="inventoryOpen()"
                        aria-controls="nav-group-inventory"
                        (click)="toggleInventory($event)"
                      >
                        <span>{{ 'NAV.INVENTORY' | translate }}</span>
                        <svg class="chevron" [class.open]="inventoryOpen()" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                      @if (inventoryOpen()) {
                        <div class="nav-nested-submenu" id="nav-group-inventory">
                          <a routerLink="/inventory/items" routerLinkActive="active" class="nav-sublink nav-sublink--nested" (click)="closeSidebar()">
                            <span>{{ 'NAV.ITEMS' | translate }}</span>
                          </a>
                          <a routerLink="/inventory/suppliers" routerLinkActive="active" class="nav-sublink nav-sublink--nested" (click)="closeSidebar()">
                            <span>{{ 'NAV.SUPPLIERS' | translate }}</span>
                          </a>
                          <a routerLink="/inventory/warehouses" routerLinkActive="active" class="nav-sublink nav-sublink--nested" (click)="closeSidebar()">
                            <span>{{ 'NAV.WAREHOUSES' | translate }}</span>
                          </a>
                          <a routerLink="/inventory/purchase-orders" routerLinkActive="active" class="nav-sublink nav-sublink--nested" (click)="closeSidebar()">
                            <span>{{ 'NAV.PURCHASE_ORDERS' | translate }}</span>
                          </a>
                          <a routerLink="/inventory/stock" routerLinkActive="active" class="nav-sublink nav-sublink--nested" (click)="closeSidebar()">
                            <span>{{ 'NAV.STOCK_DASHBOARD' | translate }}</span>
                          </a>
                          <a routerLink="/inventory/reports" routerLinkActive="active" class="nav-sublink nav-sublink--nested" (click)="closeSidebar()">
                            <span>{{ 'NAV.REPORTS' | translate }}</span>
                          </a>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }

          @if (showAdminGroup()) {
            <div class="nav-section">
              <button
                type="button"
                class="nav-section-header"
                [attr.aria-expanded]="adminOpen()"
                aria-controls="nav-group-admin"
                (click)="toggleNavGroup('admin')"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
                <span>{{ 'NAV.GROUP_ADMIN' | translate }}</span>
                <svg class="chevron" [class.open]="adminOpen()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              @if (adminOpen()) {
                <div class="nav-submenu" id="nav-group-admin">
                  @if (canViewUsers() && moduleEnabled('users')) {
                    <a routerLink="/users" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                      <span>{{ 'NAV.USERS' | translate }}</span>
                    </a>
                  }
                  @if (canViewContracts() && moduleEnabled('contracts')) {
                    <a routerLink="/contracts" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                      <span>{{ 'NAV.CONTRACTS' | translate }}</span>
                    </a>
                  }
                  @if (canViewSettings()) {
                    <a routerLink="/settings" routerLinkActive="active" class="nav-sublink" (click)="closeSidebar()">
                      <span>{{ 'NAV.SETTINGS' | translate }}</span>
                    </a>
                  }
                </div>
              }
            </div>
          }
        </nav>

        <div class="sidebar-footer">
          <app-language-picker></app-language-picker>
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
            @if (canViewSettings()) { <a routerLink="/settings">Configurações</a> }
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
  tablesArea = inject(TablesAreaPreferenceService);
  staffLayout = inject(StaffLayoutService);
  readonly connectivity = inject(ConnectivityService);
  readonly offlineQueue = inject(OfflineOrderQueueService);

  @ViewChild('navScroll') navScroll?: ElementRef<HTMLElement>;

  user = signal<User | null>(null);
  tenantSettings = signal<TenantSettings | null>(null);
  currentPath = signal('');
  sidebarOpen = signal(false);
  operationsOpen = signal(false);
  planningOpen = signal(false);
  catalogOpen = signal(false);
  adminOpen = signal(false);
  inventoryOpen = signal(false);
  version = environment.version;
  commitHash = environment.commitHash;

  showOfflineBanner = computed(
    () =>
      !!this.user() &&
      (this.connectivity.status() !== 'online' || this.offlineQueue.pendingCount() > 0)
  );

  canViewTables = computed(() => this.permissions.canAccessRoute(this.user(), '/tables'));
  canViewReservations = computed(() => this.permissions.hasPermission(this.user(), 'reservation:read'));
  canViewCustomers = computed(() => this.permissions.canAccessRoute(this.user(), '/customers'));
  canViewSettings = computed(() => this.permissions.isAdmin(this.user()));
  canViewInventory = computed(() => this.permissions.isAdmin(this.user()));
  canViewReports = computed(() => this.permissions.isAdmin(this.user()));
  canViewWorkingPlan = computed(() => this.permissions.hasPermission(this.user(), 'schedule:read'));
  canViewUsers = computed(() => this.permissions.isAdmin(this.user()));
  canViewContracts = computed(() => this.permissions.hasPermission(this.user(), 'staff_contract:read'));
  canViewMyShift = computed(() => {
    const u = this.user();
    return !!u && u.tenant_id != null && String(u.role).toLowerCase() !== 'provider';
  });

  showOperationsGroup = computed(
    () =>
      (this.canViewTables() && this.moduleEnabled('tables')) ||
      this.moduleEnabled('kitchen_bar') ||
      this.canViewCustomers()
  );
  showPlanningGroup = computed(
    () =>
      (this.canViewWorkingPlan() && this.moduleEnabled('working_plan')) ||
      (this.canViewReservations() && this.moduleEnabled('reservations'))
  );
  /** Products link is always shown; group stays visible for all staff. */
  showCatalogGroup = computed(() => true);
  showAdminGroup = computed(
    () =>
      this.canViewReports() ||
      (this.canViewUsers() && this.moduleEnabled('users')) ||
      (this.canViewContracts() && this.moduleEnabled('contracts')) ||
      this.canViewSettings()
  );

  tenantOrgName = computed(() => this.api.tenantDisplayName()?.trim() ?? '');
  tenantLogoUrl = computed(() => this.api.getTenantLogoUrl(this.tenantSettings()?.logo_filename, this.tenantId()));
  pageTitle = computed(() => {
    const path = this.currentPath();
    if (path === '/dashboard') return 'Dashboard';
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
    this.syncGroupOpenFromRoute(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.currentPath.set(event.urlAfterRedirects.split('?')[0]);
        this.syncGroupOpenFromRoute(event.urlAfterRedirects);
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

  private syncGroupOpenFromRoute(url: string): void {
    const path = url.split('?')[0];
    if (
      path === '/tables' ||
      path.startsWith('/tables/') ||
      path === '/kitchen' ||
      path === '/bar' ||
      path.startsWith('/customers')
    ) {
      this.operationsOpen.set(true);
    }
    if (
      path.startsWith('/working-plan') ||
      path.startsWith('/reservations') ||
      path.startsWith('/guest-feedback')
    ) {
      this.planningOpen.set(true);
    }
    if (
      path.startsWith('/products') ||
      path.startsWith('/catalog') ||
      path.startsWith('/inventory')
    ) {
      this.catalogOpen.set(true);
      if (path.startsWith('/inventory')) {
        this.inventoryOpen.set(true);
      }
    }
    if (
      path.startsWith('/reports') ||
      path.startsWith('/users') ||
      path.startsWith('/contracts') ||
      path.startsWith('/settings')
    ) {
      this.adminOpen.set(true);
    }
  }

  moduleEnabled(key: TenantUiModuleKey): boolean {
    return this.api.isUiModuleEnabled(key);
  }

  isTablesNavActive(): boolean {
    const path = this.router.url.split('?')[0];
    return path === '/tables' || path.startsWith('/tables/');
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

  toggleNavGroup(group: NavGroupKey) {
    const signalMap = {
      operations: this.operationsOpen,
      planning: this.planningOpen,
      catalog: this.catalogOpen,
      admin: this.adminOpen,
    } as const;
    signalMap[group].update(v => !v);
  }

  toggleInventory(event: Event) {
    event.stopPropagation();
    this.inventoryOpen.update(v => !v);
  }

  logout() {
    this.api.logout().subscribe(() => this.router.navigate(['/']));
  }
}
