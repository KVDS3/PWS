import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:3000'; // URL de tu backend

  constructor(private http: HttpClient) {}

  // ------------------
  // Productos
  // ------------------
  getProductos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/productos`);
  }

  // ------------------
  // Carrito
  // ------------------
  agregarAlCarrito(usuarioId: number, productoId: number, cantidad: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/carrito`, { usuarioId, productoId, cantidad });
  }

  getCarrito(usuarioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/carrito/${usuarioId}`);
  }

  actualizarCantidad(usuarioId: number, productoId: number, cantidad: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/carrito`, { usuarioId, productoId, cantidad });
  }

  eliminarDelCarrito(usuarioId: number, productoId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/carrito/${usuarioId}/${productoId}`);
  }

  // ------------------
  // Pago
  // ------------------
  pagar(usuarioId: number, total: number, metodo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/pago`, { usuarioId, total, metodo });
  }

  // ------------------
  // Historial / Resumen
  // ------------------
  getResumen(usuarioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/resumen/${usuarioId}`);
  }
}
