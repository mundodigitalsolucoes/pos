import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ApiService } from '../services/api.service';
import { authInterceptor } from './auth.interceptor';

describe('staff session interceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let api: jasmine.SpyObj<ApiService>;
  let router: { url: string; navigate: jasmine.Spy };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['refreshToken', 'logout']);
    api.logout.and.returnValue(of(undefined));
    router = { url: '/orders', navigate: jasmine.createSpy('navigate') };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: api },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('keeps normal authenticated requests working', () => {
    let result: unknown;
    http.get('/api/orders').subscribe(value => result = value);
    controller.expectOne('/api/orders').flush({ ok: true });
    expect(result).toEqual({ ok: true });
    expect(api.refreshToken).not.toHaveBeenCalled();
  });

  it('refreshes once for simultaneous 401s and retries both requests', () => {
    // The real refresh request is intercepted as well; no recursive refresh.
    api.refreshToken.and.callFake(() => http.post('/api/refresh', {}));
    const results: unknown[] = [];
    http.get('/api/orders').subscribe(value => results.push(value));
    http.get('/api/print-jobs/status').subscribe(value => results.push(value));
    controller.expectOne('/api/orders').flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne('/api/print-jobs/status').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(api.refreshToken).toHaveBeenCalledTimes(1);
    controller.expectOne('/api/refresh').flush({ status: 'success' });
    controller.expectOne('/api/orders').flush({ id: 1 });
    controller.expectOne('/api/print-jobs/status').flush({ id: 2 });
    expect(results).toEqual([{ id: 2 }, { id: 1 }]);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('renews the HTTP session for a 401 from /ws-token', () => {
    api.refreshToken.and.callFake(() => http.post('/api/refresh', {}));
    let token: unknown;
    http.get('/api/ws-token').subscribe(value => token = value);
    controller.expectOne('/api/ws-token').flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne('/api/refresh').flush({ status: 'success' });
    controller.expectOne('/api/ws-token').flush({ access_token: 'fresh' });
    expect(token).toEqual({ access_token: 'fresh' });
    expect(api.logout).not.toHaveBeenCalled();
  });

  it('logs out only when the refresh cookie is rejected', () => {
    api.refreshToken.and.callFake(() => http.post('/api/refresh', {}));
    http.get('/api/orders').subscribe({ error: () => {} });
    controller.expectOne('/api/orders').flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne('/api/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(api.logout).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  for (const status of [0, 503]) {
    it(`preserves the session when refresh fails with ${status}`, () => {
      api.refreshToken.and.callFake(() => http.post('/api/refresh', {}));
      http.get('/api/orders').subscribe({ error: () => {} });
      controller.expectOne('/api/orders').flush({}, { status: 401, statusText: 'Unauthorized' });
      controller.expectOne('/api/refresh').flush({}, { status, statusText: 'Connection unavailable' });
      expect(api.logout).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  }

  it('does not treat failure of the retried request as a failed refresh', () => {
    api.refreshToken.and.callFake(() => http.post('/api/refresh', {}));
    http.get('/api/orders').subscribe({ error: () => {} });
    controller.expectOne('/api/orders').flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne('/api/refresh').flush({ status: 'success' });
    controller.expectOne('/api/orders').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(api.logout).not.toHaveBeenCalled();
  });
});
