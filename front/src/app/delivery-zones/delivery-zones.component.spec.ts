import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiService, DeliveryZone } from '../services/api.service';
import { SidebarComponent } from '../shared/sidebar.component';
import { DeliveryZonesComponent, formToZone } from './delivery-zones.component';

const row = (id: number, min: number, max: number, active = true): DeliveryZone => ({
  id, tenant_id: 1, name: `Até ${max / 1000} km`, min_distance_meters: min,
  max_distance_meters: max, fee_cents: 400, estimated_minutes: 30,
  is_active: active, sort_order: id, created_at: '', updated_at: '',
});

@Component({ selector: 'app-sidebar', standalone: true, template: '<ng-content />' })
class TestSidebarComponent {}

describe('delivery area form', () => {
  it('converts km and reais without accepting invalid or inverted values', () => {
    const form = { maxKm: '7,5', fee: '12,90', minutes: '40' };
    expect(formToZone(form, 5000, 1)).toEqual(jasmine.objectContaining({
      min_distance_meters: 5000, max_distance_meters: 7500,
      fee_cents: 1290, estimated_minutes: 40, name: '5–7.5 km',
    }));
    expect(formToZone({ ...form, maxKm: '4' }, 5000, 1)).toBeNull();
    expect(formToZone({ ...form, fee: 'x' }, 0, 1)).toBeNull();
    expect(formToZone({ ...form, minutes: '0' }, 0, 1)).toBeNull();
    expect(formToZone({ ...form, maxKm: '30' }, 25000, 1)?.max_distance_meters).toBe(30000);
  });

  it('summarizes coverage and warns about gaps', () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['listDeliveryZones']);
    api.listDeliveryZones.and.returnValue(of([row(1, 0, 5000), row(2, 6000, 10000)]));
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    const component = TestBed.runInInjectionContext(() => new DeliveryZonesComponent());
    component.ngOnInit();
    expect(component.loading()).toBeFalse();
    expect(component.maximumKm).toBe('10');
    expect(component.gapWarning).toBeTrue();
    component.zones.set([row(1, 0, 5000), row(2, 5000, 10000)]);
    expect(component.gapWarning).toBeFalse();
    component.zones.set([row(1, 0, 5000, false)]);
    expect(component.active).toEqual([]);
  });

  it('shows API errors without leaving loading active', () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['listDeliveryZones']);
    api.listDeliveryZones.and.returnValue(throwError(() => ({ status: 503 })));
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    const component = TestBed.runInInjectionContext(() => new DeliveryZonesComponent());
    component.ngOnInit();
    expect(component.loading()).toBeFalse();
    expect(component.error()).toContain('Não foi possível');
  });

  it('adds and edits a band using API state as the source of truth', () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService',
      ['listDeliveryZones', 'createDeliveryZone', 'updateDeliveryZone']);
    api.listDeliveryZones.and.returnValue(of([row(1, 0, 5000)]));
    api.createDeliveryZone.and.returnValue(of(row(2, 5000, 10000)));
    api.updateDeliveryZone.and.returnValue(of(row(1, 0, 5000)));
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    const component = TestBed.runInInjectionContext(() => new DeliveryZonesComponent());
    component.ngOnInit();
    component.startAdd();
    component.form = { maxKm: '10', fee: '12,00', minutes: '40' };
    component.save();
    expect(api.createDeliveryZone).toHaveBeenCalledWith(jasmine.objectContaining({
      min_distance_meters: 5000, max_distance_meters: 10000, fee_cents: 1200,
    }));
    expect(component.busy()).toBeFalse();
    component.startEdit(row(1, 0, 5000));
    component.form.fee = '8,00';
    component.save();
    expect(api.updateDeliveryZone).toHaveBeenCalledWith(1, jasmine.objectContaining({ fee_cents: 800 }));
  });

  it('rejects invalid form without calling the API', () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['listDeliveryZones', 'createDeliveryZone']);
    api.listDeliveryZones.and.returnValue(of([]));
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    const component = TestBed.runInInjectionContext(() => new DeliveryZonesComponent());
    component.ngOnInit();
    component.startAdd();
    component.form.minutes = '0';
    component.save();
    expect(api.createDeliveryZone).not.toHaveBeenCalled();
    expect(component.formError()).toContain('Confira');
  });
});

