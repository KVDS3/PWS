import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuarios';
import { Usuario } from '../../models/usuarios';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule], // 👈 Importa para usar *ngFor y ngModel
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css']
})
export class Usuarios implements OnInit {
  usuarios: Usuario[] = [];

  // 👇 Define el objeto que usas en el formulario
  nuevoUsuario: Usuario = {
    nombre: '',
    email: '',
    password: '',
    rol: 'lector'
  };

  constructor(private usuarioService: UsuarioService) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.usuarioService.getUsuarios().subscribe(data => {
      this.usuarios = data;
    });
  }

  // Cambié el nombre para que coincida con el HTML
  crearUsuario(): void {
    this.usuarioService.addUsuario(this.nuevoUsuario).subscribe(usuario => {
      this.usuarios.push(usuario);
      // Reiniciar formulario
      this.nuevoUsuario = { nombre: '', email: '', password: '', rol: 'lector' };
    });
  }
}
