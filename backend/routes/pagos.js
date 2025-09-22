const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const Stripe = require('stripe');

// 🔹 Clave secreta de Stripe
const stripe = new Stripe('sk_test_51SA1WWD0tdqvUIOsqvRgzwxcZ55PQy90mXCIsHhiCmgbF2TnUd5BmctRO4Vcp6wAcpycQCI2OzGtQNiej3EMEm4J00IGDmuKuh');

router.post('/', async (req, res) => {
  const { usuarioId, carrito } = req.body;

  try {
    if(!carrito || carrito.length === 0){
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    // Calcular total
    let total = 0;
    for (let item of carrito) {
      const producto = await pool.query('SELECT * FROM productos WHERE id=$1', [item.productoId]);
      total += producto.rows[0].precio * item.cantidad;
    }

    // Crear PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total * 100, // centavos
      currency: 'mxn',
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear PaymentIntent' });
  }
});

module.exports = router;
