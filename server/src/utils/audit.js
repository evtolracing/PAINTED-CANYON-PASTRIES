const prisma = require('../config/database');
const logger = require('../config/logger');

const logAction = async ({ userId, action, entityType, entityId, metadata, ipAddress }) => {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entityType, entityId, metadata, ipAddress },
    });
  } catch (error) {
    logger.error(`Audit log failed: ${error.message}`);
  }
};

module.exports = { logAction };
