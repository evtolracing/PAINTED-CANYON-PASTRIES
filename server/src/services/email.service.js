const nodemailer = require('nodemailer');
const logger = require('../config/logger');
const prisma = require('../config/database');

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

// ── Helper: load a customized template from database ──────
const loadTemplate = async (slug) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'email.templates' } });
    if (setting?.value) {
      const templates = setting.value;
      const tpl = templates.find(t => t.slug === slug);
      if (tpl) return tpl;
    }
  } catch (err) {
    logger.warn(`Could not load email template "${slug}" from DB, using hardcoded fallback: ${err.message}`);
  }
  return null;
};

// ── Helper: load bakery settings for merge tags ───────────
const loadBakerySettings = async () => {
  try {
    const settings = await prisma.setting.findMany();
    const map = {};
    for (const s of settings) map[s.key] = s.value;
    return {
      bakeryName: map['bakery.name'] || 'Painted Canyon Pastries',
      bakeryLocation: map['bakery.address'] || 'Joshua Tree, CA',
    };
  } catch {
    return { bakeryName: 'Painted Canyon Pastries', bakeryLocation: 'Joshua Tree, CA' };
  }
};

// ── Helper: interpolate merge tags ────────────────────────
const interpolate = (template, data) => {
  let result = template;
  // Handle conditional blocks {{#tag}}...{{/tag}}
  result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, tag, content) => {
    const val = data[`{{${tag}}}`];
    if (val && val !== '$0.00' && val !== '0' && val !== '') {
      // Recursively interpolate content inside the block
      return interpolate(content, data);
    }
    return '';
  });
  // Replace simple tags
  for (const [tag, value] of Object.entries(data)) {
    result = result.split(tag).join(value || '');
  }
  return result;
};

// ── Build order items HTML table ──────────────────────────
const buildOrderItemsTable = (order) => {
  const itemsHtml = order.items?.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0ebe3;">
        ${item.product?.name || 'Item'}${item.variant ? ` - ${item.variant.name}` : ''}
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0ebe3; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0ebe3; text-align: right;">$${Number(item.totalPrice).toFixed(2)}</td>
    </tr>
  `).join('') || '';

  return `<table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #3e2723;">
    <thead>
      <tr style="border-bottom: 2px solid #c4956a;">
        <th style="text-align: left; padding: 8px 0;">Item</th>
        <th style="text-align: center; padding: 8px 0;">Qty</th>
        <th style="text-align: right; padding: 8px 0;">Price</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>`;
};

// ── Build merge data for an order ─────────────────────────
const buildOrderMergeData = (order, bakery, statusMessage) => {
  const fulfillmentLabel = order.fulfillmentType === 'DELIVERY' ? '🚗 Delivery' : '🏪 Pickup';
  const scheduledDate = order.scheduledDate
    ? new Date(order.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : 'Date TBD';

  return {
    '{{bakeryName}}': bakery.bakeryName,
    '{{bakeryLocation}}': bakery.bakeryLocation,
    '{{orderNumber}}': order.orderNumber || '',
    '{{customerName}}': order.customer?.firstName || order.guestName?.split(' ')[0] || 'Customer',
    '{{fulfillmentLabel}}': fulfillmentLabel,
    '{{scheduledDate}}': scheduledDate,
    '{{scheduledSlot}}': order.scheduledSlot || '',
    '{{orderItemsTable}}': buildOrderItemsTable(order),
    '{{subtotal}}': `$${Number(order.subtotal).toFixed(2)}`,
    '{{deliveryFee}}': Number(order.deliveryFee) > 0 ? `$${Number(order.deliveryFee).toFixed(2)}` : '',
    '{{taxAmount}}': Number(order.taxAmount) > 0 ? `$${Number(order.taxAmount).toFixed(2)}` : '',
    '{{tipAmount}}': Number(order.tipAmount) > 0 ? `$${Number(order.tipAmount).toFixed(2)}` : '',
    '{{discountAmount}}': Number(order.discountAmount) > 0 ? `$${Number(order.discountAmount).toFixed(2)}` : '',
    '{{totalAmount}}': `$${Number(order.totalAmount).toFixed(2)}`,
    '{{statusMessage}}': statusMessage || '',
    '{{deliveryAddress}}': order.deliveryAddress || '',
    '{{shopUrl}}': process.env.CLIENT_URL || 'http://localhost:3000/shop',
  };
};

// ── Hardcoded fallbacks (existing templates kept for safety) ─

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

  // Try loading customized template from DB
  const bakery = await loadBakerySettings();
  const dbTemplate = await loadTemplate('order-confirmation');

  let subject, html;
  if (dbTemplate) {
    const mergeData = buildOrderMergeData(order, bakery);
    subject = interpolate(dbTemplate.subject, mergeData);
    html = interpolate(dbTemplate.body, mergeData);
  } else {
    // Fallback to hardcoded
    subject = `Order Confirmed - #${order.orderNumber} | ${bakery.bakeryName}`;
    html = orderConfirmationTemplate(order);
  }

  return sendEmail({ to: email, subject, html });
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
  const statusMessage = statusMessages[status] || `Status: ${status}`;

  const bakery = await loadBakerySettings();

  // For OUT_FOR_DELIVERY, try delivery-notification template first
  if (status === 'OUT_FOR_DELIVERY') {
    const deliveryTpl = await loadTemplate('delivery-notification');
    if (deliveryTpl) {
      const mergeData = buildOrderMergeData(order, bakery, statusMessage);
      return sendEmail({
        to: email,
        subject: interpolate(deliveryTpl.subject, mergeData),
        html: interpolate(deliveryTpl.body, mergeData),
      });
    }
  }

  // Use status-update template from DB
  const dbTemplate = await loadTemplate('order-status-update');

  let subject, html;
  if (dbTemplate) {
    const mergeData = buildOrderMergeData(order, bakery, statusMessage);
    subject = interpolate(dbTemplate.subject, mergeData);
    html = interpolate(dbTemplate.body, mergeData);
  } else {
    subject = `Order Update - #${order.orderNumber} | ${bakery.bakeryName}`;
    html = orderStatusTemplate(order, statusMessage);
  }

  return sendEmail({ to: email, subject, html });
};

