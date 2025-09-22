import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Producto } from '../../models/producto';
import { ProductosService } from '../../services/productos.service';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css']
})
export class Productos implements OnInit {
  productos: Producto[] = [];
  mensajeCarrito = '';
  mostrarMensaje = false;
  hover: boolean = false;
  hoverBtn: boolean = false;

  constructor(
    private productoService: ProductosService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.productoService.getProductos().subscribe({
      next: data => {
        this.productos = data;
        this.cdr.detectChanges();
      },
      error: err => console.error(err)
    });
  }

  agregarAlCarrito(producto: Producto) {
  const data = localStorage.getItem('carrito');
  let carrito: any[] = data ? JSON.parse(data) : [];

  // Buscar si el producto ya existe en el carrito
  const index = carrito.findIndex(p => p.id === producto.id);

  if (index > -1) {
    carrito[index].cantidad += 1; // aumentar cantidad
  } else {
    carrito.push({ ...producto, cantidad: 1 }); // agregar nuevo con cantidad
  }

  localStorage.setItem('carrito', JSON.stringify(carrito));

  this.mensajeCarrito = `${producto.nombre} agregado al carrito!`;
  this.mostrarMensaje = true;

  setTimeout(() => this.mostrarMensaje = false, 3000);
}

  irAlCarrito() {
    this.router.navigate(['/carrito']);
  }
}
