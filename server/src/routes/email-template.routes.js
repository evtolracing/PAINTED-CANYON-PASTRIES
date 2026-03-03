const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const SETTINGS_KEY = 'email.templates';

// ── Default templates ─────────────────────────────────────
const DEFAULT_TEMPLATES = [
  {
    slug: 'order-confirmation',
    name: 'Order Confirmation',
    description: 'Sent when a new order is placed',
    subject: 'Order Confirmed - #{{orderNumber}} | {{bakeryName}}',
    body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Georgia', serif; background: #faf7f2; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #c4956a 0%, #a67c52 100%); padding: 32px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 24px; letter-spacing: 1px;">{{bakeryName}}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">{{bakeryLocation}}</p>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #3e2723; margin: 0 0 8px;">Order Confirmed! 🎉</h2>
      <p style="color: #6d4c41; font-size: 14px;">Order #{{orderNumber}}</p>
      <p style="color: #5d4037; font-size: 14px;">Hi {{customerName}}, thank you for your order!</p>
      <div style="background: #faf7f2; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #5d4037; font-size: 14px;">
          <strong>{{fulfillmentLabel}}</strong><br>
          {{scheduledDate}} {{scheduledSlot}}
        </p>
      </div>
      {{orderItemsTable}}
      <div style="margin-top: 16px; text-align: right; font-size: 14px; color: #5d4037;">
        <p style="margin: 4px 0;">Subtotal: {{subtotal}}</p>
        {{#deliveryFee}}<p style="margin: 4px 0;">Delivery: {{deliveryFee}}</p>{{/deliveryFee}}
        {{#taxAmount}}<p style="margin: 4px 0;">Tax: {{taxAmount}}</p>{{/taxAmount}}
        {{#tipAmount}}<p style="margin: 4px 0;">Tip: {{tipAmount}}</p>{{/tipAmount}}
        {{#discountAmount}}<p style="margin: 4px 0; color: #2e7d32;">Discount: -{{discountAmount}}</p>{{/discountAmount}}
        <p style="margin: 8px 0 0; font-size: 18px; font-weight: bold; color: #3e2723;">Total: {{totalAmount}}</p>
      </div>
    </div>
    <div style="background: #faf7f2; padding: 20px 32px; text-align: center; font-size: 12px; color: #8d6e63;">
      <p>Questions? Reply to this email or visit our FAQ.</p>
      <p>{{bakeryName}} · {{bakeryLocation}}</p>
    </div>
  </div>
</body>
</html>`,
    variables: [
      { tag: '{{bakeryName}}', description: 'Bakery name' },
      { tag: '{{bakeryLocation}}', description: 'Bakery location' },
      { tag: '{{orderNumber}}', description: 'Order number' },
      { tag: '{{customerName}}', description: 'Customer first name' },
      { tag: '{{fulfillmentLabel}}', description: 'Delivery or Pickup label with icon' },
      { tag: '{{scheduledDate}}', description: 'Scheduled date formatted' },
      { tag: '{{scheduledSlot}}', description: 'Time slot' },
      { tag: '{{orderItemsTable}}', description: 'HTML table of order items' },
      { tag: '{{subtotal}}', description: 'Order subtotal' },
      { tag: '{{deliveryFee}}', description: 'Delivery fee (conditional)' },
      { tag: '{{taxAmount}}', description: 'Tax amount (conditional)' },
      { tag: '{{tipAmount}}', description: 'Tip amount (conditional)' },
      { tag: '{{discountAmount}}', description: 'Discount amount (conditional)' },
      { tag: '{{totalAmount}}', description: 'Order total' },
    ],
  },
  {
    slug: 'order-status-update',
    name: 'Order Status Update',
    description: 'Sent when an order status changes',
    subject: 'Order Update - #{{orderNumber}} | {{bakeryName}}',
    body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Georgia', serif; background: #faf7f2; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #c4956a 0%, #a67c52 100%); padding: 24px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 20px;">{{bakeryName}}</h1>
    </div>
    <div style="padding: 32px; text-align: center;">
      <h2 style="color: #3e2723;">{{statusMessage}}</h2>
      <p style="color: #6d4c41;">Order #{{orderNumber}}</p>
      <p style="color: #5d4037; font-size: 14px;">Hi {{customerName}},</p>
      <div style="background: #faf7f2; border-radius: 8px; padding: 16px; margin: 20px 0; display: inline-block;">
        <p style="margin: 0; color: #5d4037; font-size: 14px;">
          {{fulfillmentLabel}} {{scheduledSlot}}
        </p>
      </div>
      <p style="color: #5d4037; font-size: 14px; margin-top: 20px;">Order Total: <strong>{{totalAmount}}</strong></p>
    </div>
    <div style="background: #faf7f2; padding: 16px 32px; text-align: center; font-size: 12px; color: #8d6e63;">
      <p>{{bakeryName}} · {{bakeryLocation}}</p>
    </div>
  </div>
</body>
</html>`,
    variables: [
      { tag: '{{bakeryName}}', description: 'Bakery name' },
      { tag: '{{bakeryLocation}}', description: 'Bakery location' },
      { tag: '{{orderNumber}}', description: 'Order number' },
      { tag: '{{customerName}}', description: 'Customer first name' },
      { tag: '{{statusMessage}}', description: 'Human-readable status message' },
      { tag: '{{fulfillmentLabel}}', description: 'Delivery or Pickup label' },
      { tag: '{{scheduledSlot}}', description: 'Time slot' },
      { tag: '{{totalAmount}}', description: 'Order total' },
    ],
  },
  {
    slug: 'welcome',
    name: 'Welcome Email',
    description: 'Sent when a new customer registers',
    subject: 'Welcome to {{bakeryName}}! 🧁',
    body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Georgia', serif; background: #faf7f2; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #c4956a 0%, #a67c52 100%); padding: 32px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 24px; letter-spacing: 1px;">{{bakeryName}}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">{{bakeryLocation}}</p>
    </div>
    <div style="padding: 32px; text-align: center;">
      <h2 style="color: #3e2723; margin: 0 0 16px;">Welcome, {{customerName}}! 🎉</h2>
      <p style="color: #5d4037; font-size: 15px; line-height: 1.6; max-width: 400px; margin: 0 auto 24px;">
        Thank you for joining the Painted Canyon family! We're thrilled to have you.
        Browse our handcrafted pastries and place your first order today.
      </p>
      <a href="{{shopUrl}}" style="display: inline-block; background: linear-gradient(135deg, #c4956a, #a67c52); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Start Shopping →
      </a>
    </div>
    <div style="background: #faf7f2; padding: 20px 32px; text-align: center; font-size: 12px; color: #8d6e63;">
      <p>{{bakeryName}} · {{bakeryLocation}}</p>
    </div>
  </div>
</body>
</html>`,
    variables: [
      { tag: '{{bakeryName}}', description: 'Bakery name' },
      { tag: '{{bakeryLocation}}', description: 'Bakery location' },
      { tag: '{{customerName}}', description: 'Customer first name' },
      { tag: '{{shopUrl}}', description: 'Link to the online shop' },
    ],
  },
  {
    slug: 'delivery-notification',
    name: 'Delivery Notification',
    description: 'Sent when order is out for delivery',
    subject: 'Your order is on its way! 🚗 #{{orderNumber}}',
    body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Georgia', serif; background: #faf7f2; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #c4956a 0%, #a67c52 100%); padding: 24px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 20px;">{{bakeryName}}</h1>
    </div>
    <div style="padding: 32px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚗</div>
      <h2 style="color: #3e2723; margin: 0 0 8px;">Your Order Is On Its Way!</h2>
      <p style="color: #6d4c41; font-size: 14px;">Order #{{orderNumber}}</p>
      <p style="color: #5d4037; font-size: 15px; margin: 16px 0;">
        Hi {{customerName}}, your delicious treats are being delivered now!
      </p>
      <div style="background: #faf7f2; border-radius: 8px; padding: 16px; margin: 20px auto; max-width: 300px;">
        <p style="margin: 0 0 8px; color: #5d4037; font-weight: bold;">Delivery Details</p>
        <p style="margin: 0; color: #5d4037; font-size: 14px;">{{deliveryAddress}}</p>
        <p style="margin: 4px 0 0; color: #8d6e63; font-size: 13px;">{{scheduledSlot}}</p>
      </div>
    </div>
    <div style="background: #faf7f2; padding: 16px 32px; text-align: center; font-size: 12px; color: #8d6e63;">
      <p>{{bakeryName}} · {{bakeryLocation}}</p>
    </div>
  </div>
</body>
</html>`,
    variables: [
      { tag: '{{bakeryName}}', description: 'Bakery name' },
      { tag: '{{bakeryLocation}}', description: 'Bakery location' },
      { tag: '{{orderNumber}}', description: 'Order number' },
      { tag: '{{customerName}}', description: 'Customer first name' },
      { tag: '{{deliveryAddress}}', description: 'Delivery address' },
      { tag: '{{scheduledSlot}}', description: 'Delivery time slot' },
    ],
  },
  {
    slug: 'newsletter-welcome',
    name: 'Newsletter Welcome',
    description: 'Sent when someone subscribes to the newsletter',
    subject: 'You\'re on the list! 🌵 | {{bakeryName}}',
    body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Georgia', serif; background: #faf7f2; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #c4956a 0%, #a67c52 100%); padding: 32px; text-align: center;">
      <h1 style="color: #fff; margin: 0; font-size: 24px; letter-spacing: 1px;">{{bakeryName}}</h1>
    </div>
    <div style="padding: 32px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">🌵</div>
      <h2 style="color: #3e2723; margin: 0 0 16px;">You're On the List!</h2>
      <p style="color: #5d4037; font-size: 15px; line-height: 1.6; max-width: 420px; margin: 0 auto 24px;">
        Thanks for subscribing! You'll be the first to know about new flavors,
        seasonal specials, and exclusive offers from our bakery.
      </p>
      <a href="{{shopUrl}}" style="display: inline-block; background: linear-gradient(135deg, #c4956a, #a67c52); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Browse Our Menu →
      </a>
    </div>
    <div style="background: #faf7f2; padding: 20px 32px; text-align: center; font-size: 12px; color: #8d6e63;">
      <p>{{bakeryName}} · {{bakeryLocation}}</p>
    </div>
  </div>
</body>
</html>`,
    variables: [
      { tag: '{{bakeryName}}', description: 'Bakery name' },
      { tag: '{{bakeryLocation}}', description: 'Bakery location' },
      { tag: '{{shopUrl}}', description: 'Link to the online shop' },
    ],
  },
  {
    slug: 'low-inventory-alert',
    name: 'Low Inventory Alert',
    description: 'Internal alert sent to admins when inventory is low',
    subject: '⚠️ Low Inventory: {{itemName}}',
    body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: #fff; border-radius: 8px; border-left: 4px solid #ff9800; padding: 24px;">
    <h2 style="color: #e65100; margin: 0 0 12px;">⚠️ Low Inventory Alert</h2>
    <p style="color: #333; font-size: 15px; margin: 0 0 16px;">
      <strong>{{itemName}}</strong> is below the reorder threshold.
    </p>
    <table style="width: 100%; font-size: 14px; color: #555;">
      <tr>
        <td style="padding: 6px 0;">Current Stock:</td>
        <td style="padding: 6px 0; font-weight: bold;">{{currentStock}} {{unit}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0;">Reorder Threshold:</td>
        <td style="padding: 6px 0; font-weight: bold;">{{reorderThreshold}} {{unit}}</td>
      </tr>
    </table>
    <a href="{{inventoryUrl}}" style="display: inline-block; margin-top: 16px; background: #ff9800; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 14px;">
      View Inventory →
    </a>
  </div>
</body>
</html>`,
    variables: [
      { tag: '{{itemName}}', description: 'Inventory item name' },
      { tag: '{{currentStock}}', description: 'Current stock level' },
      { tag: '{{unit}}', description: 'Unit of measurement' },
      { tag: '{{reorderThreshold}}', description: 'Reorder threshold' },
      { tag: '{{inventoryUrl}}', description: 'Link to inventory page' },
    ],
  },
];

// ── Helper: get templates from settings ───────────────────
async function getTemplates() {
  const setting = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
  return setting?.value || null;
}

async function initDefaults() {
  const existing = await getTemplates();
  if (!existing) {
    await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: {},
      create: { key: SETTINGS_KEY, value: DEFAULT_TEMPLATES },
    });
    return DEFAULT_TEMPLATES;
  }
  return existing;
}

// POST /api/email-templates — create a new template
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    let templates = await getTemplates();
    if (!templates) templates = await initDefaults();

    const { name, description, subject, body, variables } = req.body;
    if (!name) throw new AppError('Template name is required', 400);

    // Generate slug from name
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    // Ensure unique slug
    let suffix = 0;
    let finalSlug = slug;
    while (templates.find(t => t.slug === finalSlug)) {
      suffix++;
      finalSlug = `${slug}-${suffix}`;
    }

    const newTemplate = {
      slug: finalSlug,
      name,
      description: description || '',
      subject: subject || `${name} | {{bakeryName}}`,
      body: body || `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body style="font-family: 'Georgia', serif; background: #faf7f2; margin: 0; padding: 20px;">\n  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">\n    <div style="background: linear-gradient(135deg, #c4956a 0%, #a67c52 100%); padding: 32px; text-align: center;">\n      <h1 style="color: #fff; margin: 0; font-size: 24px;">{{bakeryName}}</h1>\n    </div>\n    <div style="padding: 32px;">\n      <h2 style="color: #3e2723;">Your content here</h2>\n      <p style="color: #5d4037;">Hi {{customerName}},</p>\n    </div>\n    <div style="background: #faf7f2; padding: 20px 32px; text-align: center; font-size: 12px; color: #8d6e63;">\n      <p>{{bakeryName}} · {{bakeryLocation}}</p>\n    </div>\n  </div>\n</body>\n</html>`,
      variables: variables || [
        { tag: '{{bakeryName}}', description: 'Bakery name' },
        { tag: '{{bakeryLocation}}', description: 'Bakery location' },
        { tag: '{{customerName}}', description: 'Customer first name' },
      ],
      isCustom: true,
    };

    templates.push(newTemplate);
    await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: templates },
      create: { key: SETTINGS_KEY, value: templates },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'email_template.created',
        entityType: 'email_template',
        entityId: finalSlug,
        metadata: { slug: finalSlug, name },
      },
    });

    res.status(201).json({ success: true, data: newTemplate });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/email-templates/:slug — delete a template
router.delete('/:slug', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    let templates = await getTemplates();
    if (!templates) templates = await initDefaults();

    const idx = templates.findIndex(t => t.slug === req.params.slug);
    if (idx === -1) throw new AppError('Template not found', 404);

    templates.splice(idx, 1);
    await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: templates },
      create: { key: SETTINGS_KEY, value: templates },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'email_template.deleted',
        entityType: 'email_template',
        entityId: req.params.slug,
        metadata: { slug: req.params.slug },
      },
    });

    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    next(error);
  }
});

