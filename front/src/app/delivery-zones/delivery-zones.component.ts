import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService, DeliveryZone, DeliveryZoneInput } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { kmToMeters, reaisToCents } from '../minha-empresa/company-form-values';

export interface ZoneForm {
  maxKm: string; fee: string; minutes: string;
}

export function formToZone(form: ZoneForm, min: number, sortOrder: number): DeliveryZoneInput | null {
  const max = kmToMeters(form.maxKm);
  const fee = reaisToCents(form.fee);
  const minutes = Number(form.minutes);
  if (max === null || max <= min || fee === null ||
      !/^[1-9]\d*$/.test(form.minutes.trim()) || !Number.isSafeInteger(minutes)) return null;
  // The API still requires name; derive it from the authoritative range.
  const name = `${min / 1000}–${max / 1000} km`;
  return { name, min_distance_meters: min, max_distance_meters: max,
    fee_cents: fee, estimated_minutes: minutes, is_active: true, sort_order: sortOrder };
}

@Component({
  selector: 'app-delivery-zones', standalone: true,
  imports: [SidebarComponent, RouterLink, FormsModule, NgTemplateOutlet],
  templateUrl: './delivery-zones.component.html',
  styleUrl: './delivery-zones.component.scss',
})
export class DeliveryZonesComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly zones = signal<DeliveryZone[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly message = signal('');
  readonly editing = signal<number | null>(null);
  form: ZoneForm = { maxKm: '', fee: '', minutes: '30' };
  newMinMeters = 0;

  ngOnInit(): void { this.reload(); }
  reload(): void {
    this.loading.set(true); this.error.set('');
    this.api.listDeliveryZones().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: rows => this.zones.set(rows.sort((a, b) => a.min_distance_meters - b.min_distance_meters)),
      error: () => this.error.set('Não foi possível carregar as áreas. Tente novamente.'),
    });
  }
  get active(): DeliveryZone[] { return this.zones().filter(z => z.is_active); }
  get maximumKm(): string {
    const max = Math.max(0, ...this.active.map(z => z.max_distance_meters));
    return this.km(max);
  }
  get gapWarning(): boolean {
    const sorted = [...this.active].sort((a, b) => a.min_distance_meters - b.min_distance_meters);
    return sorted.length > 0 && (sorted[0].min_distance_meters > 0 ||
      sorted.some((row, index) => index > 0 && row.min_distance_meters > sorted[index - 1].max_distance_meters));
  }
  km(meters: number): string { return (meters / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 }); }
  money(cents: number): string { return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  private focusEditor(): void {
    requestAnimationFrame(() => document.getElementById('delivery-zone-max')?.focus({ preventScroll: true }));
  }
  private restoreFocus(id: number): void {
    requestAnimationFrame(() => document.getElementById(id === 0 ? 'add-zone-button' : `edit-zone-${id}`)?.focus({ preventScroll: true }));
  }
  startAdd(): void {
    if (this.busy()) return;
    this.newMinMeters = Math.max(0, ...this.active.map(z => z.max_distance_meters));
    this.form = { maxKm: this.km(this.newMinMeters + 3000), fee: '0,00', minutes: '30' };
    this.editing.set(0); this.formError.set(''); this.focusEditor();
  }
  startEdit(zone: DeliveryZone): void {
    if (this.busy()) return;
    this.form = { maxKm: this.km(zone.max_distance_meters),
      fee: (zone.fee_cents / 100).toFixed(2).replace('.', ','), minutes: String(zone.estimated_minutes) };
    this.editing.set(zone.id); this.formError.set(''); this.focusEditor();
  }
  cancel(): void {
    const id = this.editing();
    this.editing.set(null); this.formError.set('');
    if (id !== null) this.restoreFocus(id);
  }
  save(): void {
    if (this.busy()) return;
    const id = this.editing();
    if (id === null) return;
    const current = this.zones().find(z => z.id === id);
    const min = current?.min_distance_meters ?? this.newMinMeters;
    const body = formToZone(this.form, min, current?.sort_order ?? this.zones().length);
    if (!body) { this.formError.set('Confira a distância final, a taxa e o prazo.'); return; }
    this.busy.set(true); this.formError.set('');
    const request = current ? this.api.updateDeliveryZone(id, {
      name: body.name, max_distance_meters: body.max_distance_meters,
      fee_cents: body.fee_cents, estimated_minutes: body.estimated_minutes,
    }) : this.api.createDeliveryZone(body);
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: zone => {
        this.zones.update(rows => [...rows.filter(row => row.id !== zone.id), zone]
          .sort((a, b) => a.min_distance_meters - b.min_distance_meters));
        this.editing.set(null); this.message.set('Área salva.');
        this.restoreFocus(id);
      },
      error: err => this.formError.set(err.status === 409 ? 'Esta faixa se sobrepõe a outra área ativa.' : 'Não foi possível salvar. Confira os dados e tente novamente.'),
    });
  }
  toggle(zone: DeliveryZone): void {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    this.api.updateDeliveryZone(zone.id, { is_active: !zone.is_active }).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: updated => {
        this.zones.update(rows => rows.map(row => row.id === updated.id ? updated : row));
        this.message.set(zone.is_active ? 'Área desativada.' : 'Área ativada.');
      },
      error: err => this.error.set(err.status === 409 ? 'Esta faixa se sobrepõe a outra área ativa.' : 'Não foi possível alterar esta área.'),
    });
  }
  remove(zone: DeliveryZone): void {
    if (this.busy() || !window.confirm(`Excluir a área de ${this.km(zone.min_distance_meters)}–${this.km(zone.max_distance_meters)} km?`)) return;
    this.busy.set(true); this.error.set('');
    this.api.deleteDeliveryZone(zone.id).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.zones.update(rows => rows.filter(row => row.id !== zone.id));
        if (this.editing() === zone.id) this.editing.set(null);
        this.message.set('Área excluída.');
      },
      error: () => this.error.set('Não foi possível excluir a área.'),
    });
  }
}
