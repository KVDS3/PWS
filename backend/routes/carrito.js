const express = require('express');
const pool = require('../db/connection');
const router = express.Router();

// Para simplificar, el carrito será temporal en memoria
let carritos = {};

// POST /api/carrito
router.post('/', (req, res) => {
  const { usuarioId, productoId, cantidad } = req.body;
  if (!carritos[usuarioId]) carritos[usuarioId] = [];
  carritos[usuarioId].push({ productoId, cantidad });
  res.json({ success: true, carrito: carritos[usuarioId] });
});

// GET /api/carrito/:usuarioId
router.get('/:usuarioId', (req, res) => {
  const { usuarioId } = req.params;
  res.json({ carrito: carritos[usuarioId] || [] });
});

module.exports = router;
