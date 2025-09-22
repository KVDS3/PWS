import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductoService } from '../../services/producto2';  // ✅ Nombre correcto del servicio
import { Producto } from '../../models/producto2';           // ✅ Modelo correcto

@Component({
  selector: 'app-agregar-productos-admin',
  templateUrl: './agregar-productos-admin.html',
  styleUrls: ['./agregar-productos-admin.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class AgregarProductosAdmin implements OnInit {
  productos: Producto[] = [];
  productoForm!: FormGroup;
  mostrarModal = false;

  constructor(
    private fb: FormBuilder,
    private productoService: ProductoService
  ) {}

  ngOnInit(): void {
    this.productoForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      precio: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]]
    });

    // 🚨 Traer productos al iniciar
    this.obtenerProductos();
  }

  obtenerProductos(): void {
    this.productoService.obtenerProductos().subscribe({
      next: (data) => {
        this.productos = data;
      },
      error: (err) => {
        console.error('Error al obtener productos', err);
      }
    });
  }

  agregarProducto(): void {
    if (this.productoForm.valid) {
      const nuevoProducto: Producto = this.productoForm.value;

      this.productoService.agregarProducto(nuevoProducto).subscribe({
        next: (productoGuardado) => {
          this.productos.push(productoGuardado);
          this.productoForm.reset();
          this.mostrarModal = true; // ✅ Abre modal de éxito
        },
        error: (err) => {
          console.error('Error al agregar producto', err);
        }
      });
    }
  }

  eliminarProducto(id: number): void {
    this.productoService.eliminarProducto(id).subscribe({
      next: () => {
        this.productos = this.productos.filter(p => p.id !== id);
      },
      error: (err) => {
        console.error('Error al eliminar producto', err);
      }
    });
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }
}
