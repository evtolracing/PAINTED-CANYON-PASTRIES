const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { getProvider } = require('../ai/provider');
const logger = require('../config/logger');

// Slugify helper
const slugify = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// GET /api/recipes — list recipes
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'BAKER'), async (req, res, next) => {
  try {
    const { page = 1, limit = 25, search, tag, difficulty } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ingredients: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tag) where.tags = { has: tag };
    if (difficulty) where.difficulty = difficulty;

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.recipe.count({ where }),
    ]);

    res.json({
      success: true,
      data: recipes,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/recipes/:id — get single recipe
router.get('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER', 'BAKER'), async (req, res, next) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!recipe) throw new AppError('Recipe not found', 404);
    res.json({ success: true, data: recipe });
  } catch (error) {
    next(error);
  }
});

// POST /api/recipes — create recipe
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { title, description, ingredients, instructions, yield: recipeYield,
      prepTime, bakeTime, totalTime, temperature, difficulty, notes,
      imageUrl, documents, tags, isPublished, isAIGenerated } = req.body;

    if (!title) throw new AppError('Title is required', 400);

    let slug = slugify(title);
    const existing = await prisma.recipe.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const recipe = await prisma.recipe.create({
      data: {
        title,
        slug,
        description: description || null,
        ingredients: ingredients || null,
        instructions: instructions || null,
        yield: recipeYield || null,
        prepTime: prepTime ? parseInt(prepTime) : null,
        bakeTime: bakeTime ? parseInt(bakeTime) : null,
        totalTime: totalTime ? parseInt(totalTime) : null,
        temperature: temperature || null,
        difficulty: difficulty || null,
        notes: notes || null,
        imageUrl: imageUrl || null,
        documents: documents || null,
        tags: tags || [],
        isPublished: isPublished || false,
        isAIGenerated: isAIGenerated || false,
      },
    });

    res.status(201).json({ success: true, data: recipe });
  } catch (error) {
    next(error);
  }
});

// PUT /api/recipes/:id — update recipe
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Recipe not found', 404);

    const { title, description, ingredients, instructions, yield: recipeYield,
      prepTime, bakeTime, totalTime, temperature, difficulty, notes,
      imageUrl, documents, tags, isPublished } = req.body;

    let slug = existing.slug;
    if (title && title !== existing.title) {
      slug = slugify(title);
      const slugExists = await prisma.recipe.findFirst({
        where: { slug, id: { not: req.params.id } },
      });
      if (slugExists) slug = `${slug}-${Date.now()}`;
    }

    const recipe = await prisma.recipe.update({
      where: { id: req.params.id },
      data: {
        title: title ?? existing.title,
        slug,
        description: description !== undefined ? description : existing.description,
        ingredients: ingredients !== undefined ? ingredients : existing.ingredients,
        instructions: instructions !== undefined ? instructions : existing.instructions,
        yield: recipeYield !== undefined ? recipeYield : existing.yield,
        prepTime: prepTime !== undefined ? (prepTime ? parseInt(prepTime) : null) : existing.prepTime,
        bakeTime: bakeTime !== undefined ? (bakeTime ? parseInt(bakeTime) : null) : existing.bakeTime,
        totalTime: totalTime !== undefined ? (totalTime ? parseInt(totalTime) : null) : existing.totalTime,
        temperature: temperature !== undefined ? temperature : existing.temperature,
        difficulty: difficulty !== undefined ? difficulty : existing.difficulty,
        notes: notes !== undefined ? notes : existing.notes,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
        documents: documents !== undefined ? documents : existing.documents,
        tags: tags !== undefined ? tags : existing.tags,
        isPublished: isPublished !== undefined ? isPublished : existing.isPublished,
      },
    });

    res.json({ success: true, data: recipe });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/recipes/:id — delete recipe
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const existing = await prisma.recipe.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Recipe not found', 404);

    await prisma.recipe.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Recipe deleted' });
  } catch (error) {
    next(error);
  }
});

// POST /api/recipes/generate — AI-generate a recipe
router.post('/generate', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt) throw new AppError('Prompt is required', 400);

    const provider = getProvider();

    const messages = [
      {
        role: 'system',
        content: `You are a professional pastry chef and recipe developer for Painted Canyon Pastries, an artisan bakery in Joshua Tree, CA.

When given a prompt, generate a complete bakery recipe. Respond ONLY with valid JSON (no markdown, no code fences) in this exact format:
{
  "title": "Recipe Title",
  "description": "Brief description of the recipe",
  "ingredients": "Line-separated list of ingredients with quantities",
  "instructions": "Numbered step-by-step instructions",
  "yield": "e.g. 24 cookies, 1 loaf",
  "prepTime": 15,
  "bakeTime": 25,
  "totalTime": 40,
  "temperature": "350°F",
  "difficulty": "Easy or Medium or Advanced",
  "notes": "Tips, variations, storage instructions",
  "tags": ["tag1", "tag2"]
}

Keep the recipe professional, accurate, and suited for a commercial bakery. Use precise measurements. Include a mix of common and specialty ingredients when appropriate.`
      },
      { role: 'user', content: prompt },
    ];

    const result = await provider.chat(messages, {
      temperature: 0.7,
      maxTokens: 2048,
    });

    // Parse the JSON response
    let recipe;
    try {
      // Strip any markdown code fences if present
      let content = result.content.trim();
      content = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
      recipe = JSON.parse(content);
    } catch (parseErr) {
      logger.error(`AI recipe parse error: ${parseErr.message}`);
      throw new AppError('AI generated an invalid recipe format. Please try again.', 500);
    }

    res.json({ success: true, data: recipe });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
