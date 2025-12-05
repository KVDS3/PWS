import { Component, ChangeDetectorRef, OnDestroy, NgZone, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuarioService } from '../../services/usuarios';
import { ConfiguracionService } from '../../services/configuracion';
import { Usuario } from '../../models/usuarios';
import { Subscription } from 'rxjs';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  imports: [CommonModule, FormsModule]
})
export class Login implements OnInit, OnDestroy, AfterViewInit {
  // Tabs
  selectedTab: 'login' | 'register' | 'verify' | 'recovery' | 'recoveryVerify' | 'resetPassword' = 'login';

  // Login
  email = '';
  password = '';
  usuario: any = null;

  // Registro
  nuevoUsuario: any = { nombre: '', email: '', password: '' };
  confirmPassword = '';
  verificationCode = '';

  // Recuperación
  recoveryEmail = '';
  recoveryCode = '';
  newPassword = '';
  confirmNewPassword = '';

  // Control
  error = '';
  successMessage = '';
  isLoading = false;
  isSendingCode = false;
  isVerifyingCode = false;
  showSuccessModal = false;

  // Timer
  countdown = 60;
  countdownActive = false;
  countdownInterval: any;

  private subscriptions = new Subscription();

  constructor(
    private usuarioService: UsuarioService,
    private configuracionService: ConfiguracionService,
    private router: Router,
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadGoogleScript();
  }

