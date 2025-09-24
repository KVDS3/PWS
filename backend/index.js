const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

// Rutas
const usuariosRoutes = require('./routes/usuarios');
const productos2Router = require('./routes/productos2'); // productos2
const carritoRouter = require('./routes/carrito');
const pagosRouter = require('./routes/pagos');
const configuracionesRouter = require('./routes/configuraciones');

const app = express();
const swaggerDocument = YAML.load('./swagger/swagger.yaml');

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:8080'],
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rutas Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rutas API unificadas
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/productos2', productos2Router); // ruta separada para productos2
app.use('/api/carrito', carritoRouter);
app.use('/api/pagos', pagosRouter);
app.use('/api/configuraciones', configuracionesRouter);
// Ruta raíz
app.get('/', (req, res) => {
  res.send('API funcionando correctamente. Ve a /docs para la documentación Swagger.');
});

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
  console.log(`Documentación disponible en http://localhost:${PORT}/docs`);
});