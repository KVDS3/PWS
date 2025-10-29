const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// 🔹 Listar todos los productos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Listar productos con alerta de stock bajo
router.get('/alertas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos WHERE stock < stock_minimo');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Agregar nuevo producto y registrar movimiento inicial
router.post('/', async (req, res) => {
  const { codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, precio, proveedor_id, responsable_id } = req.body;

  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio.' });
  if (!proveedor_id) return res.status(400).json({ error: 'El proveedor_id es obligatorio.' });
  if (!responsable_id) return res.status(400).json({ error: 'El responsable_id es obligatorio.' });

  try {
    // 🔹 Verificar que el proveedor existe
    const proveedor = await pool.query('SELECT * FROM proveedores WHERE id=$1', [proveedor_id]);
    if (proveedor.rows.length === 0) return res.status(400).json({ error: 'Proveedor no encontrado' });

    // 🔹 Insertar producto
    const productoResult = await pool.query(
      `INSERT INTO productos 
       (codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock, precio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        codigo || null,
        nombre,
        descripcion || '',
        categoria || '',
        unidad || '',
        stock_minimo || 0,
        stock_actual || 0,
        precio || 0
      ]
    );
    const producto = productoResult.rows[0];

    // 🔹 Registrar movimiento de entrada
    if (stock_actual > 0) {
      await pool.query(
        `INSERT INTO movimientos 
         (tipo, producto_id, cantidad, referencia, responsable_id, proveedor_id) 
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          'Entrada',
          producto.id,
          stock_actual,
          'Stock inicial',
          responsable_id,
          proveedor_id
        ]
      );
    }

    res.status(201).json({ ok: true, producto });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Actualizar un producto
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, descripcion, categoria, unidad, stock_minimo, stock_actual, precio } = req.body;

  try {
    const result = await pool.query(
      `UPDATE productos SET 
        codigo = $1,
        nombre = $2,
        descripcion = $3,
        categoria = $4,
        unidad = $5,
        stock_minimo = $6,
        stock = $7,
        precio = $8
       WHERE id = $9
       RETURNING *`,
      [
        codigo || null,
        nombre,
        descripcion || '',
        categoria || '',
        unidad || '',
        stock_minimo || 0,
        stock_actual || 0,
        precio || 0,
        id
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ok: true, producto: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Eliminar producto
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM productos WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado', producto: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
