import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Producto } from '../models/producto2';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private baseUrl = 'http://localhost:3000/api/productos';

  constructor(private http: HttpClient) {}

  agregarProducto(producto: Producto, usuarioEmail?: string): Observable<any> {
    const body = { ...producto, usuarioEmail };
    return this.http.post<any>(this.baseUrl, body);
  }

  obtenerProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.baseUrl);
  }

  obtenerAlertasStock(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.baseUrl}/alertas`);
  }

  // 🔹 NUEVO MÉTODO PARA DESCARGAR EXCEL
  // 'responseType: blob' es crucial para archivos binarios
  descargarReporteExcel(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/reporte-excel`, {
      responseType: 'blob' 
    });
  }

  eliminarProducto(id: number, usuarioEmail?: string): Observable<any> {
    const url = usuarioEmail 
      ? `${this.baseUrl}/${id}?usuarioEmail=${usuarioEmail}` 
      : `${this.baseUrl}/${id}`;
    return this.http.delete(url);
  }

  actualizarProducto(id: number, producto: Producto, usuarioEmail?: string): Observable<Producto> {
    const body = { ...producto, usuarioEmail };
    return this.http.put<Producto>(`${this.baseUrl}/${id}`, body);
  }
}