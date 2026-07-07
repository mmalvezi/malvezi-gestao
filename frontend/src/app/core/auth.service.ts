import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';

const CHAVE_TOKEN = 'malvezi_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  login(senha: string): Observable<{ token: string }> {
    return this.http
      .post<{ token: string }>(`${this.base}/login`, { senha })
      .pipe(tap((r) => localStorage.setItem(CHAVE_TOKEN, r.token)));
  }

  logout(): void {
    localStorage.removeItem(CHAVE_TOKEN);
  }

  getToken(): string | null {
    return localStorage.getItem(CHAVE_TOKEN);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
