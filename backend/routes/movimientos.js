const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// 🔹 Registrar entrada o salida
router.post('/', async (req, res) => {
  const { tipo, producto_id, cantidad, referencia, responsable_id, proveedor_id, cliente_id } = req.body;

  if (!tipo || !producto_id || !cantidad) return res.status(400).json({ error: 'Faltan campos obligatorios' });

  try {
    // 1️⃣ Obtener stock actual del producto
    const productoRes = await pool.query('SELECT stock FROM productos WHERE id=$1', [producto_id]);
    if (productoRes.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    let nuevoStock = productoRes.rows[0].stock;

    if (tipo === 'Entrada') {
      nuevoStock += cantidad;
    } else if (tipo === 'Salida') {
      if (cantidad > nuevoStock) return res.status(400).json({ error: 'Stock insuficiente para la salida' });
      nuevoStock -= cantidad;
    } else {
      return res.status(400).json({ error: 'Tipo inválido, debe ser Entrada o Salida' });
    }

    // 2️⃣ Actualizar stock en productos
    await pool.query('UPDATE productos SET stock=$1 WHERE id=$2', [nuevoStock, producto_id]);

    // 3️⃣ Insertar movimiento
    const movimientoRes = await pool.query(
      `INSERT INTO movimientos (tipo, producto_id, cantidad, referencia, responsable_id, proveedor_id, cliente_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [tipo, producto_id, cantidad, referencia || '', responsable_id || null, proveedor_id || null, cliente_id || null]
    );

    res.status(201).json({ ok: true, movimiento: movimientoRes.rows[0], stock_actualizado: nuevoStock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Listar todos los movimientos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, p.nombre AS producto, u.nombre AS responsable
      FROM movimientos m
      LEFT JOIN productos p ON m.producto_id = p.id
      LEFT JOIN usuarios u ON m.responsable_id = u.id
      ORDER BY m.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
