import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuarios';
import { Usuario } from '../../models/usuarios';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css']
})
export class Usuarios implements OnInit {
  usuarios: Usuario[] = [];

  nuevoUsuario: Usuario = {
    nombre: '',
    email: '',
    password: '',
    rol: 'lector'
  };

  constructor(
    private usuarioService: UsuarioService,
    private cdr: ChangeDetectorRef // 🔹 Injectamos ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.usuarioService.getUsuarios().subscribe({
      next: data => {
        console.log('Usuarios cargados:', data);
        this.usuarios = data;
        this.cdr.detectChanges(); // 🔹 Forzamos actualización de la vista
      },
      error: err => console.error('Error cargando usuarios:', err)
    });
  }

  crearUsuario(): void {
    this.usuarioService.addUsuario(this.nuevoUsuario).subscribe({
      next: usuario => {
        // Recargar todos los usuarios desde el backend
        this.cargarUsuarios();
        // Reiniciar formulario
        this.nuevoUsuario = { nombre: '', email: '', password: '', rol: 'lector' };
      },
      error: err => console.error('Error creando usuario:', err)
    });
  }
}
