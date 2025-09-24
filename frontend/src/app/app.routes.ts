import { Routes } from '@angular/router';
import { Usuarios } from './components/usuarios/usuarios';
import { Productos } from './components/productos/productos';
import { CarritoComponent } from './components/carrito/carrito';
import { ResumenCompra} from './components/resumen-compra/resumen-compra';
import { Pago } from './components/pago/pago';
import { Login } from './components/login/login';
import { Mapa } from './components/mapa/mapa';
import { AgregarProductosAdmin } from './components/agregar-productos-admin/agregar-productos-admin';
import { config } from 'rxjs';
import { Configuracion } from './components/configuracion/configuracion';

export const routes: Routes = [
  { path: 'usuarios', component: Usuarios },
  { path: 'productos', component: Productos },
  { path: 'carrito', component: CarritoComponent },
  { path: 'resumen', component: ResumenCompra },
  { path: 'pago', component: Pago },

{
     path: '', 
     component: Login
},

{
     path: 'mapa', 
     component: Mapa
},
{
     path: 'agregarProducto', 
     component: AgregarProductosAdmin
},
{
     path: 'configuracion', 
     component: Configuracion
}
];
