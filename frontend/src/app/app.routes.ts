import { Routes } from '@angular/router';
import { Usuarios } from './components/usuarios/usuarios';
import { Productos } from './components/productos/productos';
import { Carrito } from './components/carrito/carrito';
import { ResumenCompra} from './components/resumen-compra/resumen-compra';
import { Pago } from './components/pago/pago';

export const routes: Routes = [
  { path: '', component: Usuarios },
  { path: 'productos', component: Productos },
  { path: 'carrito', component: Carrito },
  { path: 'resumen', component: ResumenCompra },
  { path: 'pago', component: Pago }
];
