import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { loadStripe, Stripe, StripeCardElement } from '@stripe/stripe-js';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './carrito.html',
  styleUrls: ['./carrito.css']
})
export class CarritoComponent implements OnInit {
  carrito: any[] = [];
  total = 0;
  mostrarPago = false;

  hoverDel = false;
  hoverPay = false;

  stripe!: Stripe | null;
  card!: StripeCardElement;
  usuario: any;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarCarrito();
    const usuarioData = localStorage.getItem('usuario');
    this.usuario = usuarioData ? JSON.parse(usuarioData) : null;
  }

  async iniciarPago() {
    this.mostrarPago = true;

    // Esperar renderizado
    setTimeout(async () => {
      if (!this.stripe) {
        this.stripe = await loadStripe('pk_test_51SA1WWD0tdqvUIOsQwf2oKHPWze5AfkjZAFuMB22MN4E2semrutxCNV1jTaCnmmSWNWPcgfAaf1z6gv7wu5aerln00kualI6v4');
      }

      if (this.card) return; // ya inicializada

      const cardDiv = document.getElementById('card-element');
      if (!cardDiv) return;

      const elements = this.stripe!.elements();
      this.card = elements.create('card');
      this.card.mount('#card-element');
    }, 0);
  }

  cargarCarrito() {
    const data = localStorage.getItem('carrito');
    this.carrito = data ? JSON.parse(data) : [];
    this.calcularTotal();
  }

  calcularTotal() {
    this.total = this.carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  }

  eliminarProducto(item: any) {
    const index = this.carrito.indexOf(item);
    if (index > -1) this.carrito.splice(index, 1);
    localStorage.setItem('carrito', JSON.stringify(this.carrito));
    this.calcularTotal();
  }

  disminuirCantidad(item: any) { 
    if(item.cantidad>1) item.cantidad--; 
    this.calcularTotal(); 
  }
  
  aumentarCantidad(item: any) { 
    item.cantidad++; 
    this.calcularTotal(); 
  }

  async procesarPago() {
    if (!this.carrito.length) return alert('Carrito vacío');
    if (!this.usuario) return alert('Debes iniciar sesión');

    try {
      // 1️⃣ Solicitar PaymentIntent al backend
      const res: any = await this.http.post('http://localhost:3000/api/pagos', {
        carrito: this.carrito,
        usuarioId: this.usuario.id
      }).toPromise();

      const clientSecret = res.clientSecret;
      if (!clientSecret) return alert('Error al crear pago');

      // 2️⃣ Confirmar pago con Stripe
      const { error, paymentIntent } = await this.stripe!.confirmCardPayment(clientSecret, {
        payment_method: {
          card: this.card,
          billing_details: { name: this.usuario.nombre, email: this.usuario.email }
        }
      });

      if (error) return alert('❌ Pago fallido: ' + error.message);

      if (paymentIntent?.status === 'succeeded') {
        // 3️⃣ Notificar al backend para generar factura
        await this.http.post('http://localhost:3000/api/pagos/confirmar', {
          usuario: this.usuario,
          carrito: this.carrito,
          paymentIntentId: paymentIntent.id
        }).toPromise();

        alert('✅ Pago realizado y factura enviada');
        localStorage.removeItem('carrito');
        this.cargarCarrito();
        this.mostrarPago = false;
      }

    } catch (err) {
      console.error(err);
      alert('❌ Error procesando pago');
    }
  }
}
