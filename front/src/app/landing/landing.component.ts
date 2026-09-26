import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiService, PublicTableLookupChoice } from '../services/api.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  menuOpen = signal(false);
  tableCode = '';
  tableLookupLoading = signal(false);
  tableLookupError = signal<string | null>(null);
  tableLookupChoices = signal<PublicTableLookupChoice[]>([]);

  constructor() {
    this.api.waitForInitialAuthCheck().subscribe(() => {
      const user = this.api.getCurrentUser();
      if (!user) return;
      if (user.role === 'courier') void this.router.navigate(['/courier']);
      else if (user.provider_id != null) void this.router.navigate(['/provider']);
      else void this.router.navigate(['/dashboard']);
    });
  }

  onTableCodeInput(): void {
    this.tableLookupError.set(null);
    this.tableLookupChoices.set([]);
  }

  goToTableMenu(): void {
    const code = this.tableCode.trim();
    if (!code || this.tableLookupLoading()) return;
    this.tableLookupError.set(null);
    this.tableLookupChoices.set([]);
    this.tableLookupLoading.set(true);
    this.api.lookupPublicTable(code).subscribe({
      next: (result) => {
        this.tableLookupLoading.set(false);
        if (result.table_token) { void this.router.navigate(['/menu', result.table_token]); return; }
        if (result.ambiguous && result.choices?.length) { this.tableLookupChoices.set(result.choices); return; }
        this.tableLookupError.set(this.translate.instant('LANDING.TABLE_LOOKUP_FAILED'));
      },
      error: (err) => {
        this.tableLookupLoading.set(false);
        this.tableLookupError.set(this.translate.instant(err?.status === 404 ? 'LANDING.TABLE_NOT_FOUND' : 'LANDING.TABLE_LOOKUP_FAILED'));
      },
    });
  }

  selectRestaurantForTable(choice: PublicTableLookupChoice): void {
    this.tableLookupChoices.set([]);
    this.tableLookupError.set(null);
    void this.router.navigate(['/menu', choice.table_token]);
  }
}
