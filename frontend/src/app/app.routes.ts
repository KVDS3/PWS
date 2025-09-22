import { Routes } from '@angular/router';
import { Usuarios } from './components/usuarios/usuarios';
import { Login } from './components/login/login';
import { Mapa } from './components/mapa/mapa';
import { AgregarProductosAdmin } from './components/agregar-productos-admin/agregar-productos-admin';

export const routes: Routes = [
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
