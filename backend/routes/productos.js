// routes/productos.js
const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// GET /api/productos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

module.exports = router;
