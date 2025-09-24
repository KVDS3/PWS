import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Producto } from '../../models/producto2';
import { ProductoService } from '../../services/producto2';
import { ConfiguracionService } from '../../services/configuracion';
import { Configuracion } from '../../models/configuracion';
import { Mapa } from '../mapa/mapa'; // ajusta la ruta correcta

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule,Mapa],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css']
})
export class Productos implements OnInit, AfterViewInit {
  productos: Producto[] = [];
  productosFiltrados: Producto[] = [];
  mensajeCarrito = '';
  mostrarMensaje = false;
  hover: boolean = false;
  hoverBtn: boolean = false;
  configuracion: Configuracion | null = null;
  usuarioId: number | null = null;
  temaAplicado: boolean = false;
mostrarModalMapa = false;

  constructor(
    private productoService: ProductoService,
    private configuracionService: ConfiguracionService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.obtenerUsuarioId();
    this.cargarProductos();
    
    // Verificación adicional después de un tiempo
    setTimeout(() => {
      this.verificarTema();
    }, 2000);
  }

  ngAfterViewInit(): void {
    // Esperar a que el componente esté en el DOM antes de aplicar el tema
    setTimeout(() => {
      this.cargarConfiguracion();
    });
  }

  obtenerUsuarioId(): void {
    const usuarioData = localStorage.getItem('usuario');
    console.log('Usuario data:', usuarioData);
    if (usuarioData) {
      const usuario = JSON.parse(usuarioData);
      this.usuarioId = usuario.id;
      console.log('Usuario ID:', this.usuarioId);
    }
  }

  cargarConfiguracion(): void {
    if (this.usuarioId) {
      this.configuracionService.obtenerConfiguracion(this.usuarioId).subscribe({
        next: (config) => {
          if (config && config.tema) {
            this.configuracion = config;
            console.log('Configuración cargada:', config);
            this.aplicarTema(config.tema);
          } else {
            console.warn('Configuración no encontrada, usando tema por defecto');
            this.aplicarTema('claro');
          }
        },
        error: (err) => {
          console.error('Error cargando configuración:', err);
          this.cargarConfiguracionLocal();
        }
      });
    } else {
      console.warn('No hay usuario ID, usando tema claro por defecto');
      this.aplicarTema('claro');
    }
  }

  cargarConfiguracionLocal(): void {
    const configLocal = localStorage.getItem('configuracionUsuario');
    if (configLocal) {
      try {
        const config = JSON.parse(configLocal);
        console.log('Configuración local cargada:', config);
        this.aplicarTema(config.tema || 'claro');
      } catch (e) {
        console.error('Error parseando configuración local:', e);
        this.aplicarTema('claro');
      }
    } else {
      console.warn('No hay configuración local, usando tema claro');
      this.aplicarTema('claro');
    }
  }

  aplicarTema(tema: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('No es browser, no se aplica tema');
      return;
    }

    console.log('Solicitando aplicar tema:', tema);
    
