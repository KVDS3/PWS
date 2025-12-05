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

  nombreUsuario: string = 'Usuario';
  rolUsuario: string = '';
  emailUsuario: string = '';

  categorias = ['Electrónica', 'Ropa', 'Alimentos', 'Hogar', 'Oficina', 'Otros'];
  unidades = ['Unidad', 'Kg', 'Litro', 'Paquete', 'Caja'];

  constructor(
    private fb: FormBuilder,
    private productoService: ProductoService
  ) {}

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.inicializarFormulario();
    this.obtenerProductos();
    this.obtenerAlertasStock();
  }

  cargarDatosUsuario(): void {
    const usuarioData = localStorage.getItem('usuario');
    if (usuarioData) {
      try {
        const usuario = JSON.parse(usuarioData);
        this.nombreUsuario = usuario.nombre || 'Administrador';
        this.rolUsuario = usuario.rol || 'admin';
        this.emailUsuario = usuario.email || '';
      } catch (e) {
        console.error('Error al leer datos del usuario', e);
      }
    }
  }

  get avatarUrl(): string {
    const nombreParaUrl = encodeURIComponent(this.nombreUsuario);
    return `https://ui-avatars.com/api/?name=${nombreParaUrl}&background=4361ee&color=fff`;
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

  // 🔹 FUNCIÓN PARA GENERAR Y DESCARGAR EL REPORTE
  generarReporte(): void {
    this.productoService.descargarReporteExcel().subscribe({
      next: (blob) => {
        // Crear URL temporal
        const url = window.URL.createObjectURL(blob);
        // Crear elemento 'a' invisible
        const a = document.createElement('a');
        a.href = url;
        // Nombre del archivo con fecha
        const fecha = new Date().toISOString().slice(0, 10);
        a.download = `Reporte_Inventario_${fecha}.xlsx`;
        
        // Simular clic
        document.body.appendChild(a);
        a.click();
        
        // Limpiar
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.mostrarModalMensaje('Reporte Generado', 'El archivo Excel se ha descargado correctamente.');
      },
      error: (err) => {
        console.error(err);
        this.mostrarModalMensaje('Error', 'No se pudo generar el reporte.');
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
    this.productoService.agregarProducto(nuevoProducto, this.emailUsuario).subscribe({
      next: (response) => {
        if (response.ok) {
          this.productos.unshift(response.producto);
          this.limpiarFormulario();
          this.mostrarModalMensaje('Éxito', 'Producto agregado correctamente y notificación enviada.');
          this.obtenerAlertasStock();
        }
      },
      error: (err) => {
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

    this.productoService.actualizarProducto(this.productoEditando.id, productoActualizado, this.emailUsuario).subscribe({
      next: (producto) => {
        const index = this.productos.findIndex(p => p.id === producto.id);
        if (index !== -1) {
          this.productos[index] = producto;
        }
        this.limpiarFormulario();
        this.mostrarModalMensaje('Éxito', 'Producto actualizado correctamente y notificación enviada.');
        this.obtenerAlertasStock();
      },
      error: (err) => {
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
      this.productoService.eliminarProducto(id, this.emailUsuario).subscribe({
        next: () => {
          this.productos = this.productos.filter(p => p.id !== id);
          this.mostrarModalMensaje('Éxito', 'Producto eliminado correctamente');
          this.obtenerAlertasStock();
        },
        error: (err) => {
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

  get nombre() { return this.productoForm.get('nombre'); }
  get precio() { return this.productoForm.get('precio'); }
  get stock() { return this.productoForm.get('stock'); }
  get stock_minimo() { return this.productoForm.get('stock_minimo'); }
}