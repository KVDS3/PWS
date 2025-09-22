import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Producto } from '../../models/producto2';
import { ProductoService } from '../../services/producto2';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css']
})
export class Productos implements OnInit {
  productos: Producto[] = [];
  productosFiltrados: Producto[] = []; // <- AÑADIDO: Lista filtrada
  mensajeCarrito = '';
  mostrarMensaje = false;
  hover: boolean = false;
  hoverBtn: boolean = false;

  constructor(
    private productoService: ProductoService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.productoService.obtenerProductos().subscribe({
      next: data => {
        this.productos = data;
        this.productosFiltrados = [...data]; // <- AÑADIDO: Inicializar lista filtrada
        this.cdr.detectChanges();
      },
      error: err => console.error(err)
    });
  }

  // <- AÑADIDO: Función para buscar productos
  buscarProductos(event: any): void {
    const searchTerm = event.target.value.toLowerCase();
    
    if (!searchTerm) {
      this.productosFiltrados = [...this.productos];
      return;
    }
    
    this.productosFiltrados = this.productos.filter(producto => 
      producto.nombre.toLowerCase().includes(searchTerm)
    );
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