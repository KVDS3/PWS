import { Routes } from '@angular/router';
import { Usuarios } from './components/usuarios/usuarios';
import { Productos } from './components/productos/productos';
import { CarritoComponent } from './components/carrito/carrito';
import { ResumenCompra} from './components/resumen-compra/resumen-compra';
import { Pago } from './components/pago/pago';
import { Login } from './components/login/login';
import { Mapa } from './components/mapa/mapa';
import { AgregarProductosAdmin } from './components/agregar-productos-admin/agregar-productos-admin';

export const routes: Routes = [
  { path: '', component: Usuarios },
  { path: 'productos', component: Productos },
  { path: 'carrito', component: CarritoComponent },
  { path: 'resumen', component: ResumenCompra },
  { path: 'pago', component: Pago },
{
     path: '', 
     component: Usuarios
},
{
     path: 'login', 
     component: Login
},
{
     path: 'mapa', 
     component: Mapa
},
{
     path: 'agregarProducto', 
     component: AgregarProductosAdmin
}
];
