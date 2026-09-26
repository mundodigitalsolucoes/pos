import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface BrazilianAddress {
  postal_code: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state_code: string;
}

export const emptyBrazilianAddress = (): BrazilianAddress => ({
  postal_code: '', street: '', number: '', complement: '', neighborhood: '', city: '', state_code: '',
});

export function cepDigits(value: string): string { return value.replace(/\D/g, ''); }
export function maskCep(value: string): string {
  const digits = cepDigits(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}
export function addressComplete(value: BrazilianAddress): boolean {
  return cepDigits(value.postal_code).length === 8 &&
    !!(value.street.trim() && value.number.trim() && value.neighborhood.trim() &&
       value.city.trim() && /^[a-z]{2}$/i.test(value.state_code.trim()));
}
export function addressText(value: BrazilianAddress): string {
  return [value.street, value.number, value.complement, value.neighborhood,
    value.city, value.state_code.toUpperCase(), maskCep(value.postal_code), 'Brasil']
    .filter(Boolean).join(', ');
}

@Injectable({ providedIn: 'root' })
export class BrazilianAddressService {
  private http = inject(HttpClient);
  private base = (environment.apiUrl || '').replace(/\/$/, '');
  lookupCep(cep: string) {
    return this.http.get<Pick<BrazilianAddress, 'postal_code'|'street'|'neighborhood'|'city'|'state_code'>>(
      `${this.base}/public/address/cep/${cepDigits(cep)}`);
  }
  checkCoverage(tenantId: number, address: BrazilianAddress) {
    return this.http.post<{ covered: boolean; reason: string|null; latitude: number|null; longitude: number|null }>(
      `${this.base}/public/tenants/${tenantId}/delivery-address/coverage`,
      { ...address, postal_code: cepDigits(address.postal_code) });
  }
}
