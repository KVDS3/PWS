require('dotenv').config(); // Importante: Cargar variables de entorno primero
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Permite la conexión SSL con Neon sin certificados locales complejos
  },
});

// Evento para verificar conexión exitosa al iniciar el backend
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error de conexión a Neon DB:', err.stack);
  } else {
    console.log('✅ Conectado exitosamente a Neon PostgreSQL 🚀');
    release();
  }
});

module.exports = pool;