// POST /api/email-templates/upload — upload an HTML file as a new template
router.post('/upload', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    let templates = await getTemplates();
    if (!templates) templates = await initDefaults();

    const { name, description, subject, htmlContent } = req.body;
    if (!name) throw new AppError('Template name is required', 400);
    if (!htmlContent) throw new AppError('HTML content is required', 400);

    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let suffix = 0;
    let finalSlug = slug;
    while (templates.find(t => t.slug === finalSlug)) {
      suffix++;
      finalSlug = `${slug}-${suffix}`;
    }

    // Auto-detect merge tags in the HTML
    const foundTags = new Set();
    const tagRegex = /\{\{([a-zA-Z_]+)\}\}/g;
    let match;
    while ((match = tagRegex.exec(htmlContent)) !== null) {
      if (!match[1].startsWith('#') && !match[1].startsWith('/')) {
        foundTags.add(match[1]);
      }
    }

    const descMap = {
      bakeryName: 'Bakery name', bakeryLocation: 'Bakery location',
      customerName: 'Customer first name', orderNumber: 'Order number',
      totalAmount: 'Order total', statusMessage: 'Status message',
      shopUrl: 'Shop URL', fulfillmentLabel: 'Delivery or Pickup',
      scheduledDate: 'Scheduled date', scheduledSlot: 'Time slot',
      subtotal: 'Subtotal', deliveryFee: 'Delivery fee',
      taxAmount: 'Tax', tipAmount: 'Tip', discountAmount: 'Discount',
      deliveryAddress: 'Delivery address', orderItemsTable: 'Order items table',
      itemName: 'Item name', currentStock: 'Current stock', unit: 'Unit',
      reorderThreshold: 'Reorder threshold', inventoryUrl: 'Inventory URL',
    };

    const variables = [...foundTags].map(tag => ({
      tag: `{{${tag}}}`,
      description: descMap[tag] || tag,
    }));

    const newTemplate = {
      slug: finalSlug, name,
      description: description || 'Uploaded template',
      subject: subject || `${name} | {{bakeryName}}`,
      body: htmlContent,
      variables,
      isCustom: true,
    };

    templates.push(newTemplate);
    await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: templates },
      create: { key: SETTINGS_KEY, value: templates },
    });

    res.status(201).json({ success: true, data: newTemplate });
  } catch (error) {
    next(error);
  }
});

