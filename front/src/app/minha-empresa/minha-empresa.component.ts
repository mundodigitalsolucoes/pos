import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom, timeout, finalize } from 'rxjs';
import { ApiService, OpeningHoursBaselineRow, TenantSettings } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { MAX_IMAGE_UPLOAD_BYTES, MAX_IMAGE_UPLOAD_MB } from '../shared/image-upload-limits';
import { kmToMeters, reaisToCents } from './company-form-values';
import { BrazilianAddress, BrazilianAddressService, addressComplete, emptyBrazilianAddress, maskCep, cepDigits } from '../shared/brazilian-address';

type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
type DayHours = { closed: boolean; open: string; close: string; hasBreak?: boolean; [key: string]: unknown };
const DAYS: { key: Weekday; label: string }[] = [
  { key: 'monday', label: 'Segunda-feira' }, { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' }, { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' }, { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];
type DayGroup = 'all' | 'weekdays' | 'weekend';
const FOOD_TYPES = [
  { value: 'restaurant', label: 'Restaurante' }, { value: 'pizzeria', label: 'Pizzaria' },
  { value: 'burger', label: 'Hamburgueria' }, { value: 'snack_bar', label: 'Lanchonete' },
  { value: 'cafe', label: 'Cafeteria' }, { value: 'bakery', label: 'Padaria' },
  { value: 'bar', label: 'Bar' }, { value: 'confectionery', label: 'Doceria / Confeitaria' },
  { value: 'acai', label: 'Açaíteria' }, { value: 'ice_cream', label: 'Sorveteria' },
  { value: 'meal_delivery', label: 'Marmitaria' }, { value: 'steakhouse', label: 'Churrascaria' },
  { value: 'pastry_shop', label: 'Pastelaria' }, { value: 'food_truck', label: 'Food truck' },
  { value: 'delivery', label: 'Delivery' }, { value: 'other', label: 'Outro' },
  { value: 'retail', label: 'Comércio (cadastro existente)' },
  { value: 'service', label: 'Serviço (cadastro existente)' },
];

@Component({
  selector: 'app-minha-empresa',
  standalone: true,
  imports: [SidebarComponent, RouterLink, FormsModule],
  templateUrl: './minha-empresa.component.html',
  styleUrl: './minha-empresa.component.scss',
})
export class MinhaEmpresaComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly addressApi = inject(BrazilianAddressService);
  readonly days = DAYS;
  readonly foodTypes = FOOD_TYPES;
  readonly maxImageMb = MAX_IMAGE_UPLOAD_MB;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly settings = signal<TenantSettings | null>(null);
  readonly saving = signal(false);
  readonly imageBusy = signal<'logo' | 'header' | null>(null);
  readonly message = signal('');
  readonly imageMessage = signal('');
  readonly copied = signal(false);
  readonly scheduleError = signal(false);
  readonly scheduleLoading = signal(true);
  draft: Partial<TenantSettings> = {};
  address: BrazilianAddress = emptyBrazilianAddress();
  addressEdited = false;
  readonly cepStatus = signal('');
  readonly locationStatus = signal('');
  deliveryFee = '0,00';
  deliveryRadius = '';
  deliveryPostalCodes = '';
  hours: Record<Weekday, DayHours> = this.defaultHours();
  hoursDirty = false;
  hoursGroup: DayGroup = 'weekdays';
  groupOpen = '09:00';
  groupClose = '18:00';
  groupError = '';
  private readonly editedDays = new Set<Weekday>();
  private weeklySource: Record<string, unknown> = {};
  private activeBaseline: OpeningHoursBaselineRow | null = null;
  private todayBaseline: OpeningHoursBaselineRow | null = null;
  private today = '';

  ngOnInit(): void {
    this.api.getTenantSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.draft = {
          name: settings.name, business_type: settings.business_type, description: settings.description,
          phone: settings.phone, whatsapp: settings.whatsapp, email: settings.email,
          website: settings.website, address: settings.address,
        };
        this.address = {
          postal_code: maskCep(settings.address_postal_code || ''), street: settings.address_street || '',
          number: settings.address_number || '', complement: settings.address_complement || '',
          neighborhood: settings.address_neighborhood || '', city: settings.address_city || '',
          state_code: settings.address_state_code || '',
        };
        this.locationStatus.set(settings.latitude != null && settings.longitude != null ? 'Localização encontrada.' : 'Localização ainda não encontrada.');
        this.deliveryFee = (Number(settings.delivery_fee_cents ?? 0) / 100).toFixed(2).replace('.', ',');
        this.deliveryRadius = settings.delivery_radius_meters ? String(settings.delivery_radius_meters / 1000).replace('.', ',') : '';
        this.deliveryPostalCodes = this.postalCodesForForm(settings.delivery_postal_codes);
        let dateParts: Intl.DateTimeFormatPart[];
        try {
          dateParts = new Intl.DateTimeFormat('en-CA', {
            timeZone: settings.timezone || 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
          }).formatToParts(new Date());
        } catch {
          dateParts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
          }).formatToParts(new Date());
        }
        const part = (type: string) => dateParts.find(value => value.type === type)?.value ?? '';
        this.today = `${part('year')}-${part('month')}-${part('day')}`;
        this.loadSchedule(settings);
        this.loading.set(false);
      },
      error: () => { this.error.set('Não foi possível carregar os dados do estabelecimento.'); this.loading.set(false); },
    });
  }

  private defaultHours(): Record<Weekday, DayHours> {
    return Object.fromEntries(DAYS.map(d => [d.key, { closed: true, open: '09:00', close: '18:00' }])) as Record<Weekday, DayHours>;
  }
  private loadSchedule(settings: TenantSettings): void {
    this.api.getOpeningHoursSchedule().pipe(timeout(15000)).subscribe({
      next: schedule => {
        const effective = schedule.baselines.filter(b => b.effective_from <= this.today)
          .sort((a, b) => b.effective_from.localeCompare(a.effective_from));
        this.activeBaseline = effective[0] ?? null;
        this.todayBaseline = schedule.baselines.find(b => b.effective_from === this.today) ?? null;
        this.parseHours(this.activeBaseline?.opening_hours ?? settings.opening_hours);
        this.scheduleLoading.set(false);
      },
      error: () => {
        this.scheduleError.set(true);
        this.parseHours(settings.opening_hours);
        this.scheduleLoading.set(false);
      },
    });
  }
  private parseHours(raw: string | null | undefined): void {
    try {
      const source: unknown = raw ? JSON.parse(raw) : {};
      if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('invalid hours');
      this.weeklySource = source as Record<string, unknown>;
      this.hours = this.defaultHours();
      for (const day of DAYS) {
        const stored = this.weeklySource[day.key];
        if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
          const value = stored as Record<string, unknown>;
          this.hours[day.key] = {
            ...value, closed: value['closed'] === true,
            open: typeof value['open'] === 'string' ? value['open'] : '09:00',
            close: typeof value['close'] === 'string' ? value['close'] : '18:00',
          };
        }
      }
    } catch {
      this.scheduleError.set(true);
      this.message.set('Os horários cadastrados precisam ser revisados em Configurações avançadas.');
    }
  }
  changeDay(day: Weekday, field: 'closed' | 'open' | 'close', value: boolean | string): void {
    this.hours[day] = { ...this.hours[day], [field]: value };
    this.hoursDirty = true;
    this.editedDays.add(day);
    this.message.set('');
  }
  applyHoursGroup(): void {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(this.groupOpen) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(this.groupClose) || this.groupOpen >= this.groupClose) {
      this.groupError = 'Confira o horário: o fechamento deve ser posterior à abertura.';
      return;
    }
    if (this.scheduleLoading() || this.scheduleError()) return;
    const selected = this.hoursGroup === 'all' ? DAYS : this.hoursGroup === 'weekdays' ? DAYS.slice(0, 5) : DAYS.slice(5);
    for (const { key } of selected) {
      const { hasBreak, morningOpen, morningClose, eveningOpen, eveningClose, ...previous } = this.hours[key];
      this.hours[key] = { ...previous, closed: false, open: this.groupOpen, close: this.groupClose };
      this.editedDays.add(key);
    }
    this.hoursDirty = true;
    this.groupError = '';
    this.message.set('Horário aplicado aos dias selecionados. Clique em Salvar alterações para confirmar.');
  }
  private serializedHours(): string {
    const result = { ...this.weeklySource };
    for (const day of DAYS) result[day.key] = { ...this.hours[day.key] };
    return JSON.stringify(result);
  }
  private postalCodesForForm(raw?: string | null): string {
    if (!raw) return '';
    try {
      const decoded: unknown = JSON.parse(raw);
      if (Array.isArray(decoded)) return decoded.map(String).join('\n');
    } catch { /* Legacy plain text. */ }
    return raw;
  }
  get countryLabel(): string {
    const code = this.settings()?.country_code;
    return code === 'BR' || (!code && (!this.settings()?.currency_code || this.settings()?.currency_code === 'BRL')) ? 'Brasil' : code || 'Não informado';
  }
  get currencyLabel(): string {
    const code = this.settings()?.currency_code;
    return code === 'BRL' || (!code && this.countryLabel === 'Brasil') ? 'Real brasileiro (R$)' : code || this.settings()?.currency || 'Não informada';
  }
  get timezoneLabel(): string {
    const zone = this.settings()?.timezone;
    return zone === 'America/Sao_Paulo' || (!zone && this.countryLabel === 'Brasil') ? 'Horário de Brasília' : zone || 'Não informado';
  }

  addressChanged(): void { this.addressEdited = true; this.locationStatus.set('Localização será atualizada ao salvar.'); }
  lookupCep(): void {
    this.address.postal_code = maskCep(this.address.postal_code);
    if (cepDigits(this.address.postal_code).length !== 8) {
      this.cepStatus.set('CEP inválido. Informe oito dígitos.'); return;
    }
    this.cepStatus.set('Consultando CEP…');
    this.addressApi.lookupCep(this.address.postal_code).subscribe({
      next: result => {
        this.address = { ...this.address, street: result.street || this.address.street,
          neighborhood: result.neighborhood || this.address.neighborhood,
          city: result.city || this.address.city, state_code: result.state_code || this.address.state_code };
        this.addressChanged(); this.cepStatus.set('CEP encontrado. Confira os dados e informe o número.');
      },
      error: err => this.cepStatus.set(err.status === 400 ? 'CEP não encontrado. Confira os números.' : 'Consulta de CEP indisponível. Preencha os campos manualmente.'),
    });
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    const name = this.draft.name?.trim();
    if (!name) { this.message.set('Informe o nome do estabelecimento.'); return; }
    const fee = reaisToCents(this.deliveryFee);
    const radius = this.deliveryRadius.trim() ? kmToMeters(this.deliveryRadius) : 0;
    if (fee === null || radius === null) { this.message.set('Confira a taxa de entrega e o raio em quilômetros.'); return; }
    if (this.addressEdited && !addressComplete(this.address)) { this.message.set('Confira o endereço: informe CEP, rua, número, bairro, cidade e UF.'); return; }
    if (radius > 0 && !this.addressEdited && (this.settings()?.latitude == null || this.settings()?.longitude == null)) {
      this.message.set('Precisamos localizar o endereço do estabelecimento antes de usar o raio de entrega. Preencha o endereço acima.'); return;
    }
    if (this.hoursDirty && this.scheduleError()) { this.message.set('Não foi possível carregar os horários. Recarregue a página antes de salvá-los.'); return; }
    if (this.hoursDirty) {
      const valid = [...this.editedDays].every(key => {
        const day = this.hours[key];
        return day.closed || day.hasBreak || (/^\d{2}:\d{2}$/.test(day.open) && /^\d{2}:\d{2}$/.test(day.close) && day.open < day.close);
      });
      if (!valid) { this.message.set('Confira os horários: o fechamento deve ser posterior à abertura.'); return; }
    }
    this.saving.set(true);
    this.message.set('');
    const payload: Partial<TenantSettings> = {
      ...this.draft, name, delivery_fee_cents: fee, delivery_radius_meters: radius,
      delivery_postal_codes: this.deliveryPostalCodes.trim(),
    };
    if (this.addressEdited) Object.assign(payload, {
      address_postal_code: cepDigits(this.address.postal_code), address_street: this.address.street,
      address_number: this.address.number, address_complement: this.address.complement,
      address_neighborhood: this.address.neighborhood, address_city: this.address.city,
      address_state_code: this.address.state_code.toUpperCase(),
    });
    if (this.hoursDirty && !this.activeBaseline) payload.opening_hours = this.serializedHours();
    try {
      const updated = await firstValueFrom(this.api.updateTenantSettings(payload));
      this.settings.set(updated);
      this.draft.address = updated.address;
      this.addressEdited = false;
      this.locationStatus.set(updated.latitude != null && updated.longitude != null ? 'Localização encontrada.' : 'Localização ainda não encontrada.');
      if (this.hoursDirty && this.activeBaseline) {
        const body = { effective_from: this.today, opening_hours: this.serializedHours() };
        if (this.todayBaseline) await firstValueFrom(this.api.updateOpeningHoursBaseline(this.todayBaseline.id, body));
        else {
          const created = await firstValueFrom(this.api.createOpeningHoursBaseline(body));
          this.todayBaseline = { id: created.id, effective_from: this.today, opening_hours: body.opening_hours };
          this.activeBaseline = this.todayBaseline;
        }
      }
      this.hoursDirty = false;
      this.editedDays.clear();
      this.message.set('Alterações salvas com sucesso.');
    } catch (err: any) {
      const detail = err?.error?.detail;
      if (this.addressEdited) this.locationStatus.set(err?.status === 503 ? 'Falha temporária na localização. Tente novamente.' : 'Não foi possível localizar este endereço. Confira os campos.');
      this.message.set(typeof detail === 'string' && detail.length < 200 ? detail : 'Não foi possível salvar todas as alterações. Confira os campos e tente novamente; seus dados nesta tela foram mantidos.');
    } finally { this.saving.set(false); }
  }

  logoUrl(s: TenantSettings): string { return this.api.getTenantLogoUrl(s.logo_filename, s.id) || ''; }
  headerUrl(s: TenantSettings): string { return this.api.getTenantHeaderBackgroundUrl(s.header_background_filename, s.id) || ''; }
  uploadImage(event: Event, kind: 'logo' | 'header'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; input.value = '';
    if (!file) return;
    const allowed = kind === 'logo' ? ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'] : ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.type) || file.size > MAX_IMAGE_UPLOAD_BYTES) { this.imageMessage.set(`Arquivo inválido. Use os formatos informados e até ${MAX_IMAGE_UPLOAD_MB} MB.`); return; }
    this.imageBusy.set(kind); this.imageMessage.set('');
    const request = kind === 'logo' ? this.api.uploadTenantLogo(file) : this.api.uploadTenantHeaderBackground(file);
    request.pipe(timeout(90000), finalize(() => this.imageBusy.set(null))).subscribe({
      next: s => { this.settings.set(s); this.imageMessage.set(kind === 'logo' ? 'Logo atualizada com sucesso.' : 'Capa atualizada com sucesso.'); },
      error: err => { this.imageMessage.set(err?.name === 'TimeoutError' ? 'O envio demorou demais. Atualize a página para verificar se a imagem foi salva antes de tentar novamente.' : 'Não foi possível enviar a imagem. Tente novamente.'); },
    });
  }
  removeImage(kind: 'logo' | 'header'): void {
    this.imageBusy.set(kind); this.imageMessage.set('');
    const request = kind === 'logo' ? this.api.deleteTenantLogo() : this.api.deleteTenantHeaderBackground();
    request.subscribe({
      next: s => { this.settings.set(s); this.imageBusy.set(null); this.imageMessage.set(kind === 'logo' ? 'Logo removida.' : 'Capa removida.'); },
      error: () => { this.imageBusy.set(null); this.imageMessage.set('Não foi possível remover a imagem.'); },
    });
  }
  publicMenuUrl(id: number): string { return `${window.location.origin}/public-menu/${id}`; }
  async copyLink(id: number): Promise<void> {
    try { await navigator.clipboard.writeText(this.publicMenuUrl(id)); this.copied.set(true); }
    catch { this.copied.set(false); this.message.set('Não foi possível copiar o link.'); }
  }
}
