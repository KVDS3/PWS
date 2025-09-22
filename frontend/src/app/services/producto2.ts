import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Producto } from '../models/producto2';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private baseUrl = 'http://localhost:3000/api/productos2';

  constructor(private http: HttpClient) {}

  agregarProducto(producto: Producto): Observable<Producto> {
    return this.http.post<Producto>(this.baseUrl, producto);
  }

  obtenerProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.baseUrl);
  }

  eliminarProducto(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  actualizarProducto(id: number, producto: Producto): Observable<Producto> {
    return this.http.put<Producto>(`${this.baseUrl}/${id}`, producto);
  }
}
