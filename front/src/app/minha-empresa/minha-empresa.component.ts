import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, TenantSettings } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { MAX_IMAGE_UPLOAD_BYTES, MAX_IMAGE_UPLOAD_MB } from '../shared/image-upload-limits';

@Component({
  selector: 'app-minha-empresa',
  standalone: true,
  imports: [SidebarComponent, RouterLink, FormsModule],
  template: `
    <app-sidebar>
      <main class="company-page">
        <header class="page-header">
          <div>
            <p class="eyebrow">Gestão do estabelecimento</p>
            <h1>Minha empresa</h1>
            <p class="subtitle">Confira os principais dados do restaurante usados na operação e nos canais públicos.</p>
          </div>
          <a routerLink="/settings" class="secondary-action">Configurações avançadas</a>
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

          @if (message()) { <p class="save-message" role="status">{{ message() }}</p> }
          <div class="edit-grid">
            <section class="info-card">
              <h3>Identidade</h3>
              <label>Nome <input [(ngModel)]="draft.name" maxlength="160" /></label>
              <label>Descrição <textarea [(ngModel)]="draft.description" rows="3"></textarea></label>
              <div class="image-row">
                @if (company.logo_filename && company.id) { <img [src]="logoUrl(company)" alt="Logo atual do restaurante" /> }
                <div><strong>Logo</strong><input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml" (change)="uploadImage($event, 'logo')" [disabled]="saving()" />
                  @if (company.logo_filename) { <button type="button" (click)="removeImage('logo')" [disabled]="saving()">Remover logo</button> }</div>
              </div>
              <div class="image-row">
                @if (company.header_background_filename && company.id) { <img [src]="headerUrl(company)" alt="Capa atual do restaurante" /> }
                <div><strong>Capa</strong><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" (change)="uploadImage($event, 'header')" [disabled]="saving()" />
                  @if (company.header_background_filename) { <button type="button" (click)="removeImage('header')" [disabled]="saving()">Remover capa</button> }</div>
              </div>
              <small>JPG, PNG, WebP, AVIF; até {{ maxImageMb }} MB. SVG também é aceito para o logo.</small>
            </section>
            <section class="info-card">
              <h3>Contato</h3>
              <label>Telefone <input [(ngModel)]="draft.phone" /></label>
              <label>WhatsApp <input [(ngModel)]="draft.whatsapp" /></label>
              <label>E-mail <input type="email" [(ngModel)]="draft.email" /></label>
              <label>Endereço <input [(ngModel)]="draft.address" /></label>
            </section>
            <section class="info-card">
              <h3>Delivery e operação</h3>
              <label>Taxa de entrega (centavos) <input type="number" min="0" [(ngModel)]="draft.delivery_fee_cents" /></label>
              <label>Raio de entrega (metros) <input type="number" min="0" [(ngModel)]="draft.delivery_radius_meters" /></label>
              <p>Horários, pagamentos e regras adicionais podem ser ajustados em Configurações.</p>
              <a routerLink="/settings">Abrir horários e opções de operação →</a>
            </section>
          </div>
          <div class="save-bar"><button type="button" class="primary-action" (click)="save()" [disabled]="saving() || !draft.name?.trim()">{{ saving() ? 'Salvando…' : 'Salvar alterações' }}</button></div>
          @if (company.id) {
            <section class="info-card public-link"><h3>Cardápio público</h3><code>{{ publicMenuUrl(company.id) }}</code><div class="link-actions"><a [href]="'/public-menu/' + company.id" target="_blank" rel="noopener noreferrer">Ver cardápio ↗</a><button type="button" (click)="copyLink(company.id)">Copiar link</button></div></section>
          }

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
    .company-page { max-width: 1280px; margin: 0 auto; padding: 0; color: #2F3453; }
    .edit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:12px 0}.edit-grid label{display:grid;gap:4px;margin:10px 0;font-size:.77rem;font-weight:700;color:#5e667a}.edit-grid input:not([type=file]),.edit-grid textarea{width:100%;box-sizing:border-box;padding:8px;border:1px solid #d7dbe4;border-radius:5px;font:inherit}.edit-grid input[type=file]{display:block;max-width:100%;font-size:.7rem;margin-top:6px}.edit-grid small,.edit-grid p{font-size:.75rem;color:#697187}.image-row{display:flex;gap:10px;align-items:center;border-top:1px solid #edf0f4;padding:10px 0}.image-row img{width:64px;height:58px;object-fit:cover;border-radius:4px}.image-row button,.link-actions button{border:0;background:transparent;color:#374B89;cursor:pointer;font:inherit;font-size:.75rem;padding:4px 0}.save-bar{display:flex;justify-content:flex-end}.save-bar button{border:0;cursor:pointer}.public-link{margin-top:12px}.public-link code{overflow-wrap:anywhere;color:#374B89}.link-actions{display:flex;gap:16px;margin-top:10px}.link-actions a{color:#374B89;font-size:.8rem}.save-message{padding:9px;background:#eef2fa;color:#2F3453;border-radius:5px;font-size:.83rem}
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
    @media (max-width: 1050px) { .edit-grid{grid-template-columns:repeat(2,minmax(0,1fr))} }
    @media (max-width: 640px) {
      .edit-grid{grid-template-columns:1fr}
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
  readonly saving = signal(false);
  readonly message = signal('');
  readonly maxImageMb = MAX_IMAGE_UPLOAD_MB;
  draft: Partial<TenantSettings> = {};

  ngOnInit(): void {
    this.api.getTenantSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.draft = { name: settings.name, description: settings.description, phone: settings.phone, whatsapp: settings.whatsapp, email: settings.email, address: settings.address, delivery_fee_cents: settings.delivery_fee_cents, delivery_radius_meters: settings.delivery_radius_meters };
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar os dados do estabelecimento.');
        this.loading.set(false);
      },
    });
  }
  save(): void {
    if (!this.draft.name?.trim() || this.saving()) return;
    this.saving.set(true); this.message.set('');
    this.api.updateTenantSettings(this.draft).subscribe({
      next: s => { this.settings.set(s); this.saving.set(false); this.message.set('Dados do restaurante salvos.'); },
      error: () => { this.saving.set(false); this.message.set('Não foi possível salvar as alterações.'); },
    });
  }
  logoUrl(s: TenantSettings): string { return this.api.getTenantLogoUrl(s.logo_filename, s.id) || ''; }
  headerUrl(s: TenantSettings): string { return this.api.getTenantHeaderBackgroundUrl(s.header_background_filename, s.id) || ''; }
  uploadImage(event: Event, kind: 'logo' | 'header'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const allowed = kind === 'logo' ? ['image/jpeg','image/png','image/webp','image/avif','image/svg+xml'] : ['image/jpeg','image/png','image/webp','image/avif'];
    if (!allowed.includes(file.type) || file.size > MAX_IMAGE_UPLOAD_BYTES) { this.message.set(`Imagem inválida ou maior que ${MAX_IMAGE_UPLOAD_MB} MB.`); return; }
    this.saving.set(true); this.message.set('');
    const request = kind === 'logo' ? this.api.uploadTenantLogo(file) : this.api.uploadTenantHeaderBackground(file);
    request.subscribe({ next: s => { this.settings.set(s); this.saving.set(false); this.message.set('Imagem salva.'); }, error: () => { this.saving.set(false); this.message.set('Não foi possível enviar a imagem.'); } });
  }
  removeImage(kind: 'logo' | 'header'): void {
    this.saving.set(true); this.message.set('');
    const request = kind === 'logo' ? this.api.deleteTenantLogo() : this.api.deleteTenantHeaderBackground();
    request.subscribe({ next: s => { this.settings.set(s); this.saving.set(false); this.message.set('Imagem removida.'); }, error: () => { this.saving.set(false); this.message.set('Não foi possível remover a imagem.'); } });
  }
  publicMenuUrl(id: number): string { return `${window.location.origin}/public-menu/${id}`; }
  async copyLink(id: number): Promise<void> {
    try { await navigator.clipboard.writeText(this.publicMenuUrl(id)); this.message.set('Link copiado.'); }
    catch { this.message.set('Não foi possível copiar o link.'); }
  }
}
