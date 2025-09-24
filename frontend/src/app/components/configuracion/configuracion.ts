import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfiguracionService } from '../../services/configuracion';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './configuracion.html',
  styleUrls: ['./configuracion.css']
})
export class Configuracion implements OnInit, OnDestroy {
  seccionActiva = 'perfil';
  usuario: any;
  fechaRegistro = 'Enero 2024';

  // Formularios
  perfilForm!: FormGroup;

  // Configuración por defecto
  notificaciones = {
    emailOfertas: true,
    emailPedidos: true,
    emailNewsletter: false,
    pushTiempoReal: true,
    pushCarrito: false
  };

  temaSeleccionado: string = 'claro';
  colorActivo: string = 'azul';
  tamanoFuente: string = 'medio';

  // Configuración de privacidad
  privacidad = {
    perfilPublico: true,
    datosUso: true,
    anunciosPersonalizados: false
  };

  // Configuración general
  idiomaSeleccionado = 'es';
  monedaSeleccionada = 'USD';
  zonaHoraria = '-5';

  // Modal
  mostrarModalPassword = false;
  autenticacionDosFactores = false;

  // Colores de acento disponibles
  coloresAcento = [
    { nombre: 'azul', codigo: '#4361ee' },
    { nombre: 'verde', codigo: '#38b000' },
    { nombre: 'rojo', codigo: '#f94144' },
    { nombre: 'morado', codigo: '#7209b7' },
    { nombre: 'naranja', codigo: '#f3722c' }
  ];

