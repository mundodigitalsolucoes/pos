import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-landing-site-footer',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  template: `
    <footer class="landing-site-footer">
      <section class="landing-site-footer__cta" aria-labelledby="landing-bottom-cta-heading">
        <h2 id="landing-bottom-cta-heading" class="landing-site-footer__cta-title">{{ 'LANDING.BOTTOM_CTA_TITLE' | translate }}</h2>
        <p class="landing-site-footer__cta-text">{{ 'LANDING.BOTTOM_CTA_TEXT' | translate }}</p>
        <a routerLink="/register" class="landing-btn landing-btn--primary landing-btn--large">{{ 'LANDING.CTA_CREATE_QR_MENU' | translate }}</a>
      </section>

      <div class="landing-footer">
        <nav class="landing-footer__nav" aria-label="Footer">
          <div class="landing-footer__group">
            <span class="landing-footer__group-label">{{ 'LANDING.FOOTER_ACCOUNT' | translate }}</span>
            <a routerLink="/register">{{ 'AUTH.CREATE_ACCOUNT' | translate }}</a>
            <a routerLink="/login">{{ 'LANDING.LOGIN' | translate }}</a>
            <a routerLink="/pricing">{{ 'LANDING.NAV_PRICING' | translate }}</a>
            <a routerLink="/features">{{ 'LANDING.NAV_FEATURES' | translate }}</a>
          </div>
          <div class="landing-footer__group">
            <span class="landing-footer__group-label">{{ 'LANDING.FOOTER_PARTNERS' | translate }}</span>
            <a routerLink="/provider/login">{{ 'LANDING.PROVIDER_LOGIN' | translate }}</a>
            <a routerLink="/provider/register">{{ 'LANDING.REGISTER_AS_PROVIDER' | translate }}</a>
            <a routerLink="/courier/login">{{ 'LANDING.COURIER_LOGIN' | translate }}</a>
          </div>
          <div class="landing-footer__group">
            <span class="landing-footer__group-label">{{ 'LANDING.FOOTER_SUPPORT' | translate }}</span>
            <a routerLink="/about">{{ 'LANDING.NAV_ABOUT' | translate }}</a>
            <a routerLink="/manual-usuario">{{ 'LANDING.USER_MANUAL' | translate }}</a>
            <a href="mailto:contato@mundodigitalsolucoes.com.br">{{ 'LANDING.CONTACT_US' | translate }}</a>
            <a href="https://wa.me/5517992822597" target="_blank" rel="noopener noreferrer">WhatsApp: (17) 99282-2597</a>
            <a routerLink="/terms">{{ 'LEGAL.TERMS_OF_SERVICE' | translate }}</a>
            <a routerLink="/privacy">{{ 'LEGAL.PRIVACY_POLICY' | translate }}</a>
          </div>
        </nav>
      </div>

      <div class="landing-version-bar">
        <img src="/logo-mds-food-negativa.png" alt="MDS Food — Soluções para seu restaurante" class="landing-footer-logo" />
        <p class="landing-version-company">Mundo Digital Soluções · CNPJ 58.694.408/0001-90</p>
        <p class="landing-version-contact">
          <a href="https://wa.me/5517992822597" target="_blank" rel="noopener noreferrer">WhatsApp (17) 99282-2597</a>
          <span aria-hidden="true"> · </span>
          <a href="mailto:contato@mundodigitalsolucoes.com.br">contato@mundodigitalsolucoes.com.br</a>
        </p>
      </div>
    </footer>
  `,
  styles: [`
    :host { --landing-border: rgba(255,255,255,.12); --landing-text:#fff; --landing-muted:rgba(255,255,255,.7); --gold:#d6a92f; --gold-hover:#c19620; display:block; }
    .landing-site-footer { position:relative; z-index:2; border-top:1px solid var(--landing-border); background:linear-gradient(180deg,#2f3453 0%,#252a46 100%); }
    .landing-site-footer__cta { max-width:72rem; margin:0 auto; padding:var(--space-8) var(--space-5) var(--space-6); text-align:center; }
    .landing-site-footer__cta-title { margin:0 0 var(--space-3); font-size:clamp(1.5rem,4vw,2rem); color:#fff; }
    .landing-site-footer__cta-text { margin:0 auto var(--space-6); max-width:32rem; color:var(--landing-muted); line-height:1.55; }
    .landing-btn { display:inline-flex; align-items:center; justify-content:center; padding:.875rem 1.375rem; border-radius:999px; font-size:.9375rem; font-weight:800; text-decoration:none; }
    .landing-btn--primary { background:var(--gold); color:#fff; box-shadow:0 12px 34px rgba(214,169,47,.24); }
    .landing-btn--primary:hover { background:var(--gold-hover); text-decoration:none; }
    .landing-btn--large { padding:1rem 1.75rem; font-size:1rem; }
    .landing-footer { max-width:72rem; margin:0 auto; padding:var(--space-6) var(--space-5); border-top:1px solid var(--landing-border); }
    .landing-footer__nav { display:grid; grid-template-columns:1fr; gap:var(--space-6); }
    @media(min-width:720px){ .landing-footer__nav{grid-template-columns:repeat(3,1fr)} }
    .landing-footer__group { display:flex; flex-direction:column; align-items:flex-start; gap:var(--space-2); }
    .landing-footer__group-label { font-size:.6875rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--landing-muted); }
    .landing-footer a,.landing-version-contact a { color:rgba(255,255,255,.92); font-size:.875rem; font-weight:500; text-decoration:none; }
    .landing-footer a:hover,.landing-version-contact a:hover { color:#fff; }
    .landing-version-bar { max-width:72rem; margin:0 auto; padding:var(--space-5) var(--space-5) var(--space-6); border-top:1px solid var(--landing-border); font-size:.6875rem; color:var(--landing-muted); text-align:center; display:flex; flex-direction:column; align-items:center; gap:var(--space-2); }
    .landing-footer-logo { display:block; width:min(240px,62vw); height:auto; margin-bottom:var(--space-2); opacity:.98; }
    .landing-version-company,.landing-version-contact { margin:0; max-width:42rem; line-height:1.45; }
    .landing-version-company { font-size:.75rem; color:rgba(255,255,255,.9); }
    .landing-version-contact { font-size:.6875rem; }
  `],
})
export class LandingSiteFooterComponent {}
