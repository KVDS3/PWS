const PDFDocument = require('pdfkit');
const fs = require('fs');

function generarFacturaPDF(usuario, carrito, total, archivo) {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(archivo));

  doc.fontSize(20).text('Factura de Compra', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(`Hola ${usuario.nombre}, gracias por tu compra.`);
  doc.moveDown();

  carrito.forEach(item => {
    doc.text(`${item.cantidad} x ${item.nombre} - $${item.precio}`);
  });

  doc.moveDown();
  doc.text(`Total: $${total}`);
  doc.end();
}

module.exports = { generarFacturaPDF };