describe('delivery area cards', () => {
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService',
      ['listDeliveryZones', 'createDeliveryZone', 'updateDeliveryZone', 'deleteDeliveryZone']);
    api.listDeliveryZones.and.returnValue(of([row(1, 0, 5000), row(2, 5000, 8000)]));
    TestBed.configureTestingModule({
      imports: [DeliveryZonesComponent],
      providers: [{ provide: ApiService, useValue: api }, provideRouter([])],
    });
    TestBed.overrideComponent(DeliveryZonesComponent, {
      remove: { imports: [SidebarComponent] },
      add: { imports: [TestSidebarComponent] },
    });
  });

  it('shows actual ranges, not potentially contradictory stored names, including inactive bands', () => {
    api.listDeliveryZones.and.returnValue(of([
      { ...row(1, 0, 5000), name: 'Até 3 km' }, row(2, 5000, 8000, false),
    ]));
    const fixture = TestBed.createComponent(DeliveryZonesComponent);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.cards .card') as NodeListOf<HTMLElement>;
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('h2')?.textContent?.trim()).toBe('0–5 km');
    expect(cards[0].textContent).not.toContain('Até 3 km');
    expect(cards[1].textContent).toContain('Inativa');
    expect(fixture.nativeElement.querySelector('.summary')?.textContent).toContain('1 área ativa · Entrega até 5 km');
  });

  it('opens exactly the selected card inline, switches cards and cancels without saving', () => {
    const fixture = TestBed.createComponent(DeliveryZonesComponent);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.cards .card') as NodeListOf<HTMLElement>;
    cards[0].querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(cards[0].querySelector('input[readonly]')).not.toBeNull();
    expect(cards[1].querySelector('input')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('input#delivery-zone-max').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.cards + .editor')).toBeNull();
    cards[1].querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect(cards[0].querySelector('input')).toBeNull();
    expect(cards[1].querySelector('input[readonly]')).not.toBeNull();
    cards[1].querySelectorAll<HTMLButtonElement>('.actions button')[1].click();
    fixture.detectChanges();
    expect(cards[1].querySelector('input')).toBeNull();
    expect(cards[1].querySelector('h2')?.textContent).toContain('5–8 km');
    expect(api.updateDeliveryZone).not.toHaveBeenCalled();
  });

  it('creates before the cards from the last active maximum and updates the summary on success', () => {
    api.createDeliveryZone.and.returnValue(of(row(3, 8000, 20000)));
    const fixture = TestBed.createComponent(DeliveryZonesComponent);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.add-area')!.click();
    fixture.detectChanges();
    const editor = fixture.nativeElement.querySelector('.editor') as HTMLElement;
    const cards = fixture.nativeElement.querySelector('.cards') as HTMLElement;
    expect(editor.compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(editor.querySelector<HTMLInputElement>('input[readonly]')?.value).toBe('8');
    fixture.componentInstance.form = { maxKm: '20', fee: '12,00', minutes: '40' };
    fixture.componentInstance.save();
    fixture.detectChanges();
    expect(api.createDeliveryZone).toHaveBeenCalledWith(jasmine.objectContaining({ min_distance_meters: 8000, max_distance_meters: 20000 }));
    expect(fixture.nativeElement.querySelector('.editor')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.cards .card').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.summary')?.textContent).toContain('3 áreas ativas · Entrega até 20 km');
  });

  it('keeps a validation error inside the card and updates only the saved card', () => {
    api.updateDeliveryZone.and.returnValues(
      throwError(() => ({ status: 409 })),
      of({ ...row(1, 0, 5000), fee_cents: 900, estimated_minutes: 35 }),
    );
    const fixture = TestBed.createComponent(DeliveryZonesComponent);
    fixture.detectChanges();
    fixture.componentInstance.startEdit(row(1, 0, 5000));
    fixture.componentInstance.form = { maxKm: '6', fee: '9,00', minutes: '35' };
    fixture.componentInstance.save();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cards .card .alert')?.textContent).toContain('sobrepõe');
    fixture.componentInstance.form.maxKm = '5';
    fixture.componentInstance.save();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.cards .card')[0].textContent).toContain('9,00');
    expect(fixture.nativeElement.querySelectorAll('.cards .card')[1].textContent).toContain('5–8 km');
  });

  it('toggles activity and removes a band only after confirmation', () => {
    api.updateDeliveryZone.and.returnValue(of(row(2, 5000, 8000, false)));
    api.deleteDeliveryZone.and.returnValue(of(void 0));
    spyOn(window, 'confirm').and.returnValues(false, true);
    const fixture = TestBed.createComponent(DeliveryZonesComponent);
    fixture.detectChanges();
    fixture.componentInstance.toggle(row(2, 5000, 8000));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.summary')?.textContent).toContain('Entrega até 5 km');
    expect(fixture.nativeElement.querySelectorAll('.cards .card').length).toBe(2);
    fixture.componentInstance.remove(row(2, 5000, 8000));
    expect(api.deleteDeliveryZone).not.toHaveBeenCalled();
    fixture.componentInstance.remove(row(2, 5000, 8000));
    fixture.detectChanges();
    expect(api.deleteDeliveryZone).toHaveBeenCalledWith(2);
    expect(fixture.nativeElement.querySelectorAll('.cards .card').length).toBe(1);
  });
});