// POST /api/email-templates/generate — AI-generate a template
router.post('/generate', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { name, purpose, tone, mergeTags } = req.body;
    if (!name || !purpose) throw new AppError('Name and purpose are required', 400);

    const { getProvider } = require('../ai/provider');
    const ai = getProvider();

    // Load bakery settings for context
    const settingsRows = await prisma.setting.findMany();
    const sMap = {};
    for (const s of settingsRows) sMap[s.key] = s.value;
    const bakeryName = sMap['bakery.name'] || 'Painted Canyon Pastries';
    const bakeryLocation = sMap['bakery.address'] || 'Joshua Tree, CA';

    const availableTags = mergeTags?.length > 0
      ? mergeTags.map(t => t.startsWith('{{') ? t : `{{${t}}}`).join(', ')
      : '{{bakeryName}}, {{bakeryLocation}}, {{customerName}}';

    const prompt = `You are an expert email template designer for a bakery called "${bakeryName}" located in ${bakeryLocation}.

Generate a professional, beautiful HTML email template for the following purpose:

Template Name: ${name}
Purpose: ${purpose}
Tone: ${tone || 'warm, friendly, professional'}

Available merge tags to use: ${availableTags}

Requirements:
- Use ONLY inline CSS styles (no <style> blocks) for maximum email client compatibility
- Use the bakery's color scheme: gradient header with #c4956a to #a67c52, cream background #faf7f2, dark brown text #3e2723/#5d4037
- Max-width 600px, centered, with rounded corners and subtle shadow
- Include a branded header with {{bakeryName}} and {{bakeryLocation}}
- Include a footer with bakery name and location
- Use Georgia serif font family
- Use the merge tags where appropriate (wrapped in double curly braces)
- Make it mobile-friendly with proper padding
- Keep it clean, elegant, and bakery-themed

Return ONLY the complete HTML (starting with <!DOCTYPE html>), nothing else. No markdown, no explanation, no backticks.`;

    const result = await ai.chat([
      { role: 'system', content: 'You are an expert HTML email template designer. Return ONLY raw HTML code, no markdown formatting, no code fences, no explanations.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.7, maxTokens: 4096 });

    let html = result.content.trim();
    // Clean up AI response — strip markdown code fences if present
    html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

    // Extract merge tags found in generated HTML
    const foundTags = new Set();
    const tagRegex = /\{\{([a-zA-Z_]+)\}\}/g;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      if (!match[1].startsWith('#') && !match[1].startsWith('/')) {
        foundTags.add(match[1]);
      }
    }

    const descMap = {
      bakeryName: 'Bakery name', bakeryLocation: 'Bakery location',
      customerName: 'Customer first name', orderNumber: 'Order number',
      totalAmount: 'Order total', statusMessage: 'Status message',
      shopUrl: 'Shop URL', fulfillmentLabel: 'Delivery or Pickup',
      scheduledDate: 'Scheduled date', scheduledSlot: 'Time slot',
      subtotal: 'Subtotal', deliveryFee: 'Delivery fee',
      taxAmount: 'Tax', tipAmount: 'Tip', discountAmount: 'Discount',
      deliveryAddress: 'Delivery address', orderItemsTable: 'Order items table',
    };

    const variables = [...foundTags].map(tag => ({
      tag: `{{${tag}}}`,
      description: descMap[tag] || tag,
    }));

    res.json({
      success: true,
      data: {
        name,
        description: purpose,
        subject: `${name} | {{bakeryName}}`,
        body: html,
        variables,
      },
    });
  } catch (error) {
    if (error.message?.includes('API key')) {
      return next(new AppError('AI provider not configured. Set your API key in environment variables.', 503));
    }
    next(error);
  }
});

