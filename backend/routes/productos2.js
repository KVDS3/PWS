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

// 🔹 Agregar nuevo producto (SOLO campos de la tabla productos)
router.post('/', async (req, res) => {
  console.log('Datos recibidos en POST:', req.body); // Para debug
  
  const { 
    nombre,
    descripcion,
    precio,
    stock,
    codigo,
    categoria,
    unidad,
    stock_minimo
  } = req.body;

  // Validaciones
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio.' });
  }

  try {
    // 🔹 Insertar producto
    const productoResult = await pool.query(
      `INSERT INTO productos 
       (nombre, descripcion, precio, stock, codigo, categoria, unidad, stock_minimo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        nombre,
        descripcion || '',
        precio || 0,
        stock || 0,
        codigo || null,
        categoria || '',
        unidad || '',
        stock_minimo || 0
      ]
    );
    
    const producto = productoResult.rows[0];
    console.log('Producto insertado:', producto); // Para debug
    
    res.status(201).json({ 
      ok: true, 
      producto 
    });
  } catch (err) {
    console.error('Error en POST /productos:', err.message); // Para debug
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Actualizar producto con todos los campos
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Actualizando producto ID:', id, 'con datos:', req.body); // Para debug
  
  const { 
    nombre, 
    descripcion, 
    precio, 
    stock,
    codigo,
    categoria,
    unidad,
    stock_minimo
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE productos SET 
        nombre = $1,
        descripcion = $2,
        precio = $3,
        stock = $4,
        codigo = $5,
        categoria = $6,
        unidad = $7,
        stock_minimo = $8
       WHERE id = $9
       RETURNING *`,
      [
        nombre,
        descripcion || '',
        precio || 0,
        stock || 0,
        codigo || null,
        categoria || '',
        unidad || '',
        stock_minimo || 0,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json({ 
      ok: true, 
      producto: result.rows[0] 
    });
  } catch (err) {
    console.error('Error en PUT /productos/:id:', err.message); // Para debug
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Eliminar producto
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Eliminando producto ID:', id); // Para debug
  
  try {
    const result = await pool.query(
      'DELETE FROM productos WHERE id=$1 RETURNING *', 
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json({ 
      message: 'Producto eliminado', 
      producto: result.rows[0] 
    });
  } catch (err) {
    console.error('Error en DELETE /productos/:id:', err.message); // Para debug
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;