const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/Authenticate');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  console.log('Register request received:', { name, email });
  if (!name || !email || !password) {
    console.log('Missing required fields:', { name, email, password });
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });
    const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    console.log('User registered successfully:', user.id);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, is_admin: user.is_admin } });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 'P2002') {
      console.log('Prisma P2002 error - duplicate email:', email);
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to register', details: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login request received:', { email });
  if (!email || !password) {
    console.log('Missing required fields:', { email, password });
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid password for user:', email);
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    console.log('User logged in successfully:', user.id);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, is_admin: user.is_admin } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message });
  }
});

router.get('/profile', authenticate, async (req, res) => {
  try {
    console.log('Fetching profile for user:', req.user.id);
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, theme_preference: true, language_preference: true, is_admin: true },
    });
    if (!user) {
      console.log('User not found for profile:', req.user.id);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('Profile fetched successfully for user:', user.id);
    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    console.log('Updating profile for user:', req.user.id);
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!user) {
      console.log('User not found for profile update:', req.user.id);
      return res.status(404).json({ error: 'User not found' });
    }
    const { theme_preference, language_preference } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        theme_preference: theme_preference || user.theme_preference,
        language_preference: language_preference || user.language_preference,
      },
      select: { id: true, name: true, email: true, theme_preference: true, language_preference: true, is_admin: true },
    });
    console.log('Profile updated successfully for user:', updatedUser.id);
    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

module.exports = router;