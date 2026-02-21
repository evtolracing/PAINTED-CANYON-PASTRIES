const nodemailer = require('nodemailer');
const logger = require('../config/logger');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || '"Painted Canyon Pastries" <orders@paintedcanyonpastries.com>',
      to,
      subject,
      html,
      text,
    });
    logger.info(`Email sent: ${info.messageId} to ${to}`);
    return info;
  } catch (error) {
    logger.error(`Email send failed: ${error.message}`);
    // Don't throw - email failures shouldn't block order flow
    return null;
  }
};

const orderConfirmationTemplate = (order) => {
  const itemsHtml = order.items?.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0ebe3;">
        ${item.product?.name || 'Item'}${item.variant ? ` - ${item.variant.name}` : ''}
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0ebe3; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0ebe3; text-align: right;">$${Number(item.totalPrice).toFixed(2)}</td>
    </tr>
  `).join('') || '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Georgia', serif; background: #faf7f2; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #c4956a 0%, #a67c52 100%); padding: 32px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 24px; letter-spacing: 1px;">PAINTED CANYON PASTRIES</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Joshua Tree, CA</p>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #3e2723; margin: 0 0 8px;">Order Confirmed! 🎉</h2>
      <p style="color: #6d4c41; font-size: 14px;">Order #${order.orderNumber}</p>
      <div style="background: #faf7f2; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #5d4037; font-size: 14px;">
          <strong>${order.fulfillmentType === 'DELIVERY' ? '🚗 Delivery' : '🏪 Pickup'}</strong><br>
          ${order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Date TBD'}
          ${order.scheduledSlot ? ` · ${order.scheduledSlot}` : ''}
        </p>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #3e2723;">
        <thead>
          <tr style="border-bottom: 2px solid #c4956a;">
            <th style="text-align: left; padding: 8px 0;">Item</th>
            <th style="text-align: center; padding: 8px 0;">Qty</th>
            <th style="text-align: right; padding: 8px 0;">Price</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="margin-top: 16px; text-align: right; font-size: 14px; color: #5d4037;">
        <p style="margin: 4px 0;">Subtotal: $${Number(order.subtotal).toFixed(2)}</p>
        ${Number(order.deliveryFee) > 0 ? `<p style="margin: 4px 0;">Delivery: $${Number(order.deliveryFee).toFixed(2)}</p>` : ''}
        ${Number(order.taxAmount) > 0 ? `<p style="margin: 4px 0;">Tax: $${Number(order.taxAmount).toFixed(2)}</p>` : ''}
        ${Number(order.tipAmount) > 0 ? `<p style="margin: 4px 0;">Tip: $${Number(order.tipAmount).toFixed(2)}</p>` : ''}
        ${Number(order.discountAmount) > 0 ? `<p style="margin: 4px 0; color: #2e7d32;">Discount: -$${Number(order.discountAmount).toFixed(2)}</p>` : ''}
        <p style="margin: 8px 0 0; font-size: 18px; font-weight: bold; color: #3e2723;">Total: $${Number(order.totalAmount).toFixed(2)}</p>
      </div>
    </div>
    <div style="background: #faf7f2; padding: 20px 32px; text-align: center; font-size: 12px; color: #8d6e63;">
      <p>Questions? Reply to this email or visit our FAQ.</p>
      <p>Painted Canyon Pastries · Joshua Tree, CA</p>
    </div>
  </div>
</body>
</html>`;
};

const orderStatusTemplate = (order, statusMessage) => {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Georgia', serif; background: #faf7f2; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #c4956a 0%, #a67c52 100%); padding: 24px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 20px;">PAINTED CANYON PASTRIES</h1>
    </div>
    <div style="padding: 32px; text-align: center;">
      <h2 style="color: #3e2723;">${statusMessage}</h2>
      <p style="color: #6d4c41;">Order #${order.orderNumber}</p>
      <div style="background: #faf7f2; border-radius: 8px; padding: 16px; margin: 20px 0; display: inline-block;">
        <p style="margin: 0; color: #5d4037; font-size: 14px;">
          ${order.fulfillmentType === 'DELIVERY' ? '🚗 Delivery' : '🏪 Pickup'}
          ${order.scheduledSlot ? ` · ${order.scheduledSlot}` : ''}
        </p>
      </div>
    </div>
    <div style="background: #faf7f2; padding: 16px 32px; text-align: center; font-size: 12px; color: #8d6e63;">
      <p>Painted Canyon Pastries · Joshua Tree, CA</p>
    </div>
  </div>
</body>
</html>`;
};

const sendOrderConfirmation = async (order) => {
  const email = order.customer?.email || order.guestEmail;
  if (!email) return;

  return sendEmail({
    to: email,
    subject: `Order Confirmed - #${order.orderNumber} | Painted Canyon Pastries`,
    html: orderConfirmationTemplate(order),
  });
};

const sendOrderStatusUpdate = async (order, status) => {
  const email = order.customer?.email || order.guestEmail;
  if (!email) return;

  const statusMessages = {
    CONFIRMED: 'Your order has been confirmed! ✅',
    IN_PRODUCTION: 'Your order is being prepared! 🧁',
    READY: 'Your order is ready for pickup! 🎉',
    OUT_FOR_DELIVERY: 'Your order is on its way! 🚗',
    COMPLETED: 'Thank you for your order! 💛',
    REFUNDED: 'Your order has been refunded.',
    CANCELLED: 'Your order has been cancelled.',
  };

  return sendEmail({
    to: email,
    subject: `Order Update - #${order.orderNumber} | Painted Canyon Pastries`,
    html: orderStatusTemplate(order, statusMessages[status] || `Status: ${status}`),
  });
};

const sendLowInventoryAlert = async (item) => {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return;

  return sendEmail({
    to: adminEmail,
    subject: `⚠️ Low Inventory: ${item.name}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Low Inventory Alert</h2>
        <p><strong>${item.name}</strong> is below reorder threshold.</p>
        <p>Current: ${item.currentStock} ${item.unit}</p>
        <p>Threshold: ${item.reorderThreshold} ${item.unit}</p>
        <p><a href="${process.env.CLIENT_URL}/admin/inventory">View Inventory</a></p>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendLowInventoryAlert,
  orderConfirmationTemplate,
  orderStatusTemplate,
};
