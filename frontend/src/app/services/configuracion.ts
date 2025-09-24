import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Configuracion } from '../models/configuracion';

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService {
  private baseUrl = 'http://localhost:3000/api/configuraciones';

  constructor(private http: HttpClient) {}

    crearConfiguracion(usuario_id: number): Observable<Configuracion> {
    const configPorDefecto = {
      usuario_id,
      tema: 'claro',
      color_acento: 'azul',
      tamano_fuente: 'medio',
      notificaciones: {
        emailOfertas: true,
        emailPedidos: true,
        emailNewsletter: false,
        pushTiempoReal: true,
        pushCarrito: false
      },
      privacidad: {
        perfilPublico: true,
        datosUso: true,
        anunciosPersonalizados: false
      },
      idioma: 'es',
      moneda: 'USD',
      zona_horaria: '-5'
    };
    
    return this.http.post<Configuracion>(this.baseUrl, configPorDefecto);
  }
  // Obtener configuración por usuario
  obtenerConfiguracion(usuario_id: number): Observable<Configuracion> {
    return this.http.get<Configuracion>(`${this.baseUrl}/${usuario_id}`);
  }

  // Actualizar configuración
  actualizarConfiguracion(usuario_id: number, config: Partial<Configuracion>): Observable<Configuracion> {
    return this.http.put<Configuracion>(`${this.baseUrl}/${usuario_id}`, config);
  }
  actualizarTema(usuarioId: number, tema: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${usuarioId}`, { tema });
  }
}
