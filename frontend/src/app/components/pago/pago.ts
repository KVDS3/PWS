import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // 🔹 IMPORTANTE
import { HttpClientModule } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { loadStripe, Stripe, StripeCardElement } from '@stripe/stripe-js';

@Component({
  selector: 'app-pago',
  standalone: true, // 🔹 Asegúrate de que sea standalone
  imports: [CommonModule, HttpClientModule], // 🔹 Aquí importamos NgIf, NgFor y HttpClient
  templateUrl: './pago.html',
  styleUrls: ['./pago.css']
})
export class Pago {
  carrito: any[] = [];
  stripe!: Stripe | null;
  card!: StripeCardElement;

  constructor(private http: HttpClient) {}

  async ngOnInit() {
    const data = localStorage.getItem('carrito');
    this.carrito = data ? JSON.parse(data) : [];

    this.stripe = await loadStripe('pk_test_51SA1WWD0tdqvUIOsqvRgzwxcZ55PQy90mXCIsHhiCmgbF2TnUd5BmctRO4Vcp6wAcpycQCI2OzGtQNiej3EMEm4J00IGDmuKuh');

    const elements = this.stripe!.elements();
    this.card = elements.create('card');
    this.card.mount('#card-element');
  }

  async pagar() {
    if (!this.stripe) return alert('Stripe no cargado');
    if (this.carrito.length === 0) return alert('El carrito está vacío');

    const { clientSecret }: any = await this.http.post('http://localhost:3000/api/pagos', { carrito: this.carrito }).toPromise();

    const { error, paymentIntent } = await this.stripe!.confirmCardPayment(clientSecret, {
      payment_method: { card: this.card }
    });

    if (error) {
      alert('❌ Pago fallido: ' + error.message);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      alert('✅ Pago realizado con éxito');
      localStorage.removeItem('carrito');
    }
  }
}
