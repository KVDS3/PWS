import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../models/usuarios';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Listar usuarios
  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios`);
  }

  // Crear usuario directamente
  addUsuario(usuario: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/usuarios`, usuario);
  }

  // Login
  loginUsuario(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/usuarios/login`, { email, password });
  }

  // Enviar código al correo
 sendVerificationCode(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/usuarios/send-code`, { email });
  }

  // Verificar código y registrar usuario - CON MANEJO DE ERRORES MEJORADO
  verifyAndRegister(usuarioData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/usuarios/verify-code`, usuarioData);
  }
  // Solo verificar código (opcional)
  verifyCode(email: string, code: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/usuarios/verify-code`, { email, code });
  }

  // Enviar código de recuperación
sendRecoveryCode(email: string): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/usuarios/recovery/send-code`, { email });
}

// Verificar código de recuperación
verifyRecoveryCode(email: string, code: string): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/usuarios/recovery/verify-code`, { email, code });
}

// Cambiar contraseña después de verificar
resetPassword(email: string, newPassword: string): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/usuarios/recovery/reset-password`, { email, newPassword });
}
loginWithGoogle(token: string): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/usuarios/google-login`, { token });
}

}
