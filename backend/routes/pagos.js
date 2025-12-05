require('dotenv').config();
const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const Stripe = require('stripe');
const nodemailer = require('nodemailer');
const path = require('path');
const { generarFacturaPDF } = require('../utils/factura'); 

// 🔹 Configuración Stripe
const stripe = new Stripe('sk_test_51SA1WWD0tdqvUIOsqvRgzwxcZ55PQy90mXCIsHhiCmgbF2TnUd5BmctRO4Vcp6wAcpycQCI2OzGtQNiej3EMEm4J00IGDmuKuh');

// 🔹 Configuración Nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- HELPER: Notificar a Editores ---
async function notificarVentaAEditores(producto, cantidadVendida, metodoPago) {
  try {
    const editoresResult = await pool.query("SELECT email FROM usuarios WHERE rol = 'editor'");
    const editores = editoresResult.rows;
    if (editores.length === 0) return;

    const prodActual = await pool.query("SELECT stock, stock_minimo FROM productos WHERE id=$1", [producto.id]);
    const { stock, stock_minimo } = prodActual.rows[0];

    const asunto = `Venta Inventario: ${producto.nombre}`;
    let mensaje = `
      Reporte de Salida de Inventario.
      - Producto: ${producto.nombre}
      - Cantidad vendida: ${cantidadVendida}
      - Método de pago: ${metodoPago}
      
      Stock restante: ${stock}
    `;

    if (stock === 0) mensaje += `\n\n🛑 URGENTE: AGOTADO.`;
    else if (stock <= stock_minimo) mensaje += `\n\n⚠️ ALERTA: Stock bajo.`;

    const envios = editores.map(editor => 
      transporter.sendMail({
        from: `"Sistema Ventas" <${process.env.EMAIL_USER}>`,
        to: editor.email,
        subject: asunto,
        text: mensaje
      })
    );
    await Promise.all(envios);
  } catch (err) {
    console.error("❌ Error notificando editores:", err);
  }
}

// RUTA 1: Crear Intento de Pago (Stripe)
router.post('/', async (req, res) => {
  const { carrito } = req.body;
  try {
    let total = 0;
    for (const item of carrito) total += item.precio * item.cantidad;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'mxn',
      payment_method_types: ['card']
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RUTA 2: Confirmar Pago TARJETA (Sin guardar en transacciones)
router.post('/confirmar', async (req, res) => {
  const { usuario, carrito, paymentIntentId } = req.body;
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') return res.status(400).json({ error: 'Pago no completado' });

    // 1. Generar ID temporal para el archivo (Ya que no guardamos en BD)
    const ordenId = Date.now(); 

    // 2. 🔥 RESTAR STOCK Y NOTIFICAR
    for (const item of carrito) {
      await pool.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.cantidad, item.id]);
      notificarVentaAEditores(item, item.cantidad, 'Tarjeta');
    }

    // 3. Generar PDF
    const archivo = path.join(__dirname, '../tmp', `factura_${ordenId}.pdf`);
    await generarFacturaPDF(usuario, carrito, paymentIntent.amount / 100, archivo);
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: usuario.email,
      subject: 'Confirmación de Compra',
      html: `<p>Hola ${usuario.nombre}, gracias por tu compra. Adjuntamos tu factura.</p>`,
      attachments: [{ path: archivo }]
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// RUTA 3: Procesar Pago EFECTIVO (CORREGIDO: Sin tabla transacciones)
router.post('/efectivo', async (req, res) => {
  const { usuario, carrito } = req.body;
  
  try {
    if (!carrito || carrito.length === 0) return res.status(400).json({ error: 'Carrito vacío' });

    // Calcular total
    let total = 0;
    for (const item of carrito) total += item.precio * item.cantidad;

    // 1. Generar ID temporal para el reporte (Timestamp actual)
    const ordenId = Date.now();

    // 2. 🔥 RESTAR STOCK Y NOTIFICAR
    for (const item of carrito) {
      // Restamos inventario
      await pool.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [item.cantidad, item.id]);
      
      // Notificamos
      notificarVentaAEditores(item, item.cantidad, 'Efectivo');
    }

    // 3. Generar Orden PDF (Usamos el ordenId generado arriba)
    const archivo = path.join(__dirname, '../tmp', `orden_efectivo_${ordenId}.pdf`);
    
    // Generamos el PDF (Asegúrate de que esta función exista y funcione)
    if (typeof generarFacturaPDF === 'function') {
        await generarFacturaPDF(usuario, carrito, total, archivo);
    }

    // 4. Enviar correo al Cliente
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: usuario.email,
      subject: 'Orden de Compra en Efectivo Generada',
      html: `
        <h3>Hola ${usuario.nombre}</h3>
        <p>Has seleccionado pago en efectivo.</p> 
        <p><strong>Tus productos han sido apartados del inventario exitosamente.</strong></p>
        <p>Total a pagar: <strong>$${total}</strong></p>
        <p>Referencia de Orden: #${ordenId}</p>
      `,
      attachments: [{ path: archivo }]
    });

    res.json({ ok: true, message: 'Orden generada y stock actualizado' });

  } catch (err) {
    console.error('Error en pago efectivo:', err);
    res.status(500).json({ error: 'Error al procesar la orden', detalle: err.message });
  }
});

module.exports = router;