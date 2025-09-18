import { Component, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuarioService } from '../../services/usuarios';
import { Usuario } from '../../models/usuarios';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  imports: [CommonModule, FormsModule]
})
export class Login implements OnDestroy {
  // pestañas disponibles
  selectedTab: 'login' | 'register' | 'recovery' | 'verify' = 'login';

  // Login
  email: string = '';
  password: string = '';
  error: string = '';
  isLoading: boolean = false;
  usuario: any = null;

  // Registro
  nuevoUsuario: any = { nombre: '', email: '', password: '' };
  confirmPassword: string = '';
  verificationCode: string = '';

  // Recuperación
  recoveryEmail: string = '';
  recoveryPhone: string = '';

  // Contador para reenvío de código
  countdown: number = 60;
  countdownActive: boolean = false;
  countdownInterval: any;
  
  // Control para evitar múltiples clics
  isSendingCode: boolean = false;
  isVerifyingCode: boolean = false;

  // Control del modal de éxito
  showSuccessModal: boolean = false;

  // Suscripciones para gestionar la memoria
  private subscriptions: Subscription = new Subscription();

  constructor(
    private usuarioService: UsuarioService, 
    private router: Router,
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnDestroy(): void {
    // Limpiar todas las suscripciones al destruir el componente
    this.subscriptions.unsubscribe();
    
    // Limpiar el intervalo si existe
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  selectTab(tab: 'login' | 'register' | 'recovery' | 'verify'): void {
    this.selectedTab = tab;
    this.error = '';
    // Forzar detección de cambios de manera asíncrona
    setTimeout(() => this.cdRef.detectChanges(), 0);
  }

  // LOGIN
  onSubmit(): void {
    if (!this.email || !this.password) {
      this.error = 'Debes ingresar correo y contraseña';
      return;
    }
    
    this.isLoading = true;
    this.error = '';
    this.usuario = null;

    const loginSubscription = this.usuarioService.loginUsuario(this.email, this.password).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res && res.ok && res.usuario) {
          this.usuario = res.usuario;
          localStorage.setItem('usuario', JSON.stringify(res.usuario));
          this.router.navigate(['']);
        } else {
          this.error = 'Respuesta inesperada del servidor';
        }
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        this.isLoading = false;
        if (err.status === 404) {
          this.error = 'Servicio no disponible. Intente más tarde.';
        } else if (err.status === 401) {
          this.error = 'Credenciales incorrectas';
        } else {
          this.error = err.error?.error || 'Error en el servidor';
        }
        this.cdRef.detectChanges();
      }
    });

    this.subscriptions.add(loginSubscription);
  }

  onInputChange(field: string): void {
    if (this.error) {
      if ((field === 'email' && this.email) || (field === 'password' && this.password)) {
        this.error = '';
        this.cdRef.detectChanges();
      }
    }
  }

  // REGISTRO: enviar código - VERSIÓN MEJORADA
  onRegister(): void {
    console.log('onRegister called');
    
    // Prevenir múltiples clics
    if (this.isSendingCode) {
      console.log('Already sending code, ignoring click');
      return;
    }
    
    // Validaciones
    if (!this.nuevoUsuario.nombre || !this.nuevoUsuario.email || !this.nuevoUsuario.password) {
      this.error = 'Todos los campos son obligatorios';
      this.cdRef.detectChanges();
      return;
    }
    
    if (this.nuevoUsuario.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      this.cdRef.detectChanges();
      return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.nuevoUsuario.email)) {
      this.error = 'Por favor ingresa un correo electrónico válido';
      this.cdRef.detectChanges();
      return;
    }

    this.isSendingCode = true;
    this.error = '';
    this.cdRef.detectChanges();

    console.log('Sending verification code to:', this.nuevoUsuario.email);

    const sendCodeSubscription = this.usuarioService.sendVerificationCode(this.nuevoUsuario.email).subscribe({
      next: () => {
        console.log('Code sent successfully');
        this.isSendingCode = false;
        this.selectTab('verify');
        this.startCountdown();
      },
      error: (err: any) => {
        console.error('Error sending code:', err);
        this.isSendingCode = false;
        this.error = err.error?.error || 'Error enviando código. Por favor, inténtalo de nuevo.';
        this.cdRef.detectChanges();
      }
    });

    this.subscriptions.add(sendCodeSubscription);
  }

  // Iniciar contador para reenvío de código - VERSIÓN MEJORADA
  startCountdown(): void {
    this.countdownActive = true;
    this.countdown = 60;
    
    // Limpiar intervalo previo si existe
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    // Usar NgZone para asegurar la detección de cambios
    this.ngZone.runOutsideAngular(() => {
      this.countdownInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.countdown--;
          
          if (this.countdown <= 0) {
            clearInterval(this.countdownInterval);
            this.countdownActive = false;
          }
          
          // Forzar detección de cambios después de actualizar el contador
          this.cdRef.detectChanges();
        });
      }, 1000);
    });
  }

  // Reenviar código de verificación
  resendCode(): void {
    if (this.countdownActive) return;
    
    this.isSendingCode = true;
    this.cdRef.detectChanges();
    
    const resendSubscription = this.usuarioService.sendVerificationCode(this.nuevoUsuario.email).subscribe({
      next: () => {
        this.isSendingCode = false;
        this.startCountdown();
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        this.isSendingCode = false;
        this.error = err.error?.error || 'Error reenviando el código';
        this.cdRef.detectChanges();
      }
    });

    this.subscriptions.add(resendSubscription);
  }

  // VERIFICACIÓN: validar código y registrar
  onVerifyCode(): void {
    if (this.isVerifyingCode) return;
    
    if (!this.verificationCode || this.verificationCode.length !== 6) {
      this.error = 'Por favor ingresa un código válido de 6 dígitos';
      this.cdRef.detectChanges();
      return;
    }

    this.isVerifyingCode = true;
    this.error = '';
    this.cdRef.detectChanges();

    const usuario: Usuario = {
      nombre: this.nuevoUsuario.nombre,
      email: this.nuevoUsuario.email,
      password: this.nuevoUsuario.password,
      rol: 'lector'
    };

    const verifySubscription = this.usuarioService.verifyAndRegister({ ...usuario, code: this.verificationCode }).subscribe({
      next: (res: any) => {
        this.isVerifyingCode = false;
        
        // Mostrar modal de éxito en lugar de alert
        this.showSuccessModal = true;
        
        // Limpiar intervalo si existe
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
          this.countdownActive = false;
        }
        
        this.cdRef.detectChanges();
      },
      error: (err: any) => {
        this.isVerifyingCode = false;
        this.error = err.error?.error || 'Error verificando el código. Por favor, inténtalo de nuevo.';
        this.cdRef.detectChanges();
      }
    });

    this.subscriptions.add(verifySubscription);
  }

  // Cerrar modal y resetear formulario
  closeModal(): void {
    this.showSuccessModal = false;
    this.selectTab('login');
    this.nuevoUsuario = { nombre: '', email: '', password: '' };
    this.confirmPassword = '';
    this.verificationCode = '';
    this.cdRef.detectChanges();
  }

  // RECUPERACIÓN - VERSIÓN SIMPLIFICADA
  onRecovery(): void {
    if (!this.recoveryEmail && !this.recoveryPhone) {
      this.error = 'Debes ingresar correo o número de teléfono';
      this.cdRef.detectChanges();
      return;
    }
    
    // Simular el proceso de recuperación
    this.isLoading = true;
    this.error = '';
    this.cdRef.detectChanges();
    
    // Simular una llamada HTTP con timeout
    setTimeout(() => {
      this.isLoading = false;
      alert('Se ha enviado un enlace o código a tu correo/teléfono.');
      this.cdRef.detectChanges();
    }, 1000);
  }

  sendSmsCode(): void {
    if (!this.recoveryPhone) {
      this.error = 'Debes ingresar tu número de teléfono';
      this.cdRef.detectChanges();
      return;
    }
    
    // Simular envío de SMS
    alert('Código SMS enviado.');
  }
}