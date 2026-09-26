import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { MinhaEmpresaComponent } from './minha-empresa.component';
import { ApiService, TenantSettings } from '../services/api.service';
import { BrazilianAddressService } from '../shared/brazilian-address';

describe('MinhaEmpresaComponent requests', () => {
  let component: MinhaEmpresaComponent;
  let response: Subject<TenantSettings>;
  let api: { updateTenantSettings: jasmine.Spy; uploadTenantHeaderBackground: jasmine.Spy };
  const tenant: TenantSettings = { id: 7, name: 'Restaurante', latitude: 0, longitude: 0 };

  beforeEach(() => {
    response = new Subject<TenantSettings>();
    api = {
      updateTenantSettings: jasmine.createSpy().and.returnValue(response.asObservable()),
      uploadTenantHeaderBackground: jasmine.createSpy().and.returnValue(response.asObservable()),
    };
    TestBed.configureTestingModule({ providers: [
      { provide: ApiService, useValue: api },
      { provide: BrazilianAddressService, useValue: {} },
    ] });
    component = TestBed.runInInjectionContext(() => new MinhaEmpresaComponent());
    component.settings.set(tenant);
    component.draft = { name: 'Restaurante atualizado' };
  });

  it('finishes saving and updates the tenant on success', async () => {
    const pending = component.save();
    expect(component.saving()).toBeTrue();
    response.next({ ...tenant, name: 'Restaurante atualizado' });
    response.complete();
    await pending;
    expect(component.saving()).toBeFalse();
    expect(component.settings()?.name).toBe('Restaurante atualizado');
    expect(component.message()).toContain('sucesso');
  });

  it('releases saving and keeps the form on error', async () => {
    spyOn(console, 'error');
    const pending = component.save();
    response.error({ status: 503 });
    await pending;
    expect(component.saving()).toBeFalse();
    expect(component.draft.name).toBe('Restaurante atualizado');
    expect(component.message()).toContain('Não foi possível');
  });

  function selectCover(): void {
    const input = { files: [new File(['cover'], 'cover.png', { type: 'image/png' })], value: 'cover.png' };
    component.uploadImage({ target: input } as unknown as Event, 'header');
  }

  it('updates preview data and ends cover loading on success', () => {
    selectCover();
    expect(component.imageBusy()).toBe('header');
    expect(api.uploadTenantHeaderBackground).toHaveBeenCalled();
    response.next({ ...tenant, header_background_filename: 'cover.png' });
    response.complete();
    expect(component.imageBusy()).toBeNull();
    expect(component.settings()?.header_background_filename).toBe('cover.png');
  });

  it('ends cover loading and explains upload failure', () => {
    selectCover();
    response.error({ status: 500 });
    expect(component.imageBusy()).toBeNull();
    expect(component.imageMessage()).toContain('Não foi possível');
  });
});
