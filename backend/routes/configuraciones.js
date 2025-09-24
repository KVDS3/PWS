const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// Crear configuración si no existe
router.post('/', async (req, res) => {
  const { usuario_id } = req.body;
  if (!usuario_id) return res.status(400).json({ error: 'usuario_id es requerido' });

  try {
    // Verificar si ya existe
    const existe = await pool.query('SELECT * FROM configuraciones WHERE usuario_id=$1', [usuario_id]);
    if (existe.rows.length > 0) return res.status(200).json(existe.rows[0]);

    // Crear nueva configuración
    const result = await pool.query(
      'INSERT INTO configuraciones (usuario_id) VALUES ($1) RETURNING *',
      [usuario_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener configuración por usuario
router.get('/:usuario_id', async (req, res) => {
  const { usuario_id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM configuraciones WHERE usuario_id=$1', [usuario_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Configuración no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar configuración
router.put('/:usuario_id', async (req, res) => {
  const { usuario_id } = req.params;
  const { tema, notificaciones } = req.body;

  try {
    const result = await pool.query(
      'UPDATE configuraciones SET tema=$1, notificaciones=$2, actualizado_en=NOW() WHERE usuario_id=$3 RETURNING *',
      [tema, notificaciones, usuario_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Configuración no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// PATCH: actualizar solo el tema
router.patch('/:usuario_id', async (req, res) => {
  const { usuario_id } = req.params;
  const { tema } = req.body;

  try {
    const result = await pool.query(
      'UPDATE configuraciones SET tema=$1, actualizado_en=NOW() WHERE usuario_id=$2 RETURNING *',
      [tema, usuario_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Configuración no encontrada' });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
