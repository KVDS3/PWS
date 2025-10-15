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
const JWT_EXPIRES = process.env.JWT_EXPIRES;

// Configuración de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Función para generar JWT
function generateToken(payload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const expiresInMs = ms(JWT_EXPIRES);
  const expireDate = new Date(Date.now() + expiresInMs);

  console.log(`🕒 Token para ${payload.email || payload.nombre} expirará en: ${expireDate.toLocaleString()}`);
  setTimeout(() => {
    console.log(`❌ Token para ${payload.email || payload.nombre} ha expirado`);
  }, expiresInMs);

  return token;
}

/** Middleware para autenticar y renovar token automáticamente */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token requerido' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verifica sesión en DB
    const result = await pool.query('SELECT session_token FROM usuarios WHERE id = $1', [decoded.id]);
    if (!result.rows[0] || result.rows[0].session_token !== token) {
      return res.status(401).json({ error: 'Sesión no válida o cerrada en otro dispositivo' });
    }

    // Renovar token
    const refreshedToken = jwt.sign(
      { id: decoded.id, nombre: decoded.nombre, email: decoded.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    await pool.query('UPDATE usuarios SET session_token = $1 WHERE id = $2', [refreshedToken, decoded.id]);

    res.setHeader('x-refreshed-token', refreshedToken);

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/** 1. Enviar código de verificación al correo */
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

/** 2. Verificar código y registrar usuario */
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
    await pool.query('UPDATE usuarios SET session_token = $1 WHERE id = $2', [token, result.rows[0].id]);

    res.status(201).json({ ok: true, usuario: result.rows[0], token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 3. Listar usuarios (protegido) */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, email, rol FROM usuarios');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 4. Crear usuario sin código (validaciones detalladas con mensajes personalizados) */
router.post('/', async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  // Validaciones específicas
  if (!nombre) return res.status(400).json({ error: 'Nombre no proporcionado' });
  if (!email) return res.status(400).json({ error: 'Correo no proporcionado' });
  if (!password) return res.status(400).json({ error: 'Contraseña no proporcionada' });
  if (!rol) return res.status(400).json({ error: 'Rol no proporcionado' });

  // Validar nombre
  if (typeof nombre !== 'string' || nombre.trim() === '') {
    return res.status(400).json({ error: 'El nombre no puede estar vacío' });
  }
  if (nombre.length > 100) {
    return res.status(400).json({ error: 'El nombre no puede superar los 100 caracteres' });
  }
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(nombre)) {
    return res.status(400).json({ error: 'El nombre solo puede contener letras y espacios' });
  }

  // Validar correo
  if (!/^[\w.-]+@([\w-]+\.)+[A-Za-z]{2,}$/.test(email)) {
    return res.status(400).json({ error: 'Formato de correo inválido' });
  }
  if (!email.endsWith('@gmail.com')) {
    return res.status(400).json({ error: 'Solo se permiten correos de Gmail' });
  }

  // Validar contraseña
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos una letra mayúscula' });
  }
  if (!/[a-z]/.test(password)) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos una letra minúscula' });
  }
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos un número' });
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos un carácter especial' });
  }

  // Validar rol
  const rolesPermitidos = ['admin', 'editor', 'lector'];
  if (!rolesPermitidos.includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido. Solo se permiten admin, editor o lector' });
  }

  try {
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
      [nombre.trim(), email.trim().toLowerCase(), password, rol]
    );

    const token = generateToken({ id: result.rows[0].id, nombre, email });
    await pool.query('UPDATE usuarios SET session_token = $1 WHERE id = $2', [token, result.rows[0].id]);

    return res.status(201).json({ ok: true, usuario: result.rows[0], token });
  } catch (err) {
    console.error('❌ Error al crear usuario:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor', detail: err.message });
  }
});

/** 5. Login con código */
router.post('/login/send-code', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, password FROM usuarios WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

    const user = result.rows[0];
    if (user.password !== password)
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes.set(email, code);

    try {
      await transporter.sendMail({
        from: `"Sistema de Usuarios" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Código de inicio de sesión',
        text: `Tu código de inicio de sesión es: ${code}`,
      });

      res.json({ ok: true, message: 'Código enviado al correo' });
    } catch {
      console.log(`⚠️ Modo OFFLINE: Código para ${email} es ${code}`);
      res.json({
        ok: true,
        offline: true,
        message: 'Sin conexión a internet: código mostrado en consola',
        code,
      });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login/verify-code', async (req, res) => {
  const { email, code } = req.body;
  const storedCode = verificationCodes.get(email);

  if (!storedCode || storedCode !== code)
    return res.status(400).json({ error: 'Código incorrecto o expirado' });

  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, session_token FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = result.rows[0];
    verificationCodes.delete(email);

    if (user.session_token) {
      try {
        jwt.verify(user.session_token, JWT_SECRET);
        return res.status(403).json({
          error: 'El usuario ya tiene una sesión activa en otro dispositivo.'
        });
      } catch {
        console.log(`🔁 Token previo de ${email} expirado, generando uno nuevo.`);
      }
    }

    const token = generateToken({ id: user.id, nombre: user.nombre, email: user.email });
    await pool.query('UPDATE usuarios SET session_token = $1 WHERE id = $2', [token, user.id]);

    res.json({ ok: true, message: 'Login exitoso', usuario: user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 6. Logout */
router.post('/logout', async (req, res) => {
  const { email } = req.body;
  try {
    await pool.query('UPDATE usuarios SET session_token = NULL WHERE email = $1', [email]);
    res.json({ ok: true, message: 'Sesión cerrada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 7. Recuperación de contraseña */
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

router.post('/recovery/verify-code', (req, res) => {
  const { email, code } = req.body;
  const storedCode = verificationCodes.get(email);
  if (!storedCode || storedCode !== code)
    return res.status(400).json({ error: 'Código incorrecto o expirado' });

  res.json({ ok: true, message: 'Código verificado' });
});

router.post('/recovery/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const result = await pool.query(
      'UPDATE usuarios SET password = $1 WHERE email = $2 RETURNING id, nombre, email, rol',
      [newPassword, email]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    verificationCodes.delete(email);
    await pool.query('UPDATE usuarios SET session_token = NULL WHERE email = $1', [email]);

    const token = generateToken({ id: result.rows[0].id, nombre: result.rows[0].nombre, email: result.rows[0].email });
    res.json({ ok: true, message: 'Contraseña actualizada', usuario: result.rows[0], token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** 10. Login con Google */
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
    await pool.query('UPDATE usuarios SET session_token = $1 WHERE id = $2', [jwtToken, usuario.id]);

    res.json({ ok: true, usuario, token: jwtToken });
  } catch (err) {
    res.status(400).json({ error: 'Token inválido', detail: err.message });
  }
});

module.exports = router;
