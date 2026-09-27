import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService, DeliveryZone } from '../services/api.service';
import { DeliveryZonesComponent, formToZone } from './delivery-zones.component';

const row = (id: number, min: number, max: number, active = true): DeliveryZone => ({
  id, tenant_id: 1, name: `Até ${max / 1000} km`, min_distance_meters: min,
  max_distance_meters: max, fee_cents: 400, estimated_minutes: 30,
  is_active: active, sort_order: id, created_at: '', updated_at: '',
});

describe('delivery area form', () => {
  it('converts km and reais without accepting invalid or inverted values', () => {
    const form = { name: 'Até 7,5 km', maxKm: '7,5', fee: '12,90', minutes: '40' };
    expect(formToZone(form, 5000, 1)).toEqual(jasmine.objectContaining({
      min_distance_meters: 5000, max_distance_meters: 7500,
      fee_cents: 1290, estimated_minutes: 40,
    }));
    expect(formToZone({ ...form, maxKm: '4' }, 5000, 1)).toBeNull();
    expect(formToZone({ ...form, fee: 'x' }, 0, 1)).toBeNull();
    expect(formToZone({ ...form, minutes: '0' }, 0, 1)).toBeNull();
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
    component.form = { name: 'Até 10 km', maxKm: '10', fee: '12,00', minutes: '40' };
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
    expect(component.error()).toContain('Confira');
  });
});
