import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { loadStripe, Stripe, StripeCardElement } from '@stripe/stripe-js';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './pago.html',
  styleUrls: ['./pago.css']
})
export class Pago {
  carrito: any[] = [];
  usuario: any;
  stripe!: Stripe | null;
  card!: StripeCardElement;
  isLoading = false;

  constructor(private http: HttpClient, private router: Router) {}

  async ngOnInit() {
    const carritoData = localStorage.getItem('carrito');
    this.carrito = carritoData ? JSON.parse(carritoData) : [];

    const usuarioData = localStorage.getItem('usuario');
    this.usuario = usuarioData ? JSON.parse(usuarioData) : null;

    this.stripe = await loadStripe('pk_test_51SA1WWD0tdqvUIOsqvRgzwxcZ55PQy90mXCIsHhiCmgbF2TnUd5BmctRO4Vcp6wAcpycQCI2OzGtQNiej3EMEm4J00IGDmuKuh');

    const elements = this.stripe!.elements();
    this.card = elements.create('card');
    this.card.mount('#card-element');
  }

  async pagar() {
    if (!this.stripe) return alert('Stripe no cargado');
    if (this.carrito.length === 0) return alert('El carrito está vacío');
    if (!this.usuario) return alert('No se encontró usuario logueado');

    try {
      this.isLoading = true;

      // 1️⃣ Crear PaymentIntent en backend
      const { clientSecret }: any = await this.http
        .post('http://localhost:3000/pagos', { carrito: this.carrito, usuarioId: this.usuario.id })
        .toPromise();

      // 2️⃣ Confirmar pago con Stripe
      const { error, paymentIntent } = await this.stripe!.confirmCardPayment(clientSecret, {
        payment_method: { card: this.card }
      });

      if (error) {
        alert('❌ Pago fallido: ' + error.message);
        this.isLoading = false;
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // 3️⃣ Confirmar pago y enviar factura desde backend
        const res: any = await this.http
          .post('http://localhost:3000/pagos/confirmar', {
            usuario: this.usuario,
            carrito: this.carrito,
            paymentIntentId: paymentIntent.id
          })
          .toPromise();

        alert('✅ ' + res.mensaje);

        // Limpiar carrito y redirigir al usuario
        localStorage.removeItem('carrito');
        this.carrito = [];
        this.router.navigateByUrl('/productos');
      }

    } catch (err: any) {
      console.error('Error procesando pago:', err);
      alert('❌ Error procesando pago: ' + (err.error?.error || err.message));
    } finally {
      this.isLoading = false;
    }
  }
}
