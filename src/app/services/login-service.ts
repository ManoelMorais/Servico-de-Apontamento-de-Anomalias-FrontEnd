import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, tap, throwError } from 'rxjs';
import { LoginRequest } from '../types/login-request-types';
import { LoginResponse } from '../types/login-response-types';

@Injectable({ providedIn: 'root' })
export class LoginService {

  private tokenKey = 'auth_token';
  private userKey = 'auth_user';
  private userSubject = new BehaviorSubject<any | null>(this.readUserFromStorage());
  user$ = this.userSubject.asObservable();

  constructor() { }

  login(payload: LoginRequest): Observable<LoginResponse> {
    const drt = String(payload.drtUsuario || '').trim();
    const senha = String(payload.senhaUsuario || '').trim();

    console.log('[LoginService] local login attempt', drt);

    if (drt === '3001262' && senha === '3001262') {
      const token = 'local-token-' + Math.random().toString(36).slice(2);
      const res: LoginResponse = { token, drt: Number(drt), nome: 'Usuário Local', cargo: 'Usuário' };

      try {
        if (this.isBrowser()) {
          localStorage.setItem(this.tokenKey, token);
        }
        this.setUserFromResponse(res);
      } catch (e) {
        console.warn('Failed to persist local login', e);
      }

      return of(res).pipe(
        tap(() => {
        })
      );
    }

    return throwError(() => new Error('Credenciais inválidas'));
  }

  getToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem(this.tokenKey);
  }

  logout(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
    this.userSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUser(): { nome: string; cargo: string; drt: number } | null {
    return this.readUserFromStorage();
  }

  /**
   * Extracts user info from a login response and persists it.
   * This is defensive: accepts multiple common field names used by backends.
   */
  setUserFromResponse(res: any): void {
    if (!res) return;
    const drt = res.drt ?? res.drtUsuario ?? res.drt_user ?? res.user?.drt ?? null;

    const nome =
      res.nome ??
      res.name ??
      res.nomeUsuario ??
      res.usuario?.nome ??
      res.user?.name ??
      null;

    const cargo =
      res.cargo ??
      res.role ??
      res.funcao ??
      res.cargoUsuario ??
      res.user?.cargo ??
      res.user?.role ??
      null;

    const user = { nome, cargo, drt };
    try {
      if (this.isBrowser()) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
      }
      this.userSubject.next(user);
    } catch (e) {
      console.warn('Failed to persist user info', e);
    }
  }

  private readUserFromStorage(): { nome: string; cargo: string; drt: number } | null {
    try {
      // durante server-side rendering (prerender) localStorage não existe
      if (!this.isBrowser()) {
        return null;
      }
      const raw = localStorage.getItem(this.userKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  private isBrowser(): boolean {
    try {
      return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
    } catch (e) {
      return false;
    }
  }
}
