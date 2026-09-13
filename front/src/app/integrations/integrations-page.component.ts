import { Component } from '@angular/core';
import { SidebarComponent } from '../shared/sidebar.component';
import { DeliveryIntegrationsSettingsComponent } from '../settings/delivery-integrations-settings.component';

@Component({
  selector: 'app-integrations-page',
  standalone: true,
  imports: [SidebarComponent, DeliveryIntegrationsSettingsComponent],
  template: `
    <app-sidebar>
      <main class="commercial-page">
        <header class="commercial-header">
          <p class="eyebrow">Canais</p>
          <h1>Integrações</h1>
          <p>Gerencie integrações de delivery e acompanhe conexões dos canais externos.</p>
        </header>
        <section class="commercial-card">
          <app-delivery-integrations-settings />
        </section>
      </main>
    </app-sidebar>
  `,
  styles: [`
    .commercial-page { max-width: 1180px; margin: 0 auto; padding: 2rem; }
    .commercial-header { margin-bottom: 1.25rem; }
    .commercial-header h1 { margin: 0; color: #2F3453; font-size: clamp(1.8rem, 4vw, 2.35rem); }
    .commercial-header p:last-child { margin: .55rem 0 0; color: #667085; }
    .eyebrow { margin: 0 0 .35rem; color: #D6A92F; font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .commercial-card { padding: 1.4rem; border: 1px solid rgba(47, 52, 83, .12); border-radius: 16px; background: #fff; box-shadow: 0 10px 28px rgba(47, 52, 83, .05); }
    @media (max-width: 720px) { .commercial-page { padding: 1rem; } .commercial-card { padding: 1rem; overflow-x: auto; } }
  `],
})
export class IntegrationsPageComponent {}
