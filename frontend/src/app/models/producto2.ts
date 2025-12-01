// producto2.ts
export interface Producto {
  id?: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock?: number;
  codigo?: string;
  categoria?: string;
  unidad?: string;
  stock_minimo?: number;
}