const sendLowInventoryAlert = async (item) => {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return;

  const bakery = await loadBakerySettings();
  const dbTemplate = await loadTemplate('low-inventory-alert');

  let subject, html;
  if (dbTemplate) {
    const mergeData = {
      '{{bakeryName}}': bakery.bakeryName,
      '{{bakeryLocation}}': bakery.bakeryLocation,
      '{{itemName}}': item.name,
      '{{currentStock}}': String(item.currentStock),
      '{{unit}}': item.unit || '',
      '{{reorderThreshold}}': String(item.reorderThreshold),
      '{{inventoryUrl}}': `${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/inventory`,
    };
    subject = interpolate(dbTemplate.subject, mergeData);
    html = interpolate(dbTemplate.body, mergeData);
  } else {
    subject = `⚠️ Low Inventory: ${item.name}`;
    html = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Low Inventory Alert</h2>
        <p><strong>${item.name}</strong> is below reorder threshold.</p>
        <p>Current: ${item.currentStock} ${item.unit}</p>
        <p>Threshold: ${item.reorderThreshold} ${item.unit}</p>
        <p><a href="${process.env.CLIENT_URL}/admin/inventory">View Inventory</a></p>
      </div>
    `;
  }

  return sendEmail({ to: adminEmail, subject, html });
};

// ── Welcome email (new) ──────────────────────────────────
const sendWelcomeEmail = async (customer) => {
  const email = customer.email;
  if (!email) return;

  const bakery = await loadBakerySettings();
  const dbTemplate = await loadTemplate('welcome');

  let subject, html;
  if (dbTemplate) {
    const mergeData = {
      '{{bakeryName}}': bakery.bakeryName,
      '{{bakeryLocation}}': bakery.bakeryLocation,
      '{{customerName}}': customer.firstName || 'there',
      '{{shopUrl}}': `${process.env.CLIENT_URL || 'http://localhost:3000'}/shop`,
    };
    subject = interpolate(dbTemplate.subject, mergeData);
    html = interpolate(dbTemplate.body, mergeData);
  } else {
    subject = `Welcome to ${bakery.bakeryName}! 🧁`;
    html = `
      <div style="font-family: Georgia, serif; text-align: center; padding: 40px 20px; background: #faf7f2;">
        <h2 style="color: #3e2723;">Welcome, ${customer.firstName || 'there'}!</h2>
        <p style="color: #5d4037;">Thanks for joining ${bakery.bakeryName}.</p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/shop" style="display: inline-block; background: #c4956a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Start Shopping →</a>
      </div>
    `;
  }

  return sendEmail({ to: email, subject, html });
};

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendLowInventoryAlert,
  sendWelcomeEmail,
  orderConfirmationTemplate,
  orderStatusTemplate,
  loadTemplate,
  interpolate,
};
