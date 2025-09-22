    const express = require('express');
    const cors = require('cors');
    const swaggerUi = require('swagger-ui-express');
    const YAML = require('yamljs');
    const usuariosRoutes = require('./routes/usuarios');
    const productosRoutes = require('./routes/productos2');

    const app = express();
    const swaggerDocument = YAML.load('./swagger/swagger.yaml');

    // Middleware para permitir CORS
    app.use(cors({
      origin: 'http://localhost:4200',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Middleware para parsear JSON
    app.use(express.json());

    // Prefijo de API para todas las rutas
    app.use('/api/usuarios', usuariosRoutes);

    // Rutas de Swagger
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/productos', productosRoutes);

    // Ruta por defecto
    app.get('/', (req, res) => {
      res.json({ message: 'API funcionando correctamente' });
    });



    const PORT = 3000;
    app.listen(PORT, () => {
      console.log(`Servidor iniciado en http://localhost:${PORT}`);
      console.log(`Documentación disponible en http://localhost:${PORT}/docs`);
    });