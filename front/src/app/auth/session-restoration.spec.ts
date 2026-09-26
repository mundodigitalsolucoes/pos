import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from '../services/api.service';
import { LanguageService } from '../services/language.service';

describe('staff session restoration', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ApiService,
        { provide: LanguageService, useValue: { getLanguage: () => 'pt' } }],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(ApiService);
  });

  afterEach(() => http.verify());

  it('restores a reload with expired access cookie and valid refresh cookie', () => {
    http.expectOne(req => req.url.endsWith('/users/me')).flush(null);
    http.expectOne(req => req.url.endsWith('/refresh')).flush({ status: 'success' });
    http.expectOne(req => req.url.endsWith('/users/me')).flush({ id: 3, role: 'owner', tenant_id: 2 });
    expect(api.getCurrentUser()?.id).toBe(3);
  });

  it('stays anonymous when the refresh cookie really expired', () => {
    http.expectOne(req => req.url.endsWith('/users/me')).flush(null);
    http.expectOne(req => req.url.endsWith('/refresh')).flush({}, { status: 401, statusText: 'Expired' });
    expect(api.getCurrentUser()).toBeNull();
  });

  it('does not replace a valid user with null when internet fails', () => {
    http.expectOne(req => req.url.endsWith('/users/me')).flush({ id: 3, role: 'owner', tenant_id: 2 });
    api.checkAuth().subscribe({ error: () => {} });
    http.expectOne(req => req.url.endsWith('/users/me')).flush({}, { status: 0, statusText: 'Offline' });
    expect(api.getCurrentUser()?.id).toBe(3);
  });
});
