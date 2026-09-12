import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GoogleRestaurantSignupPayload {
  credential: string;
  tenant_name: string;
  address: string;
  phone: string;
  maps_url?: string | null;
}

export interface GoogleRestaurantSignupResponse {
  status: string;
  tenant_id: number;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleSignupService {
  private readonly http = inject(HttpClient);

  signup(payload: GoogleRestaurantSignupPayload): Observable<GoogleRestaurantSignupResponse> {
    return this.http.post<GoogleRestaurantSignupResponse>(
      `${environment.apiUrl}/customer/auth/google/signup`,
      payload,
      { withCredentials: true },
    );
  }
}
