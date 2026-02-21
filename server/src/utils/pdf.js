const PDFDocument = require('pdfkit');

const generatePackSlip = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Header
      doc.fontSize(20).font('Helvetica-Bold')
        .text('PAINTED CANYON PASTRIES', { align: 'center' });
      doc.fontSize(10).font('Helvetica')
        .text('Joshua Tree, CA', { align: 'center' });
      doc.moveDown();

      // Pack Slip title
      doc.fontSize(16).font('Helvetica-Bold')
        .text('PACK SLIP', { align: 'center' });
      doc.moveDown();

      // Order info
      doc.fontSize(10).font('Helvetica');
      doc.text(`Order #: ${order.orderNumber}`);
      doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
      doc.text(`Type: ${order.fulfillmentType}`);
      if (order.scheduledDate) {
        doc.text(`Scheduled: ${new Date(order.scheduledDate).toLocaleDateString()} ${order.scheduledSlot || ''}`);
      }
      doc.moveDown();

      // Customer info
      const customerName = order.customer
        ? `${order.customer.firstName} ${order.customer.lastName}`
        : `${order.guestFirstName || ''} ${order.guestLastName || ''}`.trim() || 'Guest';
      doc.font('Helvetica-Bold').text('Customer:');
      doc.font('Helvetica').text(customerName);
      if (order.deliveryAddress) {
        doc.text(order.deliveryAddress);
      }
      doc.moveDown();

      // Items table
      doc.font('Helvetica-Bold');
      const tableTop = doc.y;
      doc.text('Qty', 50, tableTop, { width: 40 });
      doc.text('Item', 100, tableTop, { width: 300 });
      doc.text('Notes', 410, tableTop, { width: 140 });
      doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown(0.5);

      doc.font('Helvetica');
      for (const item of (order.items || [])) {
        const y = doc.y;
        doc.text(String(item.quantity), 50, y, { width: 40 });
        let itemName = item.product?.name || 'Item';
        if (item.variant) itemName += ` - ${item.variant.name}`;
        doc.text(itemName, 100, y, { width: 300 });
        doc.text(item.notes || '', 410, y, { width: 140 });

        // Addons
        if (item.addons?.length) {
          for (const addon of item.addons) {
            doc.fontSize(8).text(`  + ${addon.addon?.name || 'Add-on'}${addon.value ? `: ${addon.value}` : ''}`, 110);
          }
          doc.fontSize(10);
        }
        doc.moveDown(0.3);
      }

      // Production notes
      if (order.productionNotes) {
        doc.moveDown();
        doc.font('Helvetica-Bold').text('Production Notes:');
        doc.font('Helvetica').text(order.productionNotes);
      }

      // Packaging checklist
      if (order.packagingChecklist) {
        doc.moveDown();
        doc.font('Helvetica-Bold').text('Packaging Checklist:');
        doc.font('Helvetica');
        const checklist = typeof order.packagingChecklist === 'string'
          ? JSON.parse(order.packagingChecklist)
          : order.packagingChecklist;
        if (Array.isArray(checklist)) {
          checklist.forEach(item => doc.text(`☐ ${item}`));
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

const generateReceipt = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: [226, 600], margin: 10 }); // 80mm receipt width
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Header
      doc.fontSize(12).font('Helvetica-Bold')
        .text('PAINTED CANYON', { align: 'center' })
        .text('PASTRIES', { align: 'center' });
      doc.fontSize(7).font('Helvetica')
        .text('Joshua Tree, CA', { align: 'center' });
      doc.moveDown(0.5);
      doc.text('─'.repeat(30), { align: 'center' });

      // Order info
      doc.fontSize(8);
      doc.text(`Order: ${order.orderNumber}`);
      doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
      doc.text(`Type: ${order.fulfillmentType}`);
      doc.text('─'.repeat(30), { align: 'center' });

      // Items
      for (const item of (order.items || [])) {
        let name = item.product?.name || 'Item';
        if (item.variant) name += ` (${item.variant.name})`;
        doc.text(`${item.quantity}x ${name}`);
        doc.text(`   $${Number(item.totalPrice).toFixed(2)}`, { align: 'right' });
      }

      doc.text('─'.repeat(30), { align: 'center' });

      // Totals
      doc.text(`Subtotal: $${Number(order.subtotal).toFixed(2)}`, { align: 'right' });
      if (Number(order.taxAmount) > 0) doc.text(`Tax: $${Number(order.taxAmount).toFixed(2)}`, { align: 'right' });
      if (Number(order.deliveryFee) > 0) doc.text(`Delivery: $${Number(order.deliveryFee).toFixed(2)}`, { align: 'right' });
      if (Number(order.tipAmount) > 0) doc.text(`Tip: $${Number(order.tipAmount).toFixed(2)}`, { align: 'right' });
      if (Number(order.discountAmount) > 0) doc.text(`Discount: -$${Number(order.discountAmount).toFixed(2)}`, { align: 'right' });
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`TOTAL: $${Number(order.totalAmount).toFixed(2)}`, { align: 'right' });

      doc.moveDown();
      doc.fontSize(7).font('Helvetica')
        .text('Thank you for choosing', { align: 'center' })
        .text('Painted Canyon Pastries!', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generatePackSlip, generateReceipt };
