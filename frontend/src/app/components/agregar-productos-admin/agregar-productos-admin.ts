import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ProductoService } from '../../services/producto';
import { Producto } from '../../models/producto';

@Component({
  selector: 'app-agregar-productos-admin',
  templateUrl: './agregar-productos-admin.html',
  styleUrls: ['./agregar-productos-admin.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class AgregarProductosAdmin implements OnInit {
  productos: Producto[] = [];
  productoForm: FormGroup;

  constructor(private productoService: ProductoService, private fb: FormBuilder) {
    this.productoForm = this.fb.group({
      nombre: [''],
      descripcion: [''],
      precio: [''],
      stock: ['']
    });
  }

  ngOnInit() {
    this.cargarProductos();
  }

  cargarProductos() {
    this.productoService.obtenerProductos().subscribe({
      next: data => this.productos = data,
      error: err => console.error(err)
    });
  }

  agregarProducto() {
    if (!this.productoForm.valid) return;

    const producto: Producto = this.productoForm.value;

    this.productoService.agregarProducto(producto).subscribe({
      next: data => {
        this.productos.unshift(data);
        this.productoForm.reset();
        this.mostrarModal();
      },
      error: err => console.error(err)
    });
  }

  eliminarProducto(id: number) {
    this.productoService.eliminarProducto(id).subscribe({
      next: () => this.productos = this.productos.filter(p => p.id !== id),
      error: err => console.error(err)
    });
  }

  mostrarModal() {
    const modal = document.querySelector('.modal-backdrop') as HTMLElement;
    if (modal) modal.style.display = 'flex';
  }

  cerrarModal() {
    const modal = document.querySelector('.modal-backdrop') as HTMLElement;
    if (modal) modal.style.display = 'none';
  }
}