// GET /api/email-templates — list all templates
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    let templates = await getTemplates();
    if (!templates) {
      templates = await initDefaults();
    }
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
});

// GET /api/email-templates/:slug — get single template
router.get('/:slug', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    let templates = await getTemplates();
    if (!templates) templates = await initDefaults();

    const template = templates.find(t => t.slug === req.params.slug);
    if (!template) throw new AppError('Template not found', 404);
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

// PUT /api/email-templates/:slug — update a template
router.put('/:slug', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    let templates = await getTemplates();
    if (!templates) templates = await initDefaults();

    const idx = templates.findIndex(t => t.slug === req.params.slug);
    if (idx === -1) throw new AppError('Template not found', 404);

    const { subject, body, name, description } = req.body;
    if (subject !== undefined) templates[idx].subject = subject;
    if (body !== undefined) templates[idx].body = body;
    if (name !== undefined) templates[idx].name = name;
    if (description !== undefined) templates[idx].description = description;

    await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: templates },
      create: { key: SETTINGS_KEY, value: templates },
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'email_template.updated',
        entityType: 'email_template',
        entityId: req.params.slug,
        metadata: { slug: req.params.slug },
      },
    });

    res.json({ success: true, data: templates[idx] });
  } catch (error) {
    next(error);
  }
});

