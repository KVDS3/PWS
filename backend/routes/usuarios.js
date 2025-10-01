require('dotenv').config(); // Cargar variables de entorno

const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken'); 
const { OAuth2Client } = require('google-auth-library');
const ms = require('ms'); // para convertir tiempos tipo "15s", "1h"

const client = new OAuth2Client('1023657360893-65p8bs4cd7jscntjspmfckb4hmnb8o6a.apps.googleusercontent.com'); 

const verificationCodes = new Map();

// Claves desde .env
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES; // ej: '15s', '1h'

// Configuración de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Función para generar JWT y mostrar expiración en consola
function generateToken(payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const expiresInMs = ms(JWT_EXPIRES);
  const expireDate = new Date(Date.now() + expiresInMs);

  console.log(`🕒 Token para ${payload.email || payload.nombre} expirará en: ${expireDate.toLocaleString()}`);

  // Mostrar mensaje cuando realmente expire
  setTimeout(() => {
    console.log(`❌ Token para ${payload.email || payload.nombre} ha expirado`);
  }, expiresInMs);

  return token;
}

/**
 * 1. Enviar código de verificación al correo (registro)
 */
router.post('/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Correo requerido' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes.set(email, code);

  try {
    await transporter.sendMail({
      from: `"Sistema de Usuarios" <${process.env.EMAIL_USER}>`,
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
  const storedCode = verificationCodes.get(email);
  if (!storedCode || storedCode !== code) return res.status(400).json({ error: 'Código incorrecto o expirado' });

  try {
    const userExists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (userExists.rows.length > 0) return res.status(400).json({ error: 'El usuario ya existe' });

    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
      [nombre, email, password, rol || 'lector']
    );

    verificationCodes.delete(email);

    const token = generateToken({ id: result.rows[0].id, nombre, email });

    res.status(201).json({ ok: true, usuario: result.rows[0], token });
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
 * 4. Crear nuevo usuario (sin código)
 */
router.post('/', async (req, res) => {
  const { nombre, email, password, rol } = req.body;
  if (!nombre || !email || !password || !rol) return res.status(400).json({ error: 'Todos los campos son obligatorios' });

  try {
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
      [nombre, email, password, rol]
    );

    const token = generateToken({ id: result.rows[0].id, nombre, email });

    res.status(201).json({ ok: true, usuario: result.rows[0], token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5A. Login (envía código)
 */
router.post('/login/send-code', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT id, nombre, email, rol, password FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

    const user = result.rows[0];
    if (user.password !== password) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes.set(email, code);

    try {
      await transporter.sendMail({
        from: `"Sistema de Usuarios" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Código de inicio de sesión',
        text: `Tu código de inicio de sesión es: ${code}`
      });

      res.json({ ok: true, message: 'Código enviado al correo' });
    } catch (mailError) {
      console.log(`⚠️ Modo OFFLINE: Código para ${email} es ${code}`);
      res.json({ ok: true, offline: true, message: 'Sin conexión a internet: el código se mostró en consola' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5B. Verificar código y completar login
 */
router.post('/login/verify-code', async (req, res) => {
  const { email, code } = req.body;
  const storedCode = verificationCodes.get(email);
  if (!storedCode || storedCode !== code) return res.status(400).json({ error: 'Código incorrecto o expirado' });

  try {
    const result = await pool.query('SELECT id, nombre, email, rol FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = result.rows[0];
    verificationCodes.delete(email);

    const token = generateToken({ id: user.id, nombre: user.nombre, email: user.email });

    res.json({ ok: true, message: 'Login exitoso', usuario: user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 6. Enviar código de recuperación
 */
router.post('/recovery/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Correo requerido' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  verificationCodes.set(email, code);

  try {
    await transporter.sendMail({
      from: `"Sistema de Usuarios" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Código de recuperación',
      text: `Tu código de recuperación es: ${code}`
    });

    res.json({ ok: true, message: 'Código de recuperación enviado al correo' });
  } catch (err) {
    res.status(500).json({ error: 'Error enviando el correo', detail: err.message });
  }
});

/**
 * 7. Verificar código de recuperación
 */
router.post('/recovery/verify-code', (req, res) => {
  const { email, code } = req.body;
  const storedCode = verificationCodes.get(email);

  if (!storedCode || storedCode !== code) return res.status(400).json({ error: 'Código incorrecto o expirado' });

  res.json({ ok: true, message: 'Código verificado' });
});

/**
 * 8. Resetear contraseña
 */
router.post('/recovery/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const result = await pool.query(
      'UPDATE usuarios SET password = $1 WHERE email = $2 RETURNING id, nombre, email, rol',
      [newPassword, email]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    verificationCodes.delete(email);

    const token = generateToken({ id: result.rows[0].id, nombre: result.rows[0].nombre, email: result.rows[0].email });

    res.json({ ok: true, message: 'Contraseña actualizada', usuario: result.rows[0], token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 9. Login con Google
 */
router.post('/google-login', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '1023657360893-65p8bs4cd7jscntjspmfckb4hmnb8o6a.apps.googleusercontent.com',
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const nombre = payload.name;

    let result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    let usuario;
    if (result.rows.length === 0) {
      const insert = await pool.query(
        'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
        [nombre, email, '', 'lector']
      );
      usuario = insert.rows[0];
    } else {
      usuario = result.rows[0];
    }

    const jwtToken = generateToken({ id: usuario.id, nombre: usuario.nombre, email: usuario.email });

    res.json({ ok: true, usuario, token: jwtToken });
  } catch (err) {
    res.status(400).json({ error: 'Token inválido', detail: err.message });
  }
});

module.exports = router;
