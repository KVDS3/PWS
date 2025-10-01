const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken'); 
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('1023657360893-65p8bs4cd7jscntjspmfckb4hmnb8o6a.apps.googleusercontent.com'); 

const verificationCodes = new Map();

// Clave secreta para JWT (en producción usar variable de entorno)
const JWT_SECRET = 'mi_clave_secreta';

// Configuración de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'bodegaurbana0@gmail.com',
    pass: 'dxmk bdfg nsnx wtii'
  }
});

/**
 * 1. Enviar código de verificación al correo (para registro)
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

  const storedCode = verificationCodes.get(email);
  if (!storedCode || storedCode !== code) {
    return res.status(400).json({ error: 'Código incorrecto o expirado' });
  }

  try {
    const userExists = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );
    
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
      [nombre, email, password, rol || 'lector']
    );

    verificationCodes.delete(email);

    // Generar token JWT
    const token = jwt.sign({ id: result.rows[0].id, nombre, email }, JWT_SECRET, { expiresIn: '1h' });

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
  
  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
      [nombre, email, password, rol]
    );

    const token = jwt.sign({ id: result.rows[0].id, nombre, email }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ ok: true, usuario: result.rows[0], token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5A. Paso 1: Login (envía código si email/pass son correctos)
 */
/**
 * 5A. Paso 1: Login (envía código si email/pass son correctos)
 * - Si no hay internet, entra en modo offline (muestra código en consola)
 */
router.post('/login/send-code', async (req, res) => {
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

    if (user.password !== password) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    // Generar código
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes.set(email, code);

    try {
      // Intentar enviar correo
      await transporter.sendMail({
        from: '"Sistema de Usuarios" <tu-correo@gmail.com>',
        to: email,
        subject: 'Código de inicio de sesión',
        text: `Tu código de inicio de sesión es: ${code}`
      });

      return res.json({ ok: true, message: 'Código enviado al correo' });
    } catch (mailError) {
      // 🚨 Si falla el envío (ej. no hay internet)
      console.log(`⚠️ Modo OFFLINE: Código para ${email} es ${code}`);
      return res.json({
        ok: true,
        offline: true,
        message: 'Sin conexión a internet: el código se mostró en consola'
      });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * 5B. Paso 2: Verificar código y completar login
 */
router.post('/login/verify-code', async (req, res) => {
  const { email, code } = req.body;

  const storedCode = verificationCodes.get(email);
  if (!storedCode || storedCode !== code) {
    return res.status(400).json({ error: 'Código incorrecto o expirado' });
  }

  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    verificationCodes.delete(email);

    // Generar token JWT
    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

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
      from: '"Sistema de Usuarios" <tu-correo@gmail.com>',
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

  if (!storedCode || storedCode !== code) {
    return res.status(400).json({ error: 'Código incorrecto o expirado' });
  }

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

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    verificationCodes.delete(email);

    const token = jwt.sign({ id: result.rows[0].id, nombre: result.rows[0].nombre, email: result.rows[0].email }, JWT_SECRET, { expiresIn: '1h' });

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

    // Generar token JWT
    const jwtToken = jwt.sign({ id: usuario.id, nombre: usuario.nombre, email: usuario.email }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ ok: true, usuario, token: jwtToken });
  } catch (err) {
    res.status(400).json({ error: 'Token inválido', detail: err.message });
  }
});

module.exports = router;