// POST /api/email-templates/:slug/reset — reset a template to default
router.post('/:slug/reset', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    let templates = await getTemplates();
    if (!templates) templates = await initDefaults();

    const idx = templates.findIndex(t => t.slug === req.params.slug);
    if (idx === -1) throw new AppError('Template not found', 404);

    const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.slug === req.params.slug);
    if (!defaultTemplate) throw new AppError('No default template for this slug', 404);

    templates[idx] = { ...defaultTemplate };

    await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: templates },
      create: { key: SETTINGS_KEY, value: templates },
    });

    res.json({ success: true, data: templates[idx] });
  } catch (error) {
    next(error);
  }
});

// POST /api/email-templates/:slug/preview — render template with sample data
router.post('/:slug/preview', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    let templates = await getTemplates();
    if (!templates) templates = await initDefaults();

    const template = templates.find(t => t.slug === req.params.slug);
    if (!template) throw new AppError('Template not found', 404);

    const sampleData = {
      '{{bakeryName}}': 'Painted Canyon Pastries',
      '{{bakeryLocation}}': 'Joshua Tree, CA',
      '{{orderNumber}}': 'PCP-20260302-001',
      '{{customerName}}': 'Jane',
      '{{fulfillmentLabel}}': '🚗 Delivery',
      '{{scheduledDate}}': 'Monday, March 2, 2026',
      '{{scheduledSlot}}': '10:00 AM – 12:00 PM',
      '{{subtotal}}': '$42.50',
      '{{deliveryFee}}': '$5.00',
      '{{taxAmount}}': '$3.91',
      '{{tipAmount}}': '$5.00',
      '{{discountAmount}}': '$0.00',
      '{{totalAmount}}': '$56.41',
      '{{statusMessage}}': 'Your order is being prepared! 🧁',
      '{{shopUrl}}': process.env.CLIENT_URL || 'http://localhost:3000/shop',
      '{{deliveryAddress}}': '123 Desert View Rd, Joshua Tree, CA 92252',
      '{{itemName}}': 'All-Purpose Flour',
      '{{currentStock}}': '5',
      '{{unit}}': 'lbs',
      '{{reorderThreshold}}': '20',
      '{{inventoryUrl}}': `${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/inventory`,
      '{{orderItemsTable}}': `<table style="width:100%;border-collapse:collapse;font-size:14px;color:#3e2723;">
        <thead><tr style="border-bottom:2px solid #c4956a;">
          <th style="text-align:left;padding:8px 0;">Item</th>
          <th style="text-align:center;padding:8px 0;">Qty</th>
          <th style="text-align:right;padding:8px 0;">Price</th>
        </tr></thead>
        <tbody>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f0ebe3;">Canyon Sunrise Croissant</td><td style="text-align:center;padding:8px 0;border-bottom:1px solid #f0ebe3;">2</td><td style="text-align:right;padding:8px 0;border-bottom:1px solid #f0ebe3;">$9.00</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f0ebe3;">Desert Bloom Cupcake - 6 pack</td><td style="text-align:center;padding:8px 0;border-bottom:1px solid #f0ebe3;">1</td><td style="text-align:right;padding:8px 0;border-bottom:1px solid #f0ebe3;">$24.00</td></tr>
          <tr><td style="padding:8px 0;">Sage Shortbread Cookies</td><td style="text-align:center;padding:8px 0;">1</td><td style="text-align:right;padding:8px 0;">$9.50</td></tr>
        </tbody></table>`,
    };

    // Also handle conditional blocks {{#tag}}...{{/tag}}
    let rendered = template.body;
    // Replace conditional blocks
    rendered = rendered.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, tag, content) => {
      const val = sampleData[`{{${tag}}}`];
      if (val && val !== '$0.00' && val !== '0' && val !== '') {
        return content;
      }
      return '';
    });
    // Replace simple tags
    for (const [tag, value] of Object.entries(sampleData)) {
      rendered = rendered.split(tag).join(value);
    }

    let renderedSubject = template.subject;
    for (const [tag, value] of Object.entries(sampleData)) {
      renderedSubject = renderedSubject.split(tag).join(value);
    }

    res.json({ success: true, data: { subject: renderedSubject, html: rendered } });
  } catch (error) {
    next(error);
  }
});

