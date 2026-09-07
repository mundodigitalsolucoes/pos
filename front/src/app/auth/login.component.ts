import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ApiService, type TenantSummary } from '../services/api.service';
import { ApiErrorMessageService } from '../services/api-error-message.service';
import { LegalLinksComponent } from '../shared/legal-links.component';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number;
              locale?: string;
            },
          ) => void;
        };
      };
    };
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink, TranslateModule, LegalLinksComponent],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-header">
          <h1>{{ 'AUTH.WELCOME_BACK' | translate }}</h1>
          <p>{{ 'AUTH.SIGN_IN_ACCOUNT' | translate }}</p>
        </div>

        @if (selectedTenant()) {
          <div class="tenant-context" data-testid="login-tenant-context">
            @if (selectedTenantLogoUrl()) {
              <img [src]="selectedTenantLogoUrl()!" [alt]="selectedTenant()!.name" class="tenant-context-logo" />
            }
            <div class="tenant-context-copy">
              <span>{{ 'AUTH.LOGGING_INTO' | translate }}</span>
              <strong>{{ selectedTenant()!.name }}</strong>
            </div>
            <a routerLink="/">{{ 'AUTH.CHANGE_RESTAURANT' | translate }}</a>
          </div>
        }

        @if (showOtpStep()) {
          <p class="otp-prompt">{{ 'AUTH.OTP_ENTER_CODE' | translate }}</p>
          <form (ngSubmit)="onSubmitOtp()">
            <div class="form-group">
              <label for="otp-code">{{ 'AUTH.OTP_CODE' | translate }}</label>
              <input id="otp-code" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" [(ngModel)]="otpCode" name="otpCode" [placeholder]="'AUTH.OTP_CODE_PLACEHOLDER' | translate" autocomplete="one-time-code">
            </div>
            @if (error()) { <div class="error-banner">{{ error() }}</div> }
            <button type="submit" class="btn-submit" [disabled]="!otpCode || otpCode.length !== 6 || loading()">{{ loading() ? ('AUTH.VERIFYING' | translate) : ('AUTH.VERIFY_OTP' | translate) }}</button>
            <button type="button" class="btn-back" (click)="backToPassword()">{{ 'AUTH.BACK' | translate }}</button>
          </form>
        } @else {
          @if (googleEnabled()) {
            <div class="google-auth-wrap">
              <div id="google-login-button" class="google-button"></div>
            </div>
            <div class="auth-divider"><span>ou</span></div>
          }

          @if (googleLinkRequired()) {
            <div class="google-link-required">
              <strong>Confirme sua conta uma vez</strong>
              <span>Já existe uma conta MDS Food com este e-mail. Entre com sua senha abaixo para vinculá-la ao Google com segurança.</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="email">{{ 'AUTH.EMAIL' | translate }}</label>
              <input id="email" type="email" name="username" formControlName="username" [placeholder]="translate.instant('AUTH.EMAIL_PLACEHOLDER')" autocomplete="email" [readonly]="googleLinkRequired()">
              @if (form.get('username')?.touched && form.get('username')?.invalid) { <div class="field-error">{{ 'AUTH.INVALID_EMAIL' | translate }}</div> }
            </div>

            <div class="form-group">
              <label for="password">{{ 'AUTH.PASSWORD' | translate }}</label>
              <div class="input-with-toggle">
                <input id="password" [type]="showPassword() ? 'text' : 'password'" name="password" formControlName="password" [placeholder]="translate.instant('AUTH.PASSWORD_PLACEHOLDER')" autocomplete="current-password">
                <button type="button" class="pw-toggle" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? ('AUTH.HIDE_PASSWORD' | translate) : ('AUTH.SHOW_PASSWORD' | translate)" tabindex="-1">{{ showPassword() ? 'Ocultar' : 'Mostrar' }}</button>
              </div>
              <div class="forgot-row"><a routerLink="/forgot-password" [queryParams]="forgotPasswordQueryParams">{{ 'AUTH.FORGOT_PASSWORD' | translate }}</a></div>
            </div>

            @if (error()) { <div class="error-banner">{{ error() }}</div> }

            <button type="submit" class="btn-submit" [disabled]="loading()">{{ loading() ? ('AUTH.SIGNING_IN' | translate) : (googleLinkRequired() ? 'Entrar e vincular Google' : ('AUTH.SIGN_IN' | translate)) }}</button>
          </form>
        }

        <div class="auth-actions-foot">
          <span>{{ 'AUTH.DONT_HAVE_ACCOUNT' | translate }}</span>
          <a routerLink="/register">Cadastre seu restaurante</a>
          @if (legalTermsUrl() || legalPrivacyUrl()) {
            <span class="auth-foot-sep" aria-hidden="true">·</span>
            <app-legal-links [inline]="true" [termsUrl]="legalTermsUrl()" [privacyUrl]="legalPrivacyUrl()" />
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:var(--space-5); background:var(--color-bg); }
    .auth-card { width:100%; max-width:420px; background:var(--color-surface); border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); padding:var(--space-8); }
    .auth-header { margin-bottom:var(--space-6); text-align:center; }
    .auth-header h1 { font-size:1.75rem; font-weight:600; color:var(--color-text); margin-bottom:var(--space-2); }
    .auth-header p { color:var(--color-text-muted); font-size:.9375rem; }
    .google-auth-wrap { display:flex; justify-content:center; min-height:44px; }
    .google-button { width:100%; display:flex; justify-content:center; }
    .auth-divider { display:flex; align-items:center; gap:12px; color:var(--color-text-muted); font-size:.8125rem; margin:var(--space-4) 0; }
    .auth-divider::before,.auth-divider::after { content:''; flex:1; height:1px; background:var(--color-border); }
    .google-link-required { display:flex; flex-direction:column; gap:.25rem; margin-bottom:var(--space-4); padding:var(--space-3) var(--space-4); border:1px solid var(--color-border); border-radius:var(--radius-md); background:var(--color-bg); }
    .google-link-required strong { color:var(--color-text); font-size:.9375rem; }
    .google-link-required span { color:var(--color-text-muted); font-size:.8125rem; line-height:1.45; }
    .form-group { margin-bottom:var(--space-4); }
    .form-group label { display:block; margin-bottom:var(--space-2); font-weight:500; }
    .form-group input { width:100%; padding:var(--space-3); border:1px solid var(--color-border); border-radius:var(--radius-md); font-size:1rem; }
    .form-group input[readonly] { background:var(--color-bg); color:var(--color-text-muted); }
    .input-with-toggle { position:relative; display:flex; }
    .input-with-toggle input { flex:1; padding-right:5rem; }
    .pw-toggle { position:absolute; right:var(--space-2); top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--color-text-muted); font-size:.75rem; }
    .forgot-row { margin-top:var(--space-2); text-align:right; }
    .forgot-row a { font-size:.875rem; color:var(--color-primary); text-decoration:none; }
    .tenant-context { display:flex; align-items:center; gap:var(--space-3); padding:var(--space-3); margin-bottom:var(--space-5); background:var(--color-bg); border:1px solid var(--color-border); border-radius:var(--radius-md); }
    .tenant-context-logo { width:2.5rem; height:2.5rem; border-radius:var(--radius-md); object-fit:contain; background:var(--color-surface); border:1px solid var(--color-border); }
    .tenant-context-copy { min-width:0; flex:1; }
    .tenant-context-copy span { display:block; color:var(--color-text-muted); font-size:.8125rem; }
    .tenant-context-copy strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .tenant-context a { color:var(--color-primary); font-size:.8125rem; text-decoration:none; white-space:nowrap; }
    .error-banner { background:rgba(220,38,38,.1); color:var(--color-error); padding:var(--space-3) var(--space-4); border-radius:var(--radius-md); font-size:.875rem; margin-bottom:var(--space-4); }
    .btn-submit { width:100%; padding:var(--space-4); background:var(--color-primary); color:white; border:none; border-radius:var(--radius-md); font-size:1rem; font-weight:500; cursor:pointer; }
    .btn-submit:disabled { opacity:.6; cursor:not-allowed; }
    .btn-back { width:100%; margin-top:var(--space-3); padding:var(--space-3); background:transparent; color:var(--color-text-muted); border:1px solid var(--color-border); border-radius:var(--radius-md); cursor:pointer; }
    .auth-actions-foot { margin-top:var(--space-5); text-align:center; font-size:.9375rem; color:var(--color-text-muted); line-height:1.6; display:flex; flex-wrap:wrap; justify-content:center; align-items:baseline; row-gap:var(--space-2); }
    .auth-actions-foot>a { color:var(--color-primary); font-weight:500; margin-left:var(--space-2); text-decoration:none; }
    .auth-foot-sep { margin:0 var(--space-2); }
    .otp-prompt { color:var(--color-text-muted); font-size:.9375rem; margin-bottom:var(--space-4); }
    .field-error { margin-top:var(--space-2); color:var(--color-error); font-size:.8125rem; }
  `]
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  translate = inject(TranslateService);
  private apiErr = inject(ApiErrorMessageService);

  legalTermsUrl = signal<string | null>(null);
  legalPrivacyUrl = signal<string | null>(null);
  selectedTenant = signal<TenantSummary | null>(null);
  selectedTenantLogoUrl = signal<string | null>(null);
  googleEnabled = signal(false);
  googleLinkRequired = signal(false);
  private googleClientId = '';
  private pendingGoogleCredential: string | null = null;

  error = signal<string>('');
  loading = signal(false);
  showOtpStep = signal(false);
  otpTempToken = signal<string | null>(null);
  otpCode = '';
  showPassword = signal(false);

  form = this.fb.group({ username: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });

  ngOnInit(): void {
    this.api.getPublicLegalUrls().subscribe({ next:(u)=>{ this.legalTermsUrl.set(u.terms_of_service_url ?? null); this.legalPrivacyUrl.set(u.privacy_policy_url ?? null); }, error:()=>{} });
    this.loadSelectedTenant();
    this.api.getGoogleAuthConfig().subscribe({
      next: (cfg) => {
        this.googleEnabled.set(!!cfg.enabled && !!cfg.client_id);
        this.googleClientId = cfg.client_id || '';
        if (this.googleEnabled()) this.loadGoogleIdentityScript();
      },
      error: () => this.googleEnabled.set(false),
    });
  }

  get forgotPasswordQueryParams(): Record<string, string> {
    const t = this.route.snapshot.queryParamMap.get('tenant');
    return t ? { tenant: t } : {};
  }

  private loadSelectedTenant(): void {
    const tenantParam = this.route.snapshot.queryParamMap.get('tenant');
    const tenantId = tenantParam != null ? Number.parseInt(tenantParam, 10) : NaN;
    if (!Number.isInteger(tenantId) || tenantId <= 0) return;
    this.api.getPublicTenant(tenantId).subscribe({
      next: (tenant) => { this.selectedTenant.set(tenant); this.selectedTenantLogoUrl.set(this.api.getTenantLogoUrl(tenant.logo_filename, tenant.id)); },
      error: () => { this.selectedTenant.set(null); this.selectedTenantLogoUrl.set(null); },
    });
  }

  private loadGoogleIdentityScript(): void {
    const ready = () => setTimeout(() => this.renderGoogleButton(), 0);
    if (window.google?.accounts?.id) { ready(); return; }
    const existing = document.querySelector('script[data-mds-google-identity]') as HTMLScriptElement | null;
    if (existing) { existing.addEventListener('load', ready, { once: true }); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset['mdsGoogleIdentity'] = 'true';
    script.onload = ready;
    document.head.appendChild(script);
  }

  private renderGoogleButton(): void {
    const host = document.getElementById('google-login-button');
    if (!host || !window.google?.accounts?.id || !this.googleClientId) return;
    host.innerHTML = '';
    window.google.accounts.id.initialize({ client_id: this.googleClientId, callback: (r) => this.handleGoogleCredential(r.credential) });
    window.google.accounts.id.renderButton(host, { theme:'outline', size:'large', shape:'rectangular', text:'continue_with', width:340, locale:'pt-BR' });
  }

  private handleGoogleCredential(credential?: string): void {
    if (!credential) return;
    this.error.set('');
    this.loading.set(true);
    this.api.loginWithGoogle(credential).subscribe({
      next: () => this.finishAuthenticatedLogin(),
      error: (err) => {
        this.loading.set(false);
        if (err.status === 404 && err.error?.status === 'signup_required') {
          void this.router.navigate(['/register'], {
            queryParams: {
              google: '1',
              google_email: err.error?.email ?? '',
              google_name: err.error?.full_name ?? '',
            },
          });
          return;
        }
        const detail = err.error?.detail;
        if (err.status === 409 && detail?.code === 'google_link_required') {
          this.pendingGoogleCredential = credential;
          this.googleLinkRequired.set(true);
          this.form.patchValue({ username: detail?.email ?? err.error?.email ?? '' }, { emitEvent: false });
          this.error.set('');
          return;
        }
        if (err.status === 403 && err.error?.require_otp && err.error?.temp_token) {
          this.otpTempToken.set(err.error.temp_token);
          this.showOtpStep.set(true);
          this.error.set('');
          return;
        }
        this.error.set(this.apiErr.fromHttpError(err, 'AUTH.LOGIN_FAILED'));
      },
    });
  }

  private finishAuthenticatedLogin(): void {
    this.api.checkAuth().subscribe(user => {
      if (user?.tenant_id != null) {
        this.api.getSaasSubscription().subscribe({
          next: (sub) => { this.loading.set(false); void this.router.navigate([sub.enabled && !sub.has_access ? '/paywall' : '/dashboard']); },
          error: () => { this.loading.set(false); void this.router.navigate(['/dashboard']); },
        });
      } else {
        this.loading.set(false);
        void this.router.navigate(['/dashboard']);
      }
    });
  }

  private linkPendingGoogleThenFinish(): void {
    const credential = this.pendingGoogleCredential;
    if (!credential) {
      this.finishAuthenticatedLogin();
      return;
    }
    this.api.linkGoogleAccount(credential).subscribe({
      next: () => {
        this.pendingGoogleCredential = null;
        this.googleLinkRequired.set(false);
        this.finishAuthenticatedLogin();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.apiErr.fromHttpError(err, 'AUTH.LOGIN_FAILED'));
      },
    });
  }

  private syncLoginFieldsFromDom(): void {
    const emailEl = document.getElementById('email') as HTMLInputElement | null;
    const passwordEl = document.getElementById('password') as HTMLInputElement | null;
    this.form.patchValue({ username: emailEl?.value ?? this.form.get('username')?.value ?? '', password: passwordEl?.value ?? this.form.get('password')?.value ?? '' }, { emitEvent:false });
  }

  onSubmit(): void {
    this.syncLoginFieldsFromDom();
    this.form.updateValueAndValidity({ emitEvent:false });
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error.set(''); this.loading.set(true);
    const username = this.form.get('username')?.value ?? '';
    const password = this.form.get('password')?.value ?? '';
    const tenantId = this.route.snapshot.queryParams['tenant'];
    const id = tenantId != null ? parseInt(tenantId, 10) : undefined;
    this.api.login(username, password, isNaN(id as number) ? undefined : id).subscribe({
      next: () => this.linkPendingGoogleThenFinish(),
      error: (err) => {
        this.loading.set(false);
        if (err.status === 403 && err.error?.require_otp && err.error?.temp_token) { this.otpTempToken.set(err.error.temp_token); this.showOtpStep.set(true); this.error.set(''); }
        else if (err.status === 429) this.error.set(this.apiErr.fromHttpError(err, 'AUTH.LOGIN_RATE_LIMITED'));
        else this.error.set(this.apiErr.fromHttpError(err, 'AUTH.LOGIN_FAILED'));
      },
    });
  }

  onSubmitOtp(): void {
    const token = this.otpTempToken();
    if (!token || !this.otpCode || this.otpCode.length !== 6) return;
    this.error.set(''); this.loading.set(true);
    this.api.loginWithOtp(token, this.otpCode).subscribe({ next: () => this.linkPendingGoogleThenFinish(), error: (err) => { this.loading.set(false); this.error.set(this.apiErr.fromHttpError(err, 'API_ERRORS.INVALID_OTP_CODE')); } });
  }

  backToPassword(): void {
    this.showOtpStep.set(false); this.otpTempToken.set(null); this.otpCode=''; this.error.set('');
    if (this.googleEnabled()) setTimeout(() => this.renderGoogleButton(), 0);
  }
}