    // Usar diferentes estrategias para asegurar que se aplique
    this.aplicarTemaConTimeout(tema);
  }

  private aplicarTemaConTimeout(tema: string): void {
    // Intentar aplicar inmediatamente
    this.intentarAplicarTema(tema);
    
    // Intentar nuevamente después de un delay por si el DOM no está listo
    setTimeout(() => {
      this.intentarAplicarTema(tema);
    }, 100);
    
    // Último intento después de más tiempo
    setTimeout(() => {
      this.intentarAplicarTema(tema);
    }, 500);
  }

  private intentarAplicarTema(tema: string): void {
    try {
      const body = document.body;
      if (!body) {
        console.log('Body no disponible, reintentando...');
        return;
      }

      console.log('Aplicando tema real:', tema);
      console.log('Clases antes:', body.classList.toString());

      // Remover todos los temas
      body.classList.remove('tema-claro', 'tema-oscuro');
      
      // Pequeña pausa para asegurar la remoción
      setTimeout(() => {
        body.classList.add(`tema-${tema}`);
        console.log('Clases después:', body.classList.toString());
        
        // Forzar detección de cambios
        this.cdr.detectChanges();
        
        this.temaAplicado = true;
        console.log('Tema aplicado exitosamente:', tema);
        
        // Verificación final
        this.verificarAplicacionTema();
      }, 10);
      
    } catch (error) {
      console.error('Error aplicando tema:', error);
    }
  }

  private verificarAplicacionTema(): void {
    const body = document.body;
    const tieneOscuro = body.classList.contains('tema-oscuro');
    const tieneClaro = body.classList.contains('tema-claro');
    
    console.log('=== VERIFICACIÓN TEMA ===');
    console.log('Tiene oscuro:', tieneOscuro);
    console.log('Tiene claro:', tieneClaro);
    console.log('Clases completas:', body.classList.toString());
    
    if (this.configuracion?.tema === 'oscuro' && !tieneOscuro) {
      console.warn('El tema oscuro no se aplicó correctamente, forzando...');
      body.classList.remove('tema-claro');
      body.classList.add('tema-oscuro');
    }
  }

  verificarTema(): void {
    console.log('=== VERIFICACIÓN COMPLETA DE TEMA ===');
    console.log('Usuario ID:', this.usuarioId);
    console.log('Configuración:', this.configuracion);
    console.log('Tema aplicado:', this.temaAplicado);
    console.log('Clases body actuales:', document.body.classList.toString());
    
    if (this.configuracion?.tema === 'oscuro') {
      console.log('Forzando aplicación de tema oscuro...');
      this.aplicarTema('oscuro');
    }
  }

  cargarProductos(): void {
    this.productoService.obtenerProductos().subscribe({
      next: data => {
        this.productos = data;
        this.productosFiltrados = [...data];
        this.cdr.detectChanges();
      },
      error: err => console.error('Error cargando productos:', err)
    });
  }

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
    if (!isPlatformBrowser(this.platformId)) return;

    const data = localStorage.getItem('carrito');
    let carrito: any[] = data ? JSON.parse(data) : [];

    const index = carrito.findIndex(p => p.id === producto.id);

    if (index > -1) {
      carrito[index].cantidad += 1;
    } else {
      carrito.push({ ...producto, cantidad: 1 });
    }

    localStorage.setItem('carrito', JSON.stringify(carrito));

    this.mensajeCarrito = `${producto.nombre} agregado al carrito!`;
    this.mostrarMensaje = true;

    setTimeout(() => this.mostrarMensaje = false, 3000);
  }

  irAlCarrito() {
    this.router.navigate(['/carrito']);
  }

  cambiarTema(nuevoTema: 'claro' | 'oscuro'): void {
    console.log('Cambiando tema manualmente a:', nuevoTema);
    
    if (this.usuarioId) {
      this.configuracionService.actualizarTema(this.usuarioId, nuevoTema).subscribe({
        next: () => {
          if (this.configuracion) {
            this.configuracion.tema = nuevoTema;
          }
          this.aplicarTema(nuevoTema);
          console.log('Tema actualizado en servidor');
        },
        error: (err) => console.error('Error al cambiar tema:', err)
      });
    } else {
      this.aplicarTema(nuevoTema);
    }
  }

  // Método para debug rápido
  debugTema(): void {
    this.cambiarTamañoTexto();
    this.aplicarTema('oscuro');
  }
abrirMapa() {
  this.mostrarModalMapa = true;
}

cerrarMapa() {
  this.mostrarModalMapa = false;
}
  private cambiarTamañoTexto(): void {
    const style = document.createElement('style');
    style.innerHTML = `
      body.tema-oscuro::before {
        content: 'TEMA OSCURO ACTIVO - USUARIO ${this.usuarioId}' !important;
        position: fixed !important;
        top: 10px !important;
        left: 10px !important;
        background: #ff0000 !important;
        color: white !important;
        padding: 10px !important;
        z-index: 99999 !important;
        font-size: 14px !important;
        font-weight: bold !important;
        border: 2px solid white !important;
      }
    `;
    document.head.appendChild(style);
  }
}