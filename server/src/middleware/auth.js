const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { AppError } = require('./errorHandler');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, avatar: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token', 401));
    }
    next(error);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, avatar: true, isActive: true },
    });

    if (user?.isActive) {
      req.user = user;
    }
    next();
  } catch {
    next();
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
};

// POS PIN-based auth
const authenticatePin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      throw new AppError('PIN required', 401);
    }

    const user = await prisma.user.findFirst({
      where: {
        pin,
        isActive: true,
        role: { in: ['CASHIER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN', 'BAKER'] },
      },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, avatar: true },
    });

    if (!user) {
      throw new AppError('Invalid PIN', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticate, optionalAuth, authorize, authenticatePin };
