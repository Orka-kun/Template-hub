const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    if (!decoded.is_admin) return res.status(403).json({ error: 'Admin access required' });
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.get('/', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, is_admin: true, status: true },
    });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/:id/block', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot block self' });
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { status: 'blocked' },
    });
    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

router.put('/:id/unblock', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { status: 'active' },
    });
    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot delete self' });
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.put('/:id/admin', authenticate, async (req, res) => {
  const { id } = req.params;
  const { is_admin } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { is_admin },
    });
    res.json({ message: `User ${is_admin ? 'added to' : 'removed from'} admins` });
  } catch (error) {
    console.error('Update admin status error:', error);
    res.status(500).json({ error: 'Failed to update admin status' });
  }
});

module.exports = router;