// POST /api/email-templates/:slug/send-test — send a test email
router.post('/:slug/send-test', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { email: testEmail } = req.body;
    if (!testEmail) throw new AppError('Email address is required', 400);

    // Use preview endpoint logic to render
    const previewRes = await new Promise((resolve, reject) => {
      const mockReq = { params: { slug: req.params.slug }, user: req.user };
      const mockRes = { json: (d) => resolve(d) };
      router.handle({ ...req, method: 'POST', url: `/${req.params.slug}/preview`, path: `/${req.params.slug}/preview` }, mockRes, reject);
    }).catch(() => null);

    // Fallback: do inline render
    let templates = await getTemplates();
    if (!templates) templates = await initDefaults();
    const template = templates.find(t => t.slug === req.params.slug);
    if (!template) throw new AppError('Template not found', 404);

    const { sendEmail } = require('../services/email.service');
    await sendEmail({
      to: testEmail,
      subject: `[TEST] ${template.subject.replace(/\{\{bakeryName\}\}/g, 'Painted Canyon Pastries').replace(/\{\{orderNumber\}\}/g, 'PCP-TEST-001')}`,
      html: template.body
        .replace(/\{\{bakeryName\}\}/g, 'Painted Canyon Pastries')
        .replace(/\{\{bakeryLocation\}\}/g, 'Joshua Tree, CA')
        .replace(/\{\{customerName\}\}/g, 'Test User')
        .replace(/\{\{orderNumber\}\}/g, 'PCP-TEST-001')
        .replace(/\{\{fulfillmentLabel\}\}/g, '🏪 Pickup')
        .replace(/\{\{scheduledDate\}\}/g, 'Monday, March 2, 2026')
        .replace(/\{\{scheduledSlot\}\}/g, '10:00 AM – 12:00 PM')
        .replace(/\{\{subtotal\}\}/g, '$42.50')
        .replace(/\{\{totalAmount\}\}/g, '$46.41')
        .replace(/\{\{statusMessage\}\}/g, 'Your order has been confirmed! ✅')
        .replace(/\{\{shopUrl\}\}/g, process.env.CLIENT_URL || 'http://localhost:3000/shop')
        .replace(/\{\{#\w+\}\}[\s\S]*?\{\{\/\w+\}\}/g, '')
        .replace(/\{\{\w+\}\}/g, ''),
    });

    res.json({ success: true, message: `Test email sent to ${testEmail}` });
  } catch (error) {
    next(error);
  }
});

// PUT /api/email-templates/:slug/variables — update template variables
router.put('/:slug/variables', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    let templates = await getTemplates();
    if (!templates) templates = await initDefaults();

    const idx = templates.findIndex(t => t.slug === req.params.slug);
    if (idx === -1) throw new AppError('Template not found', 404);

    const { variables } = req.body;
    if (!Array.isArray(variables)) throw new AppError('Variables must be an array', 400);
    templates[idx].variables = variables;

    await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: templates },
      create: { key: SETTINGS_KEY, value: templates },
    });

    res.json({ success: true, data: templates[idx] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.DEFAULT_TEMPLATES = DEFAULT_TEMPLATES;
module.exports.getTemplates = getTemplates;
module.exports.initDefaults = initDefaults;