  private configSubscription: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private configuracionesService: ConfiguracionService
  ) {}

 ngOnInit() {
  this.cargarUsuario();
  this.inicializarFormularios();
  
  // Esperar un tick para asegurar que el DOM esté listo
  setTimeout(() => {
    this.cargarConfiguracionDesdeDB();
  }, 0);
}

  ngOnDestroy() {
    this.configSubscription.unsubscribe();
  }

  cargarUsuario() {
    const usuarioData = localStorage.getItem('usuario');
    this.usuario = usuarioData ? JSON.parse(usuarioData) : {
      nombre: 'Usuario Ejemplo',
      email: 'usuario@ejemplo.com'
    };
  }

  inicializarFormularios() {
    this.perfilForm = this.fb.group({
      nombre: [this.usuario?.nombre || '', Validators.required],
      email: [this.usuario?.email || '', [Validators.required, Validators.email]],
      telefono: [''],
      fechaNacimiento: [''],
      direccion: ['']
    });
  }

  cargarConfiguracionDesdeDB() {
    const usuarioId = this.obtenerUsuarioIdDelToken();
    
    if (!usuarioId) {
      console.log('No se pudo obtener el ID del usuario, usando configuración local');
      this.cargarConfiguracionLocal();
      return;
    }

    this.configSubscription = this.configuracionesService.obtenerConfiguracion(usuarioId).subscribe({
      next: (config: any) => {
        console.log('Configuración cargada desde DB:', config);
        
        if (config && config.tema) {
          this.aplicarConfiguracionDesdeDB(config);
        } else {
          this.usarConfiguracionPorDefecto(usuarioId);
        }
      },
      error: (err) => {
        console.error('Error cargando configuración desde DB:', err);
        this.cargarConfiguracionLocal();
      }
    });
  }

  aplicarConfiguracionDesdeDB(config: any) {
    console.log('Aplicando configuración desde DB:', config);
    
    // Aplicar tema y apariencia desde DB
    if (config.tema) {
      this.temaSeleccionado = config.tema;
      console.log('Tema aplicado:', this.temaSeleccionado);
    }
    
    if (config.color_acento) {
      this.colorActivo = config.color_acento;
    }
    
    if (config.tamano_fuente) {
      this.tamanoFuente = config.tamano_fuente;
    }

    // Manejar notificaciones - puede ser boolean o objeto
    if (config.notificaciones) {
      if (typeof config.notificaciones === 'boolean') {
        // Si es boolean, aplicar a todas las notificaciones
        this.notificaciones = {
          emailOfertas: config.notificaciones,
          emailPedidos: config.notificaciones,
          emailNewsletter: config.notificaciones,
          pushTiempoReal: config.notificaciones,
          pushCarrito: config.notificaciones
        };
      } else if (typeof config.notificaciones === 'object') {
        // Si es objeto, mezclar con los valores por defecto
        this.notificaciones = { ...this.notificaciones, ...config.notificaciones };
      }
    }

    // Manejar privacidad
    if (config.privacidad) {
      if (typeof config.privacidad === 'boolean') {
        this.privacidad = {
          perfilPublico: config.privacidad,
          datosUso: config.privacidad,
          anunciosPersonalizados: config.privacidad
        };
      } else if (typeof config.privacidad === 'object') {
        this.privacidad = { ...this.privacidad, ...config.privacidad };
      }
    }

    if (config.idioma) this.idiomaSeleccionado = config.idioma;
    if (config.moneda) this.monedaSeleccionada = config.moneda;
    if (config.zona_horaria) this.zonaHoraria = config.zona_horaria;

    // Aplicar el tema inmediatamente
    this.aplicarTema();
  }

  usarConfiguracionPorDefecto(usuarioId: number) {
    const configLocal = localStorage.getItem('configuracionUsuario');
    
    if (configLocal) {
      const configData = JSON.parse(configLocal);
      this.aplicarConfiguracionDesdeDB(configData);
    } else {
      this.crearConfiguracionPorDefecto(usuarioId);
    }
  }

  crearConfiguracionPorDefecto(usuarioId: number) {
    this.configuracionesService.crearConfiguracion(usuarioId).subscribe({
      next: (configCreada) => {
        console.log('Configuración por defecto creada en DB:', configCreada);
        this.aplicarTema();
      },
      error: (err) => {
        console.error('Error creando configuración por defecto:', err);
        this.aplicarTema();
      }
    });
  }

  cargarConfiguracionLocal() {
    const config = localStorage.getItem('configuracionUsuario');
    if (config) {
      const configData = JSON.parse(config);
      this.aplicarConfiguracionDesdeDB(configData);
    } else {
      this.aplicarTema();
    }
  }

  guardarConfiguracion() {
    const usuarioId = this.obtenerUsuarioIdDelToken();
    
    const configuracionActualizada: any = {
      tema: this.temaSeleccionado,
      color_acento: this.colorActivo,
      tamano_fuente: this.tamanoFuente,
      notificaciones: this.notificaciones,
      privacidad: this.privacidad,
      idioma: this.idiomaSeleccionado,
      moneda: this.monedaSeleccionada,
      zona_horaria: this.zonaHoraria
    };

    console.log('Guardando configuración:', configuracionActualizada);

    if (usuarioId) {
      this.configuracionesService.actualizarConfiguracion(usuarioId, configuracionActualizada).subscribe({
        next: (response) => {
          console.log('Configuración guardada en DB:', response);
          localStorage.setItem('configuracionUsuario', JSON.stringify(configuracionActualizada));
          this.mostrarMensaje('Configuración guardada correctamente');
        },
        error: (err) => {
          console.error('Error guardando en DB:', err);
          this.guardarConfiguracionLocal(configuracionActualizada);
        }
      });
    } else {
      this.guardarConfiguracionLocal(configuracionActualizada);
    }
  }

  guardarConfiguracionLocal(configuracion: any) {
    localStorage.setItem('configuracionUsuario', JSON.stringify(configuracion));
    this.mostrarMensaje('Configuración guardada localmente');
  }

  cambiarSeccion(seccion: string) {
    this.seccionActiva = seccion;
  }

  guardarPerfil() {
    if (this.perfilForm.valid) {
      const usuarioActualizado = { ...this.usuario, ...this.perfilForm.value };
      localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
      this.usuario = usuarioActualizado;
      this.mostrarMensaje('Perfil actualizado correctamente');
    }
  }

  cambiarTema(tema: string) {
    console.log('Cambiando tema a:', tema);
    this.temaSeleccionado = tema;
    this.aplicarTema();
    
    // Guardar automáticamente el tema cuando se cambie
    const usuarioId = this.obtenerUsuarioIdDelToken();
    if (usuarioId) {
      this.configuracionesService.actualizarTema(usuarioId, tema).subscribe({
        next: () => console.log('Tema actualizado en DB'),
        error: (err) => console.error('Error actualizando tema en DB:', err)
      });
    }
  }

 aplicarTema() {
  console.log('Cambiando tema a:', this.temaSeleccionado);
  
  const body = document.body;
  const wrapper = document.querySelector('.configuracion-wrapper') as HTMLElement;
  
  // Remover clases anteriores
  body.classList.remove('tema-claro', 'tema-oscuro', 'tema-auto');
  if (wrapper) {
    wrapper.classList.remove('tema-claro', 'tema-oscuro', 'tema-auto');
  }
  
  // Aplicar estilos DIRECTAMENTE via JavaScript
  if (this.temaSeleccionado === 'oscuro') {
    body.style.background = 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)';
    body.style.color = '#e0e0e0';
    body.style.transition = 'all 0.3s ease';
    
    if (wrapper) {
      wrapper.style.background = 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)';
      wrapper.style.color = '#e0e0e0';
    }
  } else {
    body.style.background = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
    body.style.color = '#333333';
    body.style.transition = 'all 0.3s ease';
    
    if (wrapper) {
      wrapper.style.background = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
      wrapper.style.color = '#333333';
    }
  }
  
  // Añadir clase para referencia
  body.classList.add(`tema-${this.temaSeleccionado}`);
  if (wrapper) {
    wrapper.classList.add(`tema-${this.temaSeleccionado}`);
  }
  
  console.log('Tema aplicado directamente via JavaScript');
}
  aplicarColorAcento() {
    const colorEncontrado = this.coloresAcento.find(c => c.nombre === this.colorActivo);
    if (colorEncontrado) {
      document.documentElement.style.setProperty('--color-primario', colorEncontrado.codigo);
    }
  }

  aplicarTamanoFuente() {
    document.body.classList.remove('tamano-pequeno', 'tamano-medio', 'tamano-grande');
    document.body.classList.add(`tamano-${this.tamanoFuente}`);
  }

  seleccionarColor(color: string) {
    this.colorActivo = color;
    this.aplicarColorAcento();
  }

  cambiarTamanoFuente(tamano: string) {
    this.tamanoFuente = tamano;
    this.aplicarTamanoFuente();
  }

  toggleNotificacion(tipo: keyof typeof this.notificaciones, event: any) {
    this.notificaciones[tipo] = event.target.checked;
  }

  togglePrivacidad(tipo: keyof typeof this.privacidad, event: any) {
    this.privacidad[tipo] = event.target.checked;
  }

  mostrarCambioPassword() {
    this.mostrarModalPassword = true;
  }

  cerrarModalPassword() {
    this.mostrarModalPassword = false;
  }

  toggleAutenticacionDosFactores(event: any) {
    this.autenticacionDosFactores = event.target.checked;
  }

  verSesionesActivas() {
    this.mostrarMensaje('Funcionalidad en desarrollo');
  }

  cambiarIdioma(event: any) {
    this.idiomaSeleccionado = event.target.value;
  }

  cambiarMoneda(event: any) {
    this.monedaSeleccionada = event.target.value;
  }

  cambiarZonaHoraria(event: any) {
    this.zonaHoraria = event.target.value;
  }

  mostrarMensaje(mensaje: string) {
    const toast = document.createElement('div');
    toast.textContent = mensaje;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--color-primario, #4361ee);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      z-index: 10000;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  }

  private obtenerUsuarioIdDelToken(): number | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || payload.sub || null;
    } catch (err) {
      console.error('Error decodificando token:', err);
      return null;
    }
  }
}