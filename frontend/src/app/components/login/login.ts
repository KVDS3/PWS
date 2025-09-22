import { Component, ChangeDetectorRef, OnDestroy, NgZone, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuarioService } from '../../services/usuarios';
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
export class Login implements OnDestroy, AfterViewInit {
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
    private router: Router,
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    // Inicializar Google Sign-In
    google.accounts.id.initialize({
      client_id: '1023657360893-65p8bs4cd7jscntjspmfckb4hmnb8o6a.apps.googleusercontent.com',
      callback: (response: any) => this.handleGoogleResponse(response)
    });

    google.accounts.id.renderButton(
      document.getElementById("g_id_signin"),
      { theme: "outline", size: "large", width: '100%' }
    );
  }

  handleGoogleResponse(response: any) {
    const token = response.credential;

    this.usuarioService.loginWithGoogle(token).subscribe({
      next: (res) => {
        if (res?.ok && res.usuario) {
          localStorage.setItem('usuario', JSON.stringify(res.usuario));
          this.router.navigate(['']);
        } else {
          this.error = 'Error al iniciar con Google';
        }
        this.cdRef.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al iniciar con Google';
        this.cdRef.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  selectTab(tab: typeof this.selectedTab): void {
    this.selectedTab = tab;
    this.error = '';
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

    const sub = this.usuarioService.loginUsuario(this.email, this.password).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.ok && res.usuario) {
          localStorage.setItem('usuario', JSON.stringify(res.usuario));
          this.router.navigate(['']);
        } else {
          this.error = 'Credenciales inválidas';
        }
        this.cdRef.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.error || 'Error al iniciar sesión';
        this.cdRef.detectChanges();
      }
    });

    this.subscriptions.add(sub);
  }

  // REGISTRO
  onRegister(): void {
    if (!this.nuevoUsuario.nombre || !this.nuevoUsuario.email || !this.nuevoUsuario.password) {
      this.error = 'Todos los campos son obligatorios';
      return;
    }
    if (this.nuevoUsuario.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.isSendingCode = true;
    const sub = this.usuarioService.sendVerificationCode(this.nuevoUsuario.email).subscribe({
      next: () => {
        this.isSendingCode = false;
        this.selectTab('verify');
        this.startCountdown();
      },
      error: (err) => {
        this.isSendingCode = false;
        this.error = err.error?.error || 'Error enviando código';
      }
    });

    this.subscriptions.add(sub);
  }

  resendCode(): void {
    if (!this.nuevoUsuario.email) {
      this.error = 'Correo no válido para reenviar código';
      return;
    }

    this.isSendingCode = true;
    const sub = this.usuarioService.sendVerificationCode(this.nuevoUsuario.email).subscribe({
      next: () => {
        this.isSendingCode = false;
        this.startCountdown();
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

    this.isVerifyingCode = true;
    const usuario: Usuario = {
      nombre: this.nuevoUsuario.nombre,
      email: this.nuevoUsuario.email,
      password: this.nuevoUsuario.password,
      rol: 'lector'
    };

    const sub = this.usuarioService.verifyAndRegister({ ...usuario, code: this.verificationCode }).subscribe({
      next: () => {
        this.isVerifyingCode = false;
        this.successMessage = 'Tu cuenta fue creada correctamente';
        this.showSuccessModal = true;
      },
      error: (err) => {
        this.isVerifyingCode = false;
        this.error = err.error?.error || 'Error verificando código';
      }
    });

    this.subscriptions.add(sub);
  }

  // RECUPERACIÓN
  onRecovery(): void {
    if (!this.recoveryEmail) {
      this.error = 'Debes ingresar un correo';
      return;
    }

    const sub = this.usuarioService.sendRecoveryCode(this.recoveryEmail).subscribe({
      next: () => {
        this.selectTab('recoveryVerify');
      },
      error: (err) => {
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

    const sub = this.usuarioService.verifyRecoveryCode(this.recoveryEmail, this.recoveryCode).subscribe({
      next: () => {
        this.selectTab('resetPassword');
      },
      error: (err) => {
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

    const sub = this.usuarioService.resetPassword(this.recoveryEmail, this.newPassword).subscribe({
      next: () => {
        this.successMessage = 'Tu contraseña fue restablecida correctamente';
        this.showSuccessModal = true;
      },
      error: (err) => {
        this.error = err.error?.error || 'Error restableciendo contraseña';
      }
    });

    this.subscriptions.add(sub);
  }

  // Helpers
  startCountdown(): void {
    this.countdownActive = true;
    this.countdown = 60;
    if (this.countdownInterval) clearInterval(this.countdownInterval);

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
    this.selectTab('login');
  }

  resendRecoveryCode(): void {
    if (!this.recoveryEmail) {
      this.error = 'Correo no válido para reenviar código';
      return;
    }

    this.isSendingCode = true;
    const sub = this.usuarioService.sendRecoveryCode(this.recoveryEmail).subscribe({
      next: () => {
        this.isSendingCode = false;
        this.startCountdown();
      },
      error: (err) => {
        this.isSendingCode = false;
        this.error = err.error?.error || 'Error reenviando código de recuperación';
      }
    });

    this.subscriptions.add(sub);
  }
}
