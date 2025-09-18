const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const nodemailer = require('nodemailer');

const verificationCodes = new Map();

// Configuración de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // o el SMTP de tu hosting
  auth: {
    user: 'bodegaurbana0@gmail.com',
    pass: 'dxmk bdfg nsnx wtii'
  }
});

/**
 * 1. Enviar código de verificación al correo
 */
router.post('/send-code', async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'Correo requerido' });

const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
  verificationCodes.set(email, code);

  try {
    await transporter.sendMail({
      from: '"Sistema de Usuarios" <tu-correo@gmail.com>',
      to: email,
      subject: 'Código de verificación',
      text: `Tu código de verificación es: ${code}`
    });

    res.json({ ok: true, message: 'Código enviado al correo' });
  } catch (err) {
    res.status(500).json({ error: 'Error enviando el correo', detail: err.message });
  }
});

/**
 * 2. Verificar código y registrar usuario
 */
router.post('/verify-code', async (req, res) => {
  const { nombre, email, password, rol, code } = req.body;

  // Validar que el código existe y coincide (case insensitive)
  const storedCode = verificationCodes.get(email);
  if (!storedCode || storedCode !== code) {
    return res.status(400).json({ error: 'Código incorrecto o expirado' });
  }

  try {
    // Verificar si el usuario ya existe
    const userExists = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );
    
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
      [nombre, email, password, rol || 'lector'] // Valor por defecto para rol
    );

    // Eliminar el código usado
    verificationCodes.delete(email);

    res.status(201).json({ ok: true, usuario: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. Listar usuarios
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, email, rol FROM usuarios');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. Crear nuevo usuario (sin código de verificación)
 */
router.post('/', async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  
  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
      [nombre, email, password, rol]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5. Login de usuario
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, password FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    const user = result.rows[0];

    // Comparar contraseñas (⚠️ en producción usar bcrypt)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    // Eliminar password del objeto antes de devolverlo
    delete user.password;

    res.json({ 
      ok: true,
      message: 'Login exitoso',
      usuario: user
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
