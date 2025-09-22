const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

// Rutas
const usuariosRoutes = require('./routes/usuarios');
const productosRouter = require('./routes/productos');
const carritoRouter = require('./routes/carrito');
const pagosRouter = require('./routes/pagos'); // ✅ usamos el router

const app = express();
const swaggerDocument = YAML.load('./swagger/swagger.yaml');

// Middleware para parsear JSON
app.use(express.json());

// Middleware de CORS
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:8080'],
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 📌 Rutas de Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 📌 Rutas de la API
app.use('/usuarios', usuariosRoutes);
app.use('/productos', productosRouter);
app.use('/carrito', carritoRouter);
app.use('/api/pagos', pagosRouter); // ✅ ruta de pagos

// Ruta raíz
app.get('/', (req, res) => {
  res.send('API funcionando correctamente. Ve a /docs para la documentación Swagger.');
});

// Fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
