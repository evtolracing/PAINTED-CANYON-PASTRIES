const Joi = require('joi');

const productSchema = Joi.object({
  categoryId: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(200).required(),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).max(200),
  shortDescription: Joi.string().max(500).allow('', null),
  description: Joi.string().max(5000).allow('', null),
  basePrice: Joi.number().positive().precision(2).required(),
  compareAtPrice: Joi.number().positive().precision(2).allow(null),
  sku: Joi.string().max(50).allow('', null),
  badges: Joi.array().items(Joi.string()).default([]),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
  seasonalStart: Joi.date().allow(null),
  seasonalEnd: Joi.date().allow(null),
  nutritionNotes: Joi.string().max(2000).allow('', null),
  prepTimeMinutes: Joi.number().integer().min(0).allow(null),
  sortOrder: Joi.number().integer().default(0),
  allergenIds: Joi.array().items(Joi.object({
    allergenId: Joi.string().uuid().required(),
    severity: Joi.string().valid('contains', 'may_contain', 'facility').default('contains'),
  })),
  variants: Joi.array().items(Joi.object({
    id: Joi.string().uuid().optional(),
    name: Joi.string().required(),
    type: Joi.string().valid('size', 'pack', 'flavor').required(),
    price: Joi.number().min(0).precision(2).required(),
    sku: Joi.string().allow('', null),
    sortOrder: Joi.number().integer().default(0),
    isActive: Joi.boolean().default(true),
  })),
  addons: Joi.array().items(Joi.object({
    id: Joi.string().uuid().optional(),
    name: Joi.string().required(),
    price: Joi.number().min(0).precision(2).required(),
    isActive: Joi.boolean().default(true),
    isGlobal: Joi.boolean().default(false),
  })),
});

const updateProductSchema = productSchema.fork(
  ['categoryId', 'name', 'basePrice'],
  (field) => field.optional()
);

const categorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).max(100),
  description: Joi.string().max(500).allow('', null),
  image: Joi.string().allow('', null),
  sortOrder: Joi.number().integer().default(0),
  isActive: Joi.boolean().default(true),
});

module.exports = { productSchema, updateProductSchema, categorySchema };
