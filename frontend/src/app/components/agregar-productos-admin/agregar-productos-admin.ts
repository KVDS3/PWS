import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductoService } from '../../services/producto2';
import { Producto } from '../../models/producto2';

@Component({
  selector: 'app-agregar-productos-admin',
  templateUrl: './agregar-productos-admin.html',
  styleUrls: ['./agregar-productos-admin.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class AgregarProductosAdmin implements OnInit {
  productos: Producto[] = [];
  alertasStock: Producto[] = [];
  productoForm!: FormGroup;
  mostrarModal = false;
  modalTitle = '';
  modalMessage = '';
  productoEditando: Producto | null = null;
  modoEdicion = false;
  mostrarDetalleAlertas = false;

  // Opciones para select
  categorias = ['Electrónica', 'Ropa', 'Alimentos', 'Hogar', 'Oficina', 'Otros'];
  unidades = ['Unidad', 'Kg', 'Litro', 'Paquete', 'Caja'];

  constructor(
    private fb: FormBuilder,
    private productoService: ProductoService
  ) {}

  ngOnInit(): void {
    this.inicializarFormulario();
    this.obtenerProductos();
    this.obtenerAlertasStock();
  }

  inicializarFormulario(): void {
    this.productoForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      precio: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      codigo: [''],
      categoria: [''],
      unidad: [''],
      stock_minimo: [0, [Validators.min(0)]]
    });
  }

  obtenerProductos(): void {
    this.productoService.obtenerProductos().subscribe({
      next: (data) => {
        this.productos = data;
      },
      error: (err) => {
        console.error('Error al obtener productos', err);
        this.mostrarModalMensaje('Error', 'No se pudieron cargar los productos');
      }
    });
  }

  obtenerAlertasStock(): void {
    this.productoService.obtenerAlertasStock().subscribe({
      next: (data) => {
        this.alertasStock = data;
      },
      error: (err) => {
        console.error('Error al obtener alertas', err);
      }
    });
  }

  agregarProducto(): void {
    if (this.productoForm.valid) {
      if (this.modoEdicion && this.productoEditando) {
        this.actualizarProducto();
      } else {
        this.crearProducto();
      }
    }
  }

  crearProducto(): void {
    const nuevoProducto: Producto = this.productoForm.value;

    this.productoService.agregarProducto(nuevoProducto).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response); // Para debug
        if (response.ok) {
          this.productos.unshift(response.producto);
          this.limpiarFormulario();
          this.mostrarModalMensaje('Éxito', 'Producto agregado correctamente');
          this.obtenerAlertasStock(); // Actualizar alertas
        }
      },
      error: (err) => {
        console.error('Error completo al agregar producto:', err);
        console.error('Error detallado:', err.error);
        this.mostrarModalMensaje('Error', err.error?.error || 'No se pudo agregar el producto');
      }
    });
  }

  actualizarProducto(): void {
    if (!this.productoEditando?.id) return;

    const productoActualizado: Producto = {
      ...this.productoForm.value,
      id: this.productoEditando.id
    };

    this.productoService.actualizarProducto(this.productoEditando.id, productoActualizado).subscribe({
      next: (producto) => {
        const index = this.productos.findIndex(p => p.id === producto.id);
        if (index !== -1) {
          this.productos[index] = producto;
        }
        
        this.limpiarFormulario();
        this.mostrarModalMensaje('Éxito', 'Producto actualizado correctamente');
        this.obtenerAlertasStock(); // Actualizar alertas
      },
      error: (err) => {
        console.error('Error al actualizar producto', err);
        this.mostrarModalMensaje('Error', 'No se pudo actualizar el producto');
      }
    });
  }

  editarProducto(producto: Producto): void {
    this.productoEditando = producto;
    this.modoEdicion = true;
    
    this.productoForm.patchValue({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio,
      stock: producto.stock || 0,
      codigo: producto.codigo || '',
      categoria: producto.categoria || '',
      unidad: producto.unidad || '',
      stock_minimo: producto.stock_minimo || 0
    });

    document.querySelector('.product-form-container')?.scrollIntoView({ behavior: 'smooth' });
  }

  eliminarProducto(id: number): void {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      this.productoService.eliminarProducto(id).subscribe({
        next: () => {
          this.productos = this.productos.filter(p => p.id !== id);
          this.mostrarModalMensaje('Éxito', 'Producto eliminado correctamente');
          this.obtenerAlertasStock(); // Actualizar alertas
        },
        error: (err) => {
          console.error('Error al eliminar producto', err);
          this.mostrarModalMensaje('Error', 'No se pudo eliminar el producto');
        }
      });
    }
  }

  limpiarFormulario(): void {
    this.productoForm.reset({
      nombre: '',
      descripcion: '',
      precio: 0,
      stock: 0,
      codigo: '',
      categoria: '',
      unidad: '',
      stock_minimo: 0
    });
    this.productoEditando = null;
    this.modoEdicion = false;
  }

  mostrarModalMensaje(titulo: string, mensaje: string): void {
    this.modalTitle = titulo;
    this.modalMessage = mensaje;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.modalTitle = '';
    this.modalMessage = '';
  }

  // Getters para los controles del formulario
  get nombre() { return this.productoForm.get('nombre'); }
  get precio() { return this.productoForm.get('precio'); }
  get stock() { return this.productoForm.get('stock'); }
  get stock_minimo() { return this.productoForm.get('stock_minimo'); }
}