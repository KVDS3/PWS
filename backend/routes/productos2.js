require('dotenv').config();
const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs'); // 🔹 LIBRERÍA EXCEL

// 1. Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- FUNCIÓN HELPER PARA ENVIAR CORREOS ---
async function enviarNotificacion(emailDestino, accion, producto) {
  if (!emailDestino) return;

  const stock = Number(producto.stock);
  const stockMin = Number(producto.stock_minimo);
  const esAgotado = (stock === 0);
  const esStockBajo = (stock <= stockMin && !esAgotado);
  
  let asunto = `Notificación: Producto ${accion}`;
  let mensaje = `
    Hola,
    
    Se ha realizado la acción de "${accion}" en el siguiente producto:
    
    - Nombre: ${producto.nombre}
    - Código: ${producto.codigo || 'N/A'}
    - Precio: $${producto.precio}
    - Stock Actual: ${stock}
    - Stock Mínimo: ${stockMin}
  `;

  if (accion !== 'Eliminado') {
    if (esAgotado) {
      asunto += " [🚨 URGENTE: STOCK AGOTADO]";
      mensaje += `\n\n🛑 ¡URGENTE! El stock de este producto se ha AGOTADO (0 unidades).`;
    } 
    else if (esStockBajo) {
      asunto += " [⚠️ ALERTA: STOCK BAJO]";
      mensaje += `\n\n⚠️ ¡ATENCIÓN! El stock de este producto es bajo o crítico.`;
    }
  }

  mensaje += `\n\nAtte. Sistema de Inventario`;

  try {
    await transporter.sendMail({
      from: `"Sistema Inventario" <${process.env.EMAIL_USER}>`,
      to: emailDestino,
      subject: asunto,
      text: mensaje
    });
  } catch (error) {
    console.error('❌ Error enviando correo de notificación:', error);
  }
}

// ---------------------------------------------------------
// 🔹 RUTA NUEVA: Generar Reporte Excel
// ---------------------------------------------------------
router.get('/reporte-excel', async (req, res) => {
  try {
    // 1. Obtener datos ordenados
    const result = await pool.query('SELECT * FROM productos ORDER BY id ASC');
    const productos = result.rows;

    // 2. Crear Libro y Hoja
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventario General');

    // 3. Definir Columnas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'CÓDIGO', key: 'codigo', width: 15 },
      { header: 'NOMBRE DEL PRODUCTO', key: 'nombre', width: 35 },
      { header: 'CATEGORÍA', key: 'categoria', width: 20 },
      { header: 'PRECIO', key: 'precio', width: 15 },
      { header: 'STOCK', key: 'stock', width: 12 },
      { header: 'STOCK MÍN.', key: 'stock_minimo', width: 12 },
      { header: 'UNIDAD', key: 'unidad', width: 12 },
      { header: 'ESTADO', key: 'estado', width: 20 } // Columna calculada
    ];

    // 4. Estilar Encabezado
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2C3E50' } // Azul oscuro profesional
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // 5. Agregar Filas
    productos.forEach(prod => {
      // Calcular estado para el reporte
      let estado = 'Normal';
      if (Number(prod.stock) === 0) estado = 'AGOTADO';
      else if (Number(prod.stock) <= Number(prod.stock_minimo)) estado = 'BAJO STOCK';

      const row = worksheet.addRow({
        id: prod.id,
        codigo: prod.codigo,
        nombre: prod.nombre,
        categoria: prod.categoria,
        precio: prod.precio,
        stock: prod.stock,
        stock_minimo: prod.stock_minimo,
        unidad: prod.unidad,
        estado: estado
      });

      // Centrar datos
      row.alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('precio').numFmt = '"$"#,##0.00'; 
      row.getCell('id').alignment = { horizontal: 'center' };
      row.getCell('stock').alignment = { horizontal: 'center' };
      row.getCell('stock_minimo').alignment = { horizontal: 'center' };

      // Colorear celda de Estado según condición
      const cellEstado = row.getCell('estado');
      cellEstado.alignment = { horizontal: 'center', vertical: 'middle' };
      cellEstado.font = { bold: true };

      if (estado === 'AGOTADO') {
        cellEstado.font.color = { argb: 'FF0000' }; // Rojo
      } else if (estado === 'BAJO STOCK') {
        cellEstado.font.color = { argb: 'FF8C00' }; // Naranja
      } else {
        cellEstado.font.color = { argb: '008000' }; // Verde
      }
    });

    // 6. Enviar archivo al cliente
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Inventario.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Error generando Excel:', err);
    res.status(500).send('Error al generar el reporte');
  }
});

// 🔹 Listar todos los productos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Listar alertas
router.get('/alertas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos WHERE stock < stock_minimo');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Agregar nuevo producto
router.post('/', async (req, res) => {
  const { nombre, descripcion, precio, stock, codigo, categoria, unidad, stock_minimo, usuarioEmail } = req.body;

  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio.' });

  try {
    const productoResult = await pool.query(
      `INSERT INTO productos (nombre, descripcion, precio, stock, codigo, categoria, unidad, stock_minimo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nombre, descripcion || '', precio || 0, stock || 0, codigo || null, categoria || '', unidad || '', stock_minimo || 0]
    );
    
    const producto = productoResult.rows[0];
    enviarNotificacion(usuarioEmail, 'Creado', producto);

    res.status(201).json({ ok: true, producto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Actualizar producto
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock, codigo, categoria, unidad, stock_minimo, usuarioEmail } = req.body;

  try {
    const result = await pool.query(
      `UPDATE productos SET nombre=$1, descripcion=$2, precio=$3, stock=$4, codigo=$5, categoria=$6, unidad=$7, stock_minimo=$8
       WHERE id=$9 RETURNING *`,
      [nombre, descripcion || '', precio || 0, stock || 0, codigo || null, categoria || '', unidad || '', stock_minimo || 0, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    
    enviarNotificacion(usuarioEmail, 'Editado', result.rows[0]);

    res.json({ ok: true, producto: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Eliminar producto
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { usuarioEmail } = req.query; 

  try {
    const result = await pool.query('DELETE FROM productos WHERE id=$1 RETURNING *', [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    
    enviarNotificacion(usuarioEmail, 'Eliminado', result.rows[0]);

    res.json({ message: 'Producto eliminado', producto: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;