import { Routes } from '@angular/router';
import { Usuarios } from './components/usuarios/usuarios';
import { Login } from './components/login/login';

export const routes: Routes = [
{
     path: '', 
     component: Usuarios
},
{
     path: 'login', 
     component: Login
}
];
