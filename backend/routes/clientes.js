const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { nombre, telefono, contacto } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre es obligatorio' });

  try {
    const result = await pool.query(
      'INSERT INTO clientes (nombre, telefono, contacto) VALUES ($1,$2,$3) RETURNING *',
      [nombre, telefono || '', contacto || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
