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
  
  // 🔹 Control de Pestañas
  metodoPago: string = 'tarjeta'; // 'tarjeta' | 'efectivo'

  stripe!: Stripe | null;
  card!: StripeCardElement;
  usuario: any;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarCarrito();
    const usuarioData = localStorage.getItem('usuario');
    this.usuario = usuarioData ? JSON.parse(usuarioData) : null;
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

  // 🔹 Inicio del proceso de pago
  async iniciarPago() {
    this.mostrarPago = true;
    this.metodoPago = 'tarjeta'; // Default

    // Cargar Stripe en segundo plano
    setTimeout(async () => {
      if (!this.stripe) {
        this.stripe = await loadStripe('pk_test_51SA1WWD0tdqvUIOsQwf2oKHPWze5AfkjZAFuMB22MN4E2semrutxCNV1jTaCnmmSWNWPcgfAaf1z6gv7wu5aerln00kualI6v4');
      }
      this.montarTarjeta();
    }, 0);
  }

  // 🔹 Montar elemento de tarjeta si la pestaña es tarjeta
  montarTarjeta() {
    if (this.metodoPago === 'tarjeta') {
       // Pequeño timeout para asegurar que el DIV existe en el DOM
       setTimeout(() => {
         const cardDiv = document.getElementById('card-element');
         if (cardDiv && this.stripe && !this.card) {
           const elements = this.stripe.elements();
           this.card = elements.create('card');
           this.card.mount('#card-element');
         }
       }, 50);
    }
  }

  // 🔹 Cambio de Pestaña
  seleccionarMetodo(metodo: string) {
    this.metodoPago = metodo;
    if (metodo === 'tarjeta') {
      this.montarTarjeta();
    }
  }

  // 🔹 Función Principal de Procesamiento
  async procesarPago() {
    if (!this.carrito.length) return alert('Carrito vacío');
    if (!this.usuario) return alert('Debes iniciar sesión');

    // --> RAMA EFECTIVO
    if (this.metodoPago === 'efectivo') {
      this.procesarPagoEfectivo();
      return;
    }

    // --> RAMA TARJETA (Stripe)
    try {
      // 1. Intent
      const res: any = await this.http.post('http://localhost:3000/api/pagos', {
        carrito: this.carrito,
        usuarioId: this.usuario.id
      }).toPromise();

      const clientSecret = res.clientSecret;
      
      // 2. Confirmar en Stripe
      const { error, paymentIntent } = await this.stripe!.confirmCardPayment(clientSecret, {
        payment_method: {
          card: this.card,
          billing_details: { name: this.usuario.nombre, email: this.usuario.email }
        }
      });

      if (error) return alert('❌ Pago fallido: ' + error.message);

      if (paymentIntent?.status === 'succeeded') {
        // 3. Confirmar en Backend (Resta stock y notifica)
        await this.http.post('http://localhost:3000/api/pagos/confirmar', {
          usuario: this.usuario,
          carrito: this.carrito,
          paymentIntentId: paymentIntent.id
        }).toPromise();

        this.finalizarCompra('¡Pago con tarjeta exitoso! Factura enviada.');
      }
    } catch (err) {
      console.error(err);
      alert('❌ Error procesando pago con tarjeta');
    }
  }

  // 🔹 Lógica específica de Efectivo
  async procesarPagoEfectivo() {
    if (!confirm('¿Confirmar orden en efectivo? Los productos se descontarán del stock inmediatamente.')) return;

    try {
      await this.http.post('http://localhost:3000/api/pagos/efectivo', {
        usuario: this.usuario,
        carrito: this.carrito
      }).toPromise();

      this.finalizarCompra('¡Orden generada! Revisa tu correo para instrucciones de pago.');
    } catch (err) {
      console.error(err);
      alert('❌ Error al generar la orden en efectivo.');
    }
  }

  finalizarCompra(mensaje: string) {
    alert('✅ ' + mensaje);
    localStorage.removeItem('carrito');
    this.carrito = [];
    this.total = 0;
    this.mostrarPago = false;
    this.metodoPago = 'tarjeta';
    if(this.card) {
      this.card.destroy(); // Limpiar tarjeta
      // @ts-ignore
      this.card = null;
    }
  }
}