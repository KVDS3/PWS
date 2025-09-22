import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Productos } from '../productos/productos';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private apiUrl = 'http://localhost:3000/productos';

  constructor(private http: HttpClient) {}

  getProductos(): Observable<Productos[]> {
    return this.http.get<Productos[]>(this.apiUrl);
  }

  addProducto(producto: Productos): Observable<Productos> {
    return this.http.post<Productos>(this.apiUrl, producto);
  }
}
