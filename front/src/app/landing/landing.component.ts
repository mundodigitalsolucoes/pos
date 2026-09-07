import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QRCodeComponent } from 'angularx-qrcode';
import { ApiService, PublicTableLookupChoice, TenantSummary } from '../services/api.service';
import { FormsModule } from '@angular/forms';
import { LandingSiteFooterComponent } from '../shared/landing-site-footer.component';
import { ApiErrorMessageService } from '../services/api-error-message.service';

const LANDING_DEMO_TENANT_ID = 1;
const LANDING_DEMO_TABLE_NAME = 'Take Away';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, TranslateModule, FormsModule, QRCodeComponent, LandingSiteFooterComponent],
  template: `
    <div class="landing-page">
      <nav class="landing-nav" aria-label="Main">
        <a routerLink="/" class="landing-nav__brand">
          <img src="/logo-mds-food-header.png" alt="MDS Food" class="landing-nav__logo" />
        </a>
        <div class="landing-nav__links">
          <a routerLink="/features" class="landing-nav__link">{{ 'LANDING.NAV_FEATURES' | translate }}</a>
          <a routerLink="/pricing" class="landing-nav__link">{{ 'LANDING.NAV_PRICING' | translate }}</a>
          <a routerLink="/about" class="landing-nav__link">{{ 'LANDING.NAV_ABOUT' | translate }}</a>
          <a href="#guests" class="landing-nav__link">{{ 'LANDING.NAV_GUESTS' | translate }}</a>
          <a href="#demo" class="landing-nav__link">{{ 'LANDING.NAV_DEMO' | translate }}</a>
        </div>
        <div class="landing-nav__actions">
          <a routerLink="/login" class="landing-nav__login">{{ 'LANDING.LOGIN' | translate }}</a>
          <a routerLink="/register" class="landing-nav__cta">{{ 'LANDING.CTA_CREATE_QR_MENU' | translate }}</a>
        </div>
      </nav>

      <header class="landing-hero">
        <div class="landing-hero__content">
          <div class="landing-hero__copy">
            <p class="landing-badge">
              <span class="landing-badge__dot" aria-hidden="true"></span>
              {{ 'LANDING.BADGE' | translate }}
            </p>
            <h1 class="landing-hero__title">Soluções para seu restaurante vender mais.</h1>
            <p class="landing-hero__subtitle">{{ 'LANDING.SUBTITLE' | translate }}</p>
            <div class="landing-hero__actions">
              <a routerLink="/register" class="landing-btn landing-btn--gold">{{ 'LANDING.CTA_CREATE_QR_MENU' | translate }}</a>
              <a href="#demo" class="landing-btn landing-btn--blue">{{ 'LANDING.CTA_VIEW_DEMO' | translate }}</a>
            </div>
          </div>

          <div class="landing-hero__visual" aria-hidden="true">
            <div class="landing-phone">
              <div class="landing-phone__screen">
                <div class="landing-phone__header">
                  <span class="landing-phone__dot"></span><span class="landing-phone__dot"></span><span class="landing-phone__dot"></span>
                </div>
                <div class="landing-phone__menu">
                  <div class="landing-phone__line landing-phone__line--wide"></div>
                  <div class="landing-phone__line"></div>
                  <div class="landing-phone__line"></div>
                  <div class="landing-phone__line landing-phone__line--short"></div>
                </div>
                <div class="landing-phone__qr">
                  <svg viewBox="0 0 64 64" width="72" height="72" aria-hidden="true">
                    <rect width="64" height="64" fill="#fff" rx="4" />
                    <rect x="8" y="8" width="18" height="18" fill="#2f3453" />
                    <rect x="38" y="8" width="18" height="18" fill="#2f3453" />
                    <rect x="8" y="38" width="18" height="18" fill="#2f3453" />
                    <rect x="12" y="12" width="10" height="10" fill="#fff" />
                    <rect x="42" y="12" width="10" height="10" fill="#fff" />
                    <rect x="12" y="42" width="10" height="10" fill="#fff" />
                    <rect x="32" y="32" width="6" height="6" fill="#374b89" />
                    <rect x="42" y="42" width="8" height="8" fill="#374b89" />
                    <rect x="52" y="32" width="4" height="4" fill="#374b89" />
                    <rect x="32" y="48" width="4" height="4" fill="#374b89" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="features" class="landing-features">
        <div class="landing-features__header">
          <h2 class="landing-section-title">{{ 'LANDING.FEATURES_HEADING' | translate }}</h2>
          <a routerLink="/features" class="landing-features__all-link">{{ 'LANDING.FEATURES_VIEW_ALL' | translate }}</a>
        </div>
        <ul class="landing-feature-grid">
          <li class="landing-feature-card">
            <span class="landing-feature-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </span>
            <h3>{{ 'LANDING.VALUE_BOOKING' | translate }}</h3>
            <p>{{ 'LANDING.VALUE_BOOKING_DESC' | translate }}</p>
          </li>
          <li class="landing-feature-card">
            <span class="landing-feature-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h7v7h-7z"/></svg>
            </span>
            <h3>{{ 'LANDING.VALUE_DINE_IN' | translate }}</h3>
            <p>{{ 'LANDING.VALUE_DINE_IN_DESC' | translate }}</p>
          </li>
          <li class="landing-feature-card">
            <span class="landing-feature-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
            <h3>{{ 'LANDING.VALUE_STAFF' | translate }}</h3>
            <p>{{ 'LANDING.VALUE_STAFF_DESC' | translate }}</p>
          </li>
        </ul>
      </section>

      <section id="demo" class="landing-qr-demo landing-restaurants">
        @if (loading()) { <p class="loading">{{ 'COMMON.LOADING' | translate }}</p> }
        @else if (error()) { <p class="error">{{ error() }}</p> }
        @else if (tenants().length === 0) { <p class="empty">{{ 'LANDING.NO_TENANTS' | translate }}</p> }
        @else {
          @for (tenant of tenants(); track tenant.id) {
            <article class="landing-qr-demo__layout">
              <figure class="landing-qr-demo__figure">
                <a class="landing-qr-demo__qr-link" [routerLink]="['/public-menu', tenant.id]">
                  <qrcode [qrdata]="getPublicMenuUrl(tenant.id)" [width]="196" [errorCorrectionLevel]="'M'" cssClass="landing-qr-demo__code"></qrcode>
                </a>
                <figcaption class="landing-qr-demo__scan-hint">{{ 'LANDING.QR_DEMO_SCAN_HINT' | translate }}</figcaption>
              </figure>
              <div class="landing-qr-demo__content">
                <p class="landing-qr-demo__label">{{ getTenantDisplayName(tenant) }}</p>
                <h2 class="landing-qr-demo__title">{{ 'LANDING.QR_DEMO_TITLE' | translate }}</h2>
                <p class="landing-qr-demo__lede">{{ 'LANDING.QR_DEMO_LEDE' | translate }}</p>
                <ol class="landing-qr-demo__steps">
                  <li>{{ 'LANDING.QR_DEMO_STEP_1' | translate }}</li>
                  <li>{{ 'LANDING.QR_DEMO_STEP_2' | translate }}</li>
                  <li>{{ 'LANDING.QR_DEMO_STEP_3' | translate }}</li>
                </ol>
                <a [routerLink]="['/public-menu', tenant.id]" class="landing-qr-demo__action">{{ 'LANDING.QR_DEMO_OPEN_MENU' | translate }}</a>
              </div>
            </article>
          }
        }
      </section>

      <section id="guests" class="landing-guests">
        <div class="landing-guests__layout">
          <div>
            <h2 class="landing-guests__title">{{ 'LANDING.SECTION_GUESTS' | translate }}</h2>
            <p class="landing-guests__lede">{{ 'LANDING.GUEST_LEDE' | translate }}</p>
            <p class="landing-guests__demo-note">{{ 'LANDING.GUEST_DEMO_NOTE' | translate }}</p>
          </div>
          <div>
            <label class="landing-guests__label" for="landing-table-code">{{ 'LANDING.GUEST_TABLE_LABEL' | translate }}</label>
            <div class="landing-guests__row">
              <input id="landing-table-code" type="text" [(ngModel)]="tableCode" [placeholder]="'LANDING.TABLE_CODE_PLACEHOLDER' | translate" class="landing-guests__input" (ngModelChange)="onTableCodeInput()" (keyup.enter)="goToTableMenu()" />
              <button type="button" class="landing-guests__submit" [disabled]="tableLookupLoading()" (click)="goToTableMenu()">{{ 'LANDING.GO' | translate }}</button>
            </div>
            <button type="button" class="landing-guests__demo-btn" [disabled]="tableLookupLoading()" (click)="tryDemoTable()">{{ 'LANDING.GUEST_TRY_DEMO' | translate }}</button>
            @if (tableLookupError()) { <p class="landing-guests__error">{{ tableLookupError() }}</p> }
          </div>
        </div>
      </section>

      <app-landing-site-footer></app-landing-site-footer>
    </div>
  `,
  styles: [`
    .landing-page {
      --cream: #f7f5ef;
      --navy: #2f3453;
      --blue: #374b89;
      --gold: #d6a92f;
      --gold-hover: #c19620;
      --ink: #20243a;
      --muted: #667085;
      min-height: 100vh;
      background: var(--cream);
      color: var(--ink);
    }

    .landing-nav {
      display:flex; align-items:center; justify-content:space-between; gap:1.5rem;
      max-width:72rem; margin:0 auto; padding:1rem var(--space-5); background:var(--cream); flex-wrap:nowrap;
    }
    .landing-nav__brand { display:inline-flex; align-items:center; flex:0 0 auto; text-decoration:none; }
    .landing-nav__logo { width:300px; max-height:96px; height:auto; object-fit:contain; object-position:left center; }
    .landing-nav__links { display:flex; align-items:center; justify-content:center; gap:1.35rem; flex:1 1 auto; min-width:0; }
    .landing-nav__link,.landing-nav__login { color:var(--navy); font-size:.92rem; font-weight:700; text-decoration:none; white-space:nowrap; }
    .landing-nav__link:hover,.landing-nav__login:hover { color:var(--blue); text-decoration:none; }
    .landing-nav__actions { display:flex; align-items:center; gap:.65rem; flex:0 0 auto; }
    .landing-nav__login { display:inline-flex; padding:.65rem .75rem; }
    .landing-nav__cta { display:inline-flex; align-items:center; justify-content:center; padding:.72rem 1.15rem; border-radius:999px; background:var(--gold); color:#fff; border:1px solid var(--gold); font-weight:800; text-decoration:none; white-space:nowrap; }
    .landing-nav__cta:hover { background:var(--gold-hover); border-color:var(--gold-hover); text-decoration:none; }
    @media(max-width:980px){ .landing-nav{flex-wrap:wrap}.landing-nav__links{order:3;width:100%;justify-content:flex-start;overflow-x:auto}.landing-nav__logo{width:240px} }

    .landing-hero {
      background:var(--navy);
      border-top:1px solid rgba(47,52,83,.08);
      border-bottom:1px solid rgba(47,52,83,.08);
    }
    .landing-hero__content { max-width:72rem; margin:0 auto; padding:4.75rem var(--space-5) 5rem; display:grid; grid-template-columns:1fr; gap:var(--space-8); align-items:center; }
    @media(min-width:960px){ .landing-hero__content{grid-template-columns:1.08fr .92fr} }
    .landing-badge { display:inline-flex; align-items:center; gap:var(--space-2); margin:0 0 var(--space-5); padding:.45rem .85rem; border-radius:999px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); color:#fff; font-size:.8125rem; font-weight:700; }
    .landing-badge__dot { width:8px; height:8px; border-radius:50%; background:var(--gold); }
    .landing-hero__title { margin:0 0 var(--space-4); max-width:780px; font-size:clamp(2.7rem,6vw,4.9rem); line-height:.98; letter-spacing:-.045em; color:#fff; font-weight:800; }
    .landing-hero__subtitle { margin:0 0 var(--space-6); max-width:36rem; font-size:clamp(1rem,2.1vw,1.2rem); line-height:1.65; color:rgba(255,255,255,.78); }
    .landing-hero__actions { display:flex; flex-wrap:wrap; gap:var(--space-3); }
    .landing-btn { display:inline-flex; align-items:center; justify-content:center; padding:.9rem 1.4rem; border-radius:999px; font-size:.95rem; font-weight:800; text-decoration:none; transition:.15s ease; }
    .landing-btn:hover { transform:translateY(-1px); text-decoration:none; }
    .landing-btn--gold { background:var(--gold); color:#fff; box-shadow:0 12px 30px rgba(214,169,47,.24); }
    .landing-btn--gold:hover { background:var(--gold-hover); }
    .landing-btn--blue { background:var(--blue); color:#fff; box-shadow:0 12px 30px rgba(55,75,137,.2); }
    .landing-btn--blue:hover { background:#2f427b; }

    .landing-hero__visual { display:flex; justify-content:center; perspective:1200px; }
    .landing-phone { width:min(100%,300px); padding:12px; border-radius:38px; background:linear-gradient(160deg,#fff,#e8eaf4); border:1px solid rgba(255,255,255,.18); box-shadow:0 28px 70px rgba(0,0,0,.24); transform:rotateY(-10deg) rotateX(6deg); }
    .landing-phone__screen { border-radius:28px; overflow:hidden; background:linear-gradient(180deg,#202642 0%,#15192d 100%); min-height:360px; display:flex; flex-direction:column; }
    .landing-phone__header{display:flex;gap:6px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08)}
    .landing-phone__dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.28)}
    .landing-phone__menu{padding:20px 18px 12px;display:flex;flex-direction:column;gap:10px}
    .landing-phone__line{height:10px;border-radius:999px;background:rgba(255,255,255,.13);width:88%}
    .landing-phone__line--wide{width:56%;height:14px;background:var(--gold)}
    .landing-phone__line--short{width:42%}
    .landing-phone__qr{margin:auto;padding:18px;display:flex;justify-content:center}

    .landing-features,.landing-qr-demo,.landing-guests { max-width:72rem; margin:0 auto; padding:4.5rem var(--space-5); }
    .landing-features { background:#fff; max-width:none; }
    .landing-features__header,.landing-feature-grid { max-width:72rem; margin-left:auto; margin-right:auto; }
    .landing-features__header { display:flex; align-items:center; justify-content:space-between; gap:var(--space-3); margin-bottom:var(--space-6); }
    .landing-section-title { margin:0; color:var(--navy); font-size:clamp(1.6rem,3vw,2.1rem); letter-spacing:-.03em; }
    .landing-features__all-link { color:var(--blue); font-weight:700; text-decoration:none; }
    .landing-feature-grid { list-style:none; padding:0; display:grid; grid-template-columns:1fr; gap:var(--space-4); }
    @media(min-width:768px){ .landing-feature-grid{grid-template-columns:repeat(3,1fr)} }
    .landing-feature-card { padding:1.5rem; border-radius:20px; background:var(--blue); border:1px solid rgba(47,52,83,.08); box-shadow:0 12px 30px rgba(47,52,83,.12); }
    .landing-feature-card__icon { display:inline-flex; align-items:center; justify-content:center; width:46px; height:46px; margin-bottom:var(--space-4); border-radius:12px; background:rgba(214,169,47,.16); color:var(--gold); }
    .landing-feature-card h3 { margin:0 0 .5rem; color:#fff; font-size:1rem; }
    .landing-feature-card p { margin:0; color:rgba(255,255,255,.82); line-height:1.55; font-size:.9rem; }

    .landing-qr-demo { background:var(--cream); }
    .landing-qr-demo .loading,.landing-qr-demo .error,.landing-qr-demo .empty { color:var(--muted); text-align:center; }
    .landing-qr-demo__layout { display:grid; grid-template-columns:1fr; gap:var(--space-6); align-items:center; }
    @media(min-width:860px){ .landing-qr-demo__layout{grid-template-columns:minmax(220px,280px) 1fr} }
    .landing-qr-demo__figure { margin:0; display:flex; flex-direction:column; align-items:center; gap:var(--space-3); }
    .landing-qr-demo__qr-link { display:inline-flex; padding:var(--space-4); background:#fff; border-radius:20px; box-shadow:0 20px 50px rgba(47,52,83,.12); }
    .landing-qr-demo__scan-hint,.landing-qr-demo__lede,.landing-qr-demo__steps { color:var(--muted); }
    .landing-qr-demo__label { color:var(--gold); font-weight:800; text-transform:uppercase; letter-spacing:.06em; font-size:.8rem; }
    .landing-qr-demo__title { color:var(--navy); font-size:clamp(1.5rem,3vw,2rem); margin:.35rem 0 .75rem; }
    .landing-qr-demo__steps { padding-left:1.25rem; }
    .landing-qr-demo__action { display:inline-flex; margin-top:var(--space-3); padding:.75rem 1.1rem; border-radius:999px; background:var(--blue); color:#fff; font-weight:800; text-decoration:none; }

    .landing-guests { background:#fff; max-width:none; }
    .landing-guests__layout { max-width:72rem; margin:0 auto; display:grid; grid-template-columns:1fr; gap:var(--space-6); padding:2rem; border-radius:24px; background:var(--cream); border:1px solid rgba(47,52,83,.08); }
    @media(min-width:860px){ .landing-guests__layout{grid-template-columns:1fr 1fr;gap:var(--space-8);padding:2.5rem} }
    .landing-guests__title { margin:0 0 .75rem; color:var(--navy); font-size:clamp(1.4rem,3vw,1.9rem); }
    .landing-guests__lede,.landing-guests__demo-note { color:var(--muted); }
    .landing-guests__label { display:block; margin:0 0 .5rem; color:var(--navy); font-weight:800; font-size:.78rem; text-transform:uppercase; }
    .landing-guests__row { display:flex; gap:.5rem; }
    .landing-guests__input { flex:1; min-width:0; padding:.875rem 1rem; border-radius:12px; border:1px solid rgba(47,52,83,.14); background:#fff; color:var(--ink); }
    .landing-guests__input:focus { outline:none; border-color:var(--blue); box-shadow:0 0 0 3px rgba(55,75,137,.12); }
    .landing-guests__submit { padding:.875rem 1.2rem; border:none; border-radius:12px; background:var(--gold); color:#fff; font-weight:800; }
    .landing-guests__demo-btn { margin-top:.75rem; width:100%; padding:.75rem 1rem; border-radius:12px; border:1px solid var(--blue); background:var(--blue); color:#fff; font-weight:800; }
    .landing-guests__error { color:#b42318; }
  `],
})
export class LandingComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private apiErr = inject(ApiErrorMessageService);

  tenants = signal<TenantSummary[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  tableCode = '';
  tableLookupLoading = signal(false);
  tableLookupError = signal<string | null>(null);
  tableLookupChoices = signal<PublicTableLookupChoice[]>([]);

  ngOnInit(): void {
    this.api.waitForInitialAuthCheck().subscribe(() => {
      const user = this.api.getCurrentUser();
      if (user) {
        if (user.role === 'courier') void this.router.navigate(['/courier']);
        else if (user.provider_id != null) void this.router.navigate(['/provider']);
        else void this.router.navigate(['/dashboard']);
        return;
      }
      this.loadTenants();
    });
  }

  private loadTenants(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getPublicTenants().subscribe({
      next: (list) => {
        this.tenants.set(list.filter((t) => t.id === LANDING_DEMO_TENANT_ID));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.apiErr.fromHttpError(err, 'COMMON.API_REQUEST_FAILED'));
        this.loading.set(false);
      },
    });
  }

  getTenantDisplayName(_tenant: TenantSummary): string { return this.translate.instant('LANDING.RESTAURANT_DEMO_NAME'); }
  getPublicMenuUrl(tenantId: number): string { return typeof window === 'undefined' ? `/public-menu/${tenantId}` : `${window.location.origin}/public-menu/${tenantId}`; }
  tryDemoTable(): void { this.tableCode = LANDING_DEMO_TABLE_NAME; this.goToTableMenu(); }
  onTableCodeInput(): void { this.tableLookupError.set(null); if (this.tableLookupChoices().length > 0) this.tableLookupChoices.set([]); }
  goToTableMenu(): void {
    const raw = this.tableCode?.trim();
    if (!raw) return;
    this.tableLookupError.set(null); this.tableLookupChoices.set([]); this.tableLookupLoading.set(true);
    this.api.lookupPublicTable(raw).subscribe({
      next: (res) => {
        this.tableLookupLoading.set(false);
        if (res.table_token) { void this.router.navigate(['/menu', res.table_token]); return; }
        if (res.ambiguous && res.choices?.length) { this.tableLookupChoices.set(res.choices); return; }
        this.tableLookupError.set(this.translate.instant('LANDING.TABLE_LOOKUP_FAILED'));
      },
      error: (err) => {
        this.tableLookupLoading.set(false);
        this.tableLookupError.set(this.translate.instant(err?.status === 404 ? 'LANDING.TABLE_NOT_FOUND' : 'LANDING.TABLE_LOOKUP_FAILED'));
      },
    });
  }
  selectRestaurantForTable(choice: PublicTableLookupChoice): void {
    this.tableLookupChoices.set([]); this.tableLookupError.set(null); void this.router.navigate(['/menu', choice.table_token]);
  }
}
