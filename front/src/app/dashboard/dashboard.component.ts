import { Component, inject, computed, signal, HostListener } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SidebarComponent } from '../shared/sidebar.component';
import { SalesOverviewComponent } from './sales-overview.component';
import { TranslateModule } from '@ngx-translate/core';
import { PermissionService } from '../services/permission.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SidebarComponent, TranslateModule, SalesOverviewComponent],
  template: `
    <app-sidebar>
        <div class="page-header">
          <h1>Desempenho</h1>
        </div>

        @if (canShowAdminSections()) { <app-sales-overview /> }

        @if (!canShowAdminSections()) {
          <p class="restricted-note">Os indicadores de desempenho estão disponíveis para a administração.</p>
        }
        <div class="analysis-links"><button type="button" (click)="openChangelog()">Novidades</button></div>

        @if (showChangelogModal()) {
          <div class="changelog-overlay" (click)="closeChangelog()" role="button" tabindex="0" data-testid="changelog-overlay">
            <div class="changelog-modal" (click)="$event.stopPropagation()" role="dialog" aria-labelledby="changelog-title">
              <div class="changelog-header">
                <h2 id="changelog-title" class="changelog-title">{{ 'DASHBOARD.CHANGELOG_TITLE' | translate }}</h2>
                <button type="button" class="changelog-close" (click)="closeChangelog()" [attr.aria-label]="'COMMON.CLOSE' | translate">{{ 'COMMON.CLOSE' | translate }}</button>
              </div>
              <div class="changelog-body">
                @if (changelogLoading()) {
                  <p class="changelog-loading">{{ 'DASHBOARD.CHANGELOG_LOADING' | translate }}</p>
                } @else if (changelogError()) {
                  <p class="changelog-error">{{ changelogError() }}</p>
                } @else if (changelogHtml()) {
                  <div class="changelog-content" [innerHTML]="changelogHtml()"></div>
                }
              </div>
            </div>
          </div>
        }
    </app-sidebar>
  `,
  styles: [`
    .page-header {
      margin-bottom: var(--space-6);

      h1 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-text);
      }
    }

    .analysis-links { display: flex; gap: 16px; align-items: center; margin-top: 20px; flex-wrap: wrap; }
    .analysis-links a, .analysis-links button { color: #374B89; font-weight: 700; font: inherit; background: none; border: 0; cursor: pointer; padding: 0; }
    .restricted-note { color: var(--color-text-muted); }

    .changelog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--space-4);
    }

    .changelog-modal {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-lg);
      max-width: 42rem;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
    }

    .changelog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
    }

    .changelog-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
      color: var(--color-text);
    }

    .changelog-close {
      padding: var(--space-2) var(--space-3);
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .changelog-close:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .changelog-body {
      padding: var(--space-5);
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }

    .changelog-loading,
    .changelog-error {
      color: var(--color-text-muted);
      margin: 0;
    }

    .changelog-error {
      color: var(--color-error, #b91c1c);
    }

    .changelog-content {
      font-size: 0.9375rem;
      line-height: 1.6;
      color: var(--color-text);
    }

    .changelog-content ::ng-deep h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: var(--space-6) 0 var(--space-2);
      color: var(--color-primary);
    }

    .changelog-content ::ng-deep h2:first-child {
      margin-top: 0;
    }

    .changelog-content ::ng-deep h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: var(--space-4) 0 var(--space-2);
      color: var(--color-text);
    }

    .changelog-content ::ng-deep ul {
      margin: 0 0 var(--space-3);
      padding-left: 1.5rem;
    }

    .changelog-content ::ng-deep li {
      margin-bottom: var(--space-1);
    }

    .changelog-content ::ng-deep strong {
      font-weight: 600;
    }

    .changelog-content ::ng-deep a {
      color: var(--color-primary);
      text-decoration: none;
    }

    .changelog-content ::ng-deep a:hover {
      text-decoration: underline;
    }

    .changelog-content ::ng-deep p {
      margin: 0 0 var(--space-2);
    }
  `]
})
export class DashboardComponent {
  private permissions = inject(PermissionService);
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  user = signal(this.api.getCurrentUser());
  canShowAdminSections = computed(() => this.permissions.isAdmin(this.user()));
  showChangelogModal = signal(false);
  changelogHtml = signal<SafeHtml | null>(null);
  changelogLoading = signal(false);
  changelogError = signal<string | null>(null);

  openChangelog() {
    this.showChangelogModal.set(true);
    this.changelogError.set(null);
    if (this.changelogHtml()) {
      return;
    }
    this.changelogLoading.set(true);
    this.api.getChangelog().subscribe({
      next: (text) => {
        this.changelogLoading.set(false);
        this.changelogHtml.set(this.sanitizer.bypassSecurityTrustHtml(this.markdownToHtml(text)));
      },
      error: (err) => {
        this.changelogLoading.set(false);
        this.changelogError.set(err?.message || 'Failed to load changelog.');
      },
    });
  }

  closeChangelog() {
    this.showChangelogModal.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.showChangelogModal()) this.closeChangelog();
  }

  /** Convert changelog markdown to safe HTML (h2, h3, ul, li, strong, a). */
  private markdownToHtml(md: string): string {
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const lines = md.split(/\r?\n/);
    let out = '';
    let inList = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimEnd();
      if (/^##\s/.test(trimmed)) {
        if (inList) {
          out += '</ul>';
          inList = false;
        }
        const title = trimmed.replace(/^##\s+/, '').replace(/\*\*/g, '');
        out += '<h2>' + escape(title) + '</h2>';
      } else if (/^###\s/.test(trimmed)) {
        if (inList) {
          out += '</ul>';
          inList = false;
        }
        const title = trimmed.replace(/^###\s+/, '').replace(/\*\*/g, '');
        out += '<h3>' + escape(title) + '</h3>';
      } else if (/^-\s+/.test(trimmed)) {
        if (!inList) {
          out += '<ul>';
          inList = true;
        }
        let content = trimmed.replace(/^-\s+/, '');
        const bold: string[] = [];
        content = content.replace(/\*\*([^*]+)\*\*/g, (_, t) => {
          bold.push(t);
          return '\x01B' + (bold.length - 1) + '\x02';
        });
        const links: { t: string; u: string }[] = [];
        content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => {
          links.push({ t, u });
          return '\x01L' + (links.length - 1) + '\x02';
        });
        content = escape(content);
        content = content.replace(/\x01B(\d+)\x02/g, (_, i) => '<strong>' + escape(bold[Number(i)]) + '</strong>');
        content = content.replace(/\x01L(\d+)\x02/g, (_, i) => {
          const { t, u } = links[Number(i)];
          return '<a href="' + escape(u) + '" target="_blank" rel="noopener noreferrer">' + escape(t) + '</a>';
        });
        out += '<li>' + content + '</li>';
      } else if (trimmed === '') {
        if (inList) {
          out += '</ul>';
          inList = false;
        }
      }
    }
    if (inList) out += '</ul>';
    return out || '<p>No content.</p>';
  }
}
