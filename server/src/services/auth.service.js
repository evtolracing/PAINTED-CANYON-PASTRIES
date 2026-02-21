const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

const register = async ({ email, password, firstName, lastName, phone, role = 'CUSTOMER' }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, phone, role },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, avatar: true },
  });

  // Create customer record for CUSTOMER role
  if (role === 'CUSTOMER') {
    await prisma.customer.create({
      data: { userId: user.id, email, firstName, lastName, phone },
    });
  }

  const tokens = generateTokens(user.id);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { user, ...tokens };
};

const login = async ({ email, password }, reqMeta = {}) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  const tokens = generateTokens(user.id);

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      userAgent: reqMeta.userAgent,
      ipAddress: reqMeta.ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
    },
    ...tokens,
  };
};

const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const session = await prisma.session.findUnique({ where: { refreshToken } });
    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Invalid refresh token', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, avatar: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found', 401);
    }

    const newTokens = generateTokens(user.id);

    // Rotate refresh token
    await prisma.session.update({
      where: { refreshToken },
      data: {
        refreshToken: newTokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { user, ...newTokens };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid refresh token', 401);
  }
};

const logout = async (refreshToken) => {
  await prisma.session.deleteMany({ where: { refreshToken } });
};

const logoutAll = async (userId) => {
  await prisma.session.deleteMany({ where: { userId } });
};

module.exports = { register, login, refreshAccessToken, logout, logoutAll };
