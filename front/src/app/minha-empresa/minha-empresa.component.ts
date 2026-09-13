import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, TenantSettings } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';

@Component({
  selector: 'app-minha-empresa',
  standalone: true,
  imports: [SidebarComponent, RouterLink],
  template: `
    <app-sidebar>
      <main class="company-page">
        <header class="page-header">
          <div>
            <p class="eyebrow">Gestão do estabelecimento</p>
            <h1>Minha empresa</h1>
            <p class="subtitle">Confira os principais dados do restaurante usados na operação e nos canais públicos.</p>
          </div>
          <a routerLink="/settings" class="primary-action">Editar configurações</a>
        </header>

        @if (loading()) {
          <section class="state-card">Carregando dados do estabelecimento…</section>
        } @else if (error()) {
          <section class="state-card state-card--error">{{ error() }}</section>
        } @else if (settings(); as company) {
          <section class="hero-card">
            <div>
              <span class="hero-label">Estabelecimento</span>
              <h2>{{ company.name || 'Restaurante sem nome configurado' }}</h2>
              <p>{{ company.description || 'Adicione uma descrição nas configurações para apresentar melhor o restaurante.' }}</p>
            </div>
            <span class="business-type">{{ company.business_type || 'Food service' }}</span>
          </section>

          <div class="info-grid">
            <section class="info-card">
              <h3>Contato</h3>
              <dl>
                <div><dt>Telefone</dt><dd>{{ company.phone || 'Não informado' }}</dd></div>
                <div><dt>WhatsApp</dt><dd>{{ company.whatsapp || 'Não informado' }}</dd></div>
                <div><dt>E-mail</dt><dd>{{ company.email || 'Não informado' }}</dd></div>
                <div><dt>Site</dt><dd>{{ company.website || 'Não informado' }}</dd></div>
              </dl>
            </section>

            <section class="info-card">
              <h3>Localização</h3>
              <dl>
                <div><dt>Endereço</dt><dd>{{ company.address || 'Não informado' }}</dd></div>
                <div><dt>País</dt><dd>{{ company.country_code || 'Não informado' }}</dd></div>
                <div><dt>Fuso horário</dt><dd>{{ company.timezone || 'Não informado' }}</dd></div>
              </dl>
            </section>

            <section class="info-card">
              <h3>Operação</h3>
              <dl>
                <div><dt>Moeda</dt><dd>{{ company.currency_code || 'BRL' }}</dd></div>
                <div><dt>Tipo de negócio</dt><dd>{{ company.business_type || 'Não informado' }}</dd></div>
                <div><dt>Horários</dt><dd>{{ company.opening_hours ? 'Configurados' : 'Não configurados' }}</dd></div>
              </dl>
            </section>
          </div>

          <section class="next-step">
            <div>
              <h3>Precisa alterar esses dados?</h3>
              <p>Use Configurações para editar perfil do negócio, contato, horários, pagamentos e demais parâmetros administrativos.</p>
            </div>
            <a routerLink="/settings" class="secondary-action">Abrir configurações</a>
          </section>
        }
      </main>
    </app-sidebar>
  `,
  styles: [`
    .company-page { max-width: 1120px; margin: 0 auto; padding: 1.5rem; color: #2F3453; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.5rem; }
    .eyebrow { margin: 0 0 .35rem; color: #374B89; font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(1.8rem, 4vw, 2.35rem); }
    .subtitle { max-width: 680px; margin: .5rem 0 0; color: #6F7895; line-height: 1.55; }
    .primary-action, .secondary-action { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: .7rem 1rem; border-radius: 10px; font-weight: 800; text-decoration: none; }
    .primary-action { background: #374B89; color: #fff; }
    .primary-action:hover { background: #2F3453; }
    .secondary-action { border: 1px solid #374B89; color: #374B89; background: #fff; }
    .hero-card, .info-card, .state-card, .next-step { border: 1px solid rgba(47, 52, 83, .13); border-radius: 16px; background: #fff; box-shadow: 0 8px 24px rgba(47, 52, 83, .05); }
    .hero-card { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.25rem; padding: 1.5rem; border-top: 4px solid #D6A92F; }
    .hero-label { color: #6F7895; font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
    .hero-card h2 { margin: .35rem 0 .5rem; font-size: 1.45rem; }
    .hero-card p { max-width: 700px; margin: 0; color: #6F7895; line-height: 1.5; }
    .business-type { padding: .4rem .7rem; border-radius: 999px; background: rgba(55, 75, 137, .1); color: #374B89; font-size: .8rem; font-weight: 800; white-space: nowrap; }
    .info-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-top: 1rem; }
    .info-card { padding: 1.25rem; }
    .info-card h3, .next-step h3 { margin: 0 0 1rem; }
    dl { display: grid; gap: .85rem; margin: 0; }
    dl div { display: grid; gap: .18rem; }
    dt { color: #6F7895; font-size: .78rem; font-weight: 700; }
    dd { margin: 0; overflow-wrap: anywhere; font-weight: 650; }
    .next-step { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1rem; padding: 1.25rem; background: #F7F5EF; }
    .next-step p { margin: 0; color: #6F7895; line-height: 1.5; }
    .state-card { padding: 1.5rem; }
    .state-card--error { border-color: rgba(160, 40, 40, .25); color: #8f2f2f; }
    @media (max-width: 820px) { .info-grid { grid-template-columns: 1fr; } }
    @media (max-width: 640px) {
      .company-page { padding: 1rem; }
      .page-header, .hero-card, .next-step { flex-direction: column; }
      .primary-action, .secondary-action { width: 100%; box-sizing: border-box; }
      .business-type { white-space: normal; }
    }
  `]
})
export class MinhaEmpresaComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly settings = signal<TenantSettings | null>(null);

  ngOnInit(): void {
    this.api.getTenantSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar os dados do estabelecimento.');
        this.loading.set(false);
      },
    });
  }
}
