const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const Stripe = require('stripe');
const nodemailer = require('nodemailer');
const path = require('path');
const { generarFacturaPDF } = require('../utils/factura');

// 🔹 Clave secreta de Stripe
const stripe = new Stripe('sk_test_51SA1WWD0tdqvUIOsqvRgzwxcZ55PQy90mXCIsHhiCmgbF2TnUd5BmctRO4Vcp6wAcpycQCI2OzGtQNiej3EMEm4J00IGDmuKuh');

// 🔹 Configuración de correo
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'bodegaurbana0@gmail.com',
    pass: 'dxmk bdfg nsnx wtii'
  }
});

// Crear PaymentIntent
router.post('/', async (req, res) => {
  const { usuarioId, carrito } = req.body;
  try {
    if (!carrito || carrito.length === 0)
      return res.status(400).json({ error: 'Carrito vacío' });

    // Calcular total desde el carrito
    let total = 0;
    for (const item of carrito) {
      // Asegurarse de que precio sea número
      const precio = parseFloat(item.precio);
      if (isNaN(precio)) throw new Error(`Precio inválido para producto ${item.nombre}`);
      total += precio * item.cantidad;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // en centavos
      currency: 'mxn',
      payment_method_types: ['card']
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando PaymentIntent', detalle: err.message });
  }
});

// Confirmar pago y enviar factura
router.post('/confirmar', async (req, res) => {
  const { usuario, carrito, paymentIntentId } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded')
      return res.status(400).json({ error: 'Pago no completado' });

    // Guardar transacción en producto_id como JSON
    const insert = await pool.query(
      `INSERT INTO transacciones(usuario_id, producto_id, proveedor, amount, currency, estado, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [usuario.id, JSON.stringify(carrito), 'Stripe', paymentIntent.amount / 100, paymentIntent.currency, paymentIntent.status]
    );

    // Generar PDF
    const archivo = path.join(__dirname, '../tmp', `factura_${insert.rows[0].id}.pdf`);
    const total = paymentIntent.amount / 100;
    await generarFacturaPDF(usuario, carrito, total, archivo);

    // Enviar correo con factura adjunta
    await transporter.sendMail({
      from: 'tu_correo@gmail.com',
      to: usuario.email,
      subject: 'Tu factura de compra',
      html: `<p>Hola ${usuario.nombre}, gracias por tu compra.</p><p>Adjuntamos tu factura.</p>`,
      attachments: [{ path: archivo }]
    });

    res.json({ ok: true, mensaje: 'Pago confirmado y factura enviada' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al confirmar pago o enviar factura', detalle: err.message });
  }
});

module.exports = router;
