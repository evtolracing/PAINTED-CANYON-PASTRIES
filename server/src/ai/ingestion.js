const prisma = require('../config/database');
const { getProvider } = require('./provider');
const logger = require('../config/logger');

/**
 * Ingestion pipeline for RAG
 * Converts source data into AI documents and generates embeddings
 */

const CHUNK_SIZE = 500; // characters per chunk

const chunkText = (text, maxSize = CHUNK_SIZE) => {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxSize && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
};

const ingestProduct = async (product) => {
  const content = [
    `Product: ${product.name}`,
    product.shortDescription && `Description: ${product.shortDescription}`,
    product.description && `Details: ${product.description}`,
    `Price: $${product.basePrice}`,
    `Category: ${product.category?.name || 'Uncategorized'}`,
    product.badges?.length && `Badges: ${product.badges.join(', ')}`,
    product.allergenTags?.length && `Allergens: ${product.allergenTags.map(t =>
      `${t.allergen.name} (${t.severity})`
    ).join(', ')}`,
    product.nutritionNotes && `Nutrition: ${product.nutritionNotes}`,
    product.variants?.length && `Variants: ${product.variants.map(v => `${v.name} ($${v.price})`).join(', ')}`,
    product.addons?.length && `Add-ons: ${product.addons.map(a => `${a.name} ($${a.price})`).join(', ')}`,
  ].filter(Boolean).join('\n');

  return upsertDocument({
    sourceType: 'PRODUCT',
    sourceId: product.id,
    title: product.name,
    content,
    metadata: {
      categoryId: product.categoryId,
      price: product.basePrice,
      badges: product.badges,
      isActive: product.isActive,
    },
  });
};

const ingestKbArticle = async (article) => {
  const sourceType = article.isFaq ? 'FAQ' : (article.isInternal ? 'SOP' : 'KB_ARTICLE');

  return upsertDocument({
    sourceType,
    sourceId: article.id,
    title: article.title,
    content: article.content,
    metadata: {
      category: article.category?.name,
      isFaq: article.isFaq,
      isInternal: article.isInternal,
    },
  });
};

const ingestPolicy = async (key, title, content) => {
  return upsertDocument({
    sourceType: 'POLICY',
    sourceId: key,
    title,
    content,
    metadata: { key },
  });
};

const upsertDocument = async ({ sourceType, sourceId, title, content, metadata }) => {
  try {
    const provider = getProvider();

    // Upsert the document
    const doc = await prisma.aiDocument.upsert({
      where: { sourceType_sourceId: { sourceType, sourceId } },
      create: { sourceType, sourceId, title, content, metadata },
      update: { title, content, metadata, updatedAt: new Date() },
    });

    // Delete old embeddings
    await prisma.aiEmbedding.deleteMany({ where: { documentId: doc.id } });

    // Chunk and embed
    const chunks = chunkText(content);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await provider.embed(chunks[i]);

      // Insert embedding using raw SQL since Prisma doesn't support vector type natively
      await prisma.$executeRawUnsafe(
        `INSERT INTO ai_embeddings (id, document_id, chunk_index, chunk_text, embedding, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW())`,
        doc.id,
        i,
        chunks[i],
        `[${embedding.join(',')}]`
      );
    }

    logger.info(`Ingested document: ${sourceType}/${sourceId} (${chunks.length} chunks)`);
    return doc;
  } catch (error) {
    logger.error(`Ingestion failed for ${sourceType}/${sourceId}: ${error.message}`);
    throw error;
  }
};

const ingestAllProducts = async () => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      allergenTags: { include: { allergen: true } },
      variants: true,
      addons: true,
    },
  });

  let count = 0;
  for (const product of products) {
    await ingestProduct(product);
    count++;
  }
  logger.info(`Ingested ${count} products`);
  return count;
};

const ingestAllArticles = async () => {
  const articles = await prisma.kbArticle.findMany({
    where: { isPublished: true },
    include: { category: true },
  });

  let count = 0;
  for (const article of articles) {
    await ingestKbArticle(article);
    count++;
  }
  logger.info(`Ingested ${count} articles`);
  return count;
};

const ingestAll = async () => {
  const products = await ingestAllProducts();
  const articles = await ingestAllArticles();
  return { products, articles };
};

module.exports = {
  ingestProduct,
  ingestKbArticle,
  ingestPolicy,
  ingestAllProducts,
  ingestAllArticles,
  ingestAll,
  upsertDocument,
  chunkText,
};
