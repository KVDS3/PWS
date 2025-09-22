import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { loadStripe, Stripe } from '@stripe/stripe-js';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carrito.html',
  styleUrls: ['./carrito.css']
})
export class Carrito implements OnInit {
  carrito: any[] = [];
  total: number = 0;
  stripe: Stripe | null = null;

  constructor(private router: Router, private http: HttpClient) {}

  async ngOnInit(): Promise<void> {
    this.cargarCarrito();
    this.stripe = await loadStripe('pk_test_51SA1WWD0tdqvUIOsQwf2oKHPWze5AfkjZAFuMB22MN4E2semrutxCNV1jTaCnmmSWNWPcgfAaf1z6gv7wu5aerln00kualI6v4'); // tu clave pública
  }

  cargarCarrito() {
    const data = localStorage.getItem('carrito');
    this.carrito = data ? JSON.parse(data) : [];
    this.calcularTotal();
  }

  aumentarCantidad(item: any) {
    item.cantidad++;
    this.guardarCarrito();
  }

  disminuirCantidad(item: any) {
    if (item.cantidad > 1) {
      item.cantidad--;
    } else {
      this.eliminarProducto(item);
    }
    this.guardarCarrito();
  }

  eliminarProducto(item: any) {
    this.carrito = this.carrito.filter(p => p.id !== item.id);
    this.guardarCarrito();
  }

  calcularTotal() {
    this.total = this.carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
  }

  guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(this.carrito));
    this.calcularTotal();
  }

  irAResumen() {
    this.router.navigate(['/resumen']);
  }

  // 🔹 Método actualizado para pagar con Stripe.js
  async pagar() {
    if (!this.stripe) {
      alert('Stripe no está inicializado');
      return;
    }

    if (this.carrito.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    try {
      // 1️⃣ Crear PaymentIntent en el backend
      const payload = {
        usuarioId: 1, // reemplazar con usuario real
        carrito: this.carrito.map(item => ({
          productoId: item.id,
          cantidad: item.cantidad,
          precio: item.precio
        }))
      };

      const res: any = await this.http.post('http://localhost:3000/api/pagos', payload).toPromise();
      const clientSecret = res.clientSecret;

      // 2️⃣ Confirmar pago con tarjeta de prueba
      const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: { token: 'tok_visa' } // para pruebas, usa Elements para producción
        }
      });

      if (error) {
        alert('❌ Error en el pago: ' + error.message);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        alert('✅ Pago completado con éxito');
        localStorage.removeItem('carrito');
        this.cargarCarrito();
      }

    } catch (err: any) {
      console.error(err);
      alert('❌ Error al procesar el pago');
    }
  }
}