  loadGoogleScript(): void {
    // Verificar si el script ya está cargado
    if (typeof google !== 'undefined') {
      this.initializeGoogleSignIn();
      return;
    }

    // Cargar el script de Google
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google script loaded');
      setTimeout(() => this.initializeGoogleSignIn(), 1000);
    };
    script.onerror = () => {
      console.error('Error loading Google script');
    };
    document.head.appendChild(script);
  }

  ngAfterViewInit(): void {
    // Esperar a que Google esté disponible
    this.checkGoogleAvailability();
  }

  checkGoogleAvailability(retries = 10): void {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      this.initializeGoogleSignIn();
    } else if (retries > 0) {
      setTimeout(() => this.checkGoogleAvailability(retries - 1), 500);
    } else {
      console.error('Google Sign-In not available after retries');
    }
  }

  initializeGoogleSignIn(): void {
    try {
      if (!google?.accounts?.id) {
        console.error('Google accounts ID not available');
        return;
      }

      google.accounts.id.initialize({
        client_id: '1023657360893-65p8bs4cd7jscntjspmfckb4hmnb8o6a.apps.googleusercontent.com',
        callback: (response: any) => this.handleGoogleResponse(response),
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Renderizar el botón de Google
      const buttonContainer = document.getElementById('g_id_signin');
      if (buttonContainer) {
        google.accounts.id.renderButton(
          buttonContainer,
          { 
            theme: "outline", 
            size: "large", 
            width: '100%',
            text: "continue_with",
            shape: "rectangular"
          }
        );
        
        // Opcional: también mostrar el One Tap prompt
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkipped()) {
            console.log('Google One Tap not displayed');
          }
        });
      }

    } catch (error) {
      console.error('Error initializing Google Sign-In:', error);
    }
  }

  handleGoogleResponse(response: any) {
    if (!response?.credential) {
      this.error = 'Error en la respuesta de Google';
      this.cdRef.detectChanges();
      return;
    }

    const googleToken = response.credential;
    this.isLoading = true;
    this.error = '';

    this.usuarioService.loginWithGoogle(googleToken).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.ok && res.usuario) {
          localStorage.setItem('usuario', JSON.stringify(res.usuario));
          localStorage.setItem('token', res.token);
          this.decodeToken(res.token);

          // Crear configuración si no existe
          this.configuracionService.crearConfiguracion(res.usuario.id).subscribe({
            next: () => console.log('Configuración creada/obtenida'),
            error: (err) => console.error('Error creando configuración', err)
          });

          this.redirigirPorRol(res.usuario);
        } else {
          this.error = 'Error al iniciar con Google: respuesta inválida';
        }
        this.cdRef.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.error || 'Error al iniciar con Google';
        console.error('Error en login con Google:', err);
        this.cdRef.detectChanges();
      }
    });
  }

  decodeToken(token: string) {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      console.log('Datos dentro del token:', decoded);
      return decoded;
    } catch (err) {
      console.error('Error decodificando token:', err);
      return null;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  selectTab(tab: typeof this.selectedTab): void {
    this.selectedTab = tab;
    this.error = '';
    this.successMessage = '';
    setTimeout(() => this.cdRef.detectChanges(), 0);
  }
  
  onSubmit(): void {
    if (!this.email || !this.password) {
      this.error = 'Debes ingresar correo y contraseña';
      return;
    }

    this.isLoading = true;
    this.error = '';

    const sub = this.usuarioService.loginSendCode(this.email, this.password).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.ok) {
          this.successMessage = res.message;
          this.selectTab('verify'); // Mostrar pantalla para ingresar el código
          this.startCountdown(); // Inicia el contador de reenvío
        } else {
          this.error = res.error || 'Error enviando código';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.error || 'Error al iniciar sesión';
      }
    });

    this.subscriptions.add(sub);
  }


  // Registro
  onRegister(): void {
    if (!this.nuevoUsuario.nombre || !this.nuevoUsuario.email || !this.nuevoUsuario.password) {
      this.error = 'Todos los campos son obligatorios';
      return;
    }
    
    if (this.nuevoUsuario.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    // Validación básica de email
    if (!this.isValidEmail(this.nuevoUsuario.email)) {
      this.error = 'Formato de correo inválido';
      return;
    }

    this.isSendingCode = true;
    this.error = '';

    const sub = this.usuarioService.sendVerificationCode(this.nuevoUsuario.email).subscribe({
      next: (res) => {
        this.isSendingCode = false;
        if (res?.ok) {
          this.selectTab('verify');
          this.startCountdown();
        } else {
          this.error = 'Error enviando código de verificación';
        }
      },
      error: (err) => {
        this.isSendingCode = false;
        this.error = err.error?.error || 'Error enviando código de verificación';
        console.error('Error enviando código:', err);
      }
    });

    this.subscriptions.add(sub);
  }

  resendCode(): void {
    if (!this.nuevoUsuario.email) {
      this.error = 'Correo no válido para reenviar código';
      return;
    }

    if (this.countdownActive) {
      this.error = 'Espera a que termine el temporizador para reenviar';
      return;
    }

    this.isSendingCode = true;
    this.error = '';

    const sub = this.usuarioService.sendVerificationCode(this.nuevoUsuario.email).subscribe({
      next: (res) => {
        this.isSendingCode = false;
        if (res?.ok) {
          this.startCountdown();
        } else {
          this.error = 'Error reenviando código';
        }
      },
      error: (err) => {
        this.isSendingCode = false;
        this.error = err.error?.error || 'Error reenviando código';
      }
    });

    this.subscriptions.add(sub);
  }

  onVerifyCode(): void {
    if (!this.verificationCode) {
      this.error = 'Debes ingresar el código';
      return;
    }

    if (this.verificationCode.length !== 6) {
      this.error = 'El código debe tener 6 dígitos';
      return;
    }

    this.isVerifyingCode = true;
    this.error = '';

    // Para REGISTRO: verificar código y crear usuario
    if (this.selectedTab === 'verify' && this.nuevoUsuario.email) {
      const usuario: Usuario = {
        nombre: this.nuevoUsuario.nombre,
        email: this.nuevoUsuario.email,
        password: this.nuevoUsuario.password,
        rol: 'lector'
      };

      const sub = this.usuarioService.verifyAndRegister({ ...usuario, code: this.verificationCode }).subscribe({
        next: (res) => {
          this.isVerifyingCode = false;
          if (res?.ok) {
            this.successMessage = '¡Tu cuenta fue creada correctamente!';
            this.showSuccessModal = true;
            
            // Limpiar formulario
            this.nuevoUsuario = { nombre: '', email: '', password: '' };
            this.confirmPassword = '';
            this.verificationCode = '';
          } else {
            this.error = 'Error creando la cuenta';
          }
        },
        error: (err) => {
          this.isVerifyingCode = false;
          this.error = err.error?.error || 'Error verificando código';
          console.error('Error verificando código:', err);
        }
      });

      this.subscriptions.add(sub);
    } 
    // Para LOGIN: solo verificar código
    else if (this.selectedTab === 'verify' && this.email) {
      const sub = this.usuarioService.verifyLoginCode(this.email, this.verificationCode).subscribe({
        next: (res) => {
          this.isVerifyingCode = false;
          if (res?.ok && res.usuario) {
            localStorage.setItem('usuario', JSON.stringify(res.usuario));
            localStorage.setItem('token', res.token);
            
            // Crear configuración si no existe
            this.configuracionService.crearConfiguracion(res.usuario.id).subscribe({
              next: () => console.log('Configuración creada/obtenida'),
              error: (err) => console.error('Error creando configuración', err)
            });

            this.redirigirPorRol(res.usuario);
          } else {
            this.error = 'Error verificando código de acceso';
          }
        },
        error: (err) => {
          this.isVerifyingCode = false;
          this.error = err.error?.error || 'Error verificando código';
          console.error('Error verificando código de login:', err);
        }
      });

      this.subscriptions.add(sub);
    }
  }

  // Recuperación de contraseña
  onRecovery(): void {
    if (!this.recoveryEmail) {
      this.error = 'Debes ingresar un correo';
      return;
    }

    if (!this.isValidEmail(this.recoveryEmail)) {
      this.error = 'Formato de correo inválido';
      return;
    }

    this.isSendingCode = true;
    this.error = '';

    const sub = this.usuarioService.sendRecoveryCode(this.recoveryEmail).subscribe({
      next: (res) => {
        this.isSendingCode = false;
        if (res?.ok) {
          this.selectTab('recoveryVerify');
          this.startCountdown();
        } else {
          this.error = 'Error enviando código de recuperación';
        }
      },
      error: (err) => {
        this.isSendingCode = false;
        this.error = err.error?.error || 'Error enviando código de recuperación';
      }
    });

    this.subscriptions.add(sub);
  }

  onVerifyRecoveryCode(): void {
    if (!this.recoveryCode) {
      this.error = 'Debes ingresar el código';
      return;
    }

    if (this.recoveryCode.length !== 6) {
      this.error = 'El código debe tener 6 dígitos';
      return;
    }

    this.isVerifyingCode = true;
    this.error = '';

    const sub = this.usuarioService.verifyRecoveryCode(this.recoveryEmail, this.recoveryCode).subscribe({
      next: (res) => {
        this.isVerifyingCode = false;
        if (res?.ok) {
          this.selectTab('resetPassword');
        } else {
          this.error = 'Error verificando código';
        }
      },
      error: (err) => {
        this.isVerifyingCode = false;
        this.error = err.error?.error || 'Error verificando código';
      }
    });

    this.subscriptions.add(sub);
  }

  onResetPassword(): void {
    if (!this.newPassword || !this.confirmNewPassword) {
      this.error = 'Debes completar ambos campos';
      return;
    }
    
    if (this.newPassword !== this.confirmNewPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    if (this.newPassword.length < 8) {
      this.error = 'La contraseña debe tener al menos 8 caracteres';
      return;
    }

    this.isLoading = true;
    this.error = '';

    const sub = this.usuarioService.resetPassword(this.recoveryEmail, this.newPassword).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.ok) {
          this.successMessage = '¡Tu contraseña fue restablecida correctamente!';
          this.showSuccessModal = true;
          
          // Limpiar formulario
          this.recoveryEmail = '';
          this.recoveryCode = '';
          this.newPassword = '';
          this.confirmNewPassword = '';
        } else {
          this.error = 'Error restableciendo contraseña';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.error || 'Error restableciendo contraseña';
      }
    });

    this.subscriptions.add(sub);
  }

  // Helpers
  startCountdown(): void {
    this.countdownActive = true;
    this.countdown = 60;
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.ngZone.runOutsideAngular(() => {
      this.countdownInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.countdown--;
          if (this.countdown <= 0) {
            clearInterval(this.countdownInterval);
            this.countdownActive = false;
          }
          this.cdRef.detectChanges();
        });
      }, 1000);
    });
  }

  closeModal(): void {
    this.showSuccessModal = false;
    this.successMessage = '';
    this.selectTab('login');
  }

  resendRecoveryCode(): void {
    if (!this.recoveryEmail) {
      this.error = 'Correo no válido para reenviar código';
      return;
    }

    if (this.countdownActive) {
      this.error = 'Espera a que termine el temporizador para reenviar';
      return;
    }

    this.isSendingCode = true;
    this.error = '';

    const sub = this.usuarioService.sendRecoveryCode(this.recoveryEmail).subscribe({
      next: (res) => {
        this.isSendingCode = false;
        if (res?.ok) {
          this.startCountdown();
        } else {
          this.error = 'Error reenviando código de recuperación';
        }
      },
      error: (err) => {
        this.isSendingCode = false;
        this.error = err.error?.error || 'Error reenviando código de recuperación';
      }
    });

    this.subscriptions.add(sub);
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // --- FUNCIÓN PRINCIPAL DE REDIRECCIÓN ACTUALIZADA ---
  private redirigirPorRol(usuario: any) {
    console.log('Evaluando rol para redirección:', usuario.rol);

    // Determinar la ruta
    const rutaDestino = usuario.rol === 'editor' ? '/agregarProducto' : '/productos';

    // Ejecutar la navegación dentro de NgZone
    this.ngZone.run(() => {
      this.router.navigateByUrl(rutaDestino);
    });
  }

  // Limpiar errores cuando el usuario empiece a escribir
  clearError(): void {
    this.error = '';
  }

  // Navegar al registro desde login
  goToRegister(): void {
    this.selectTab('register');
    this.email = '';
    this.password = '';
    this.error = '';
  }

  // Navegar a recuperación desde login
  goToRecovery(): void {
    this.recoveryEmail = this.email; // Pre-llenar con el email del login
    this.selectTab('recovery');
    this.error = '';
  }

  // Volver al login desde otras pestañas
  backToLogin(): void {
    this.selectTab('login');
    this.error = '';
    this.successMessage = '';
  }
}