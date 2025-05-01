const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    console.log('Fetching forms for user:', req.user.id);
    if (!req.user.id) {
      console.log('User ID not found in token:', req.user);
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    const forms = await prisma.form.findMany({
      where: {
        OR: [
          { user_id: req.user.id },
          { template: { created_by: req.user.id } },
          { template: { creator: { is_admin: true } } },
        ],
      },
      include: {
        template: { select: { id: true, title: true } },
        user: { select: { name: true } },
        answers: { include: { question: true } },
      },
    });

    const formattedForms = forms.map(form => ({
      ...form,
      createdAt: form.created_at,
    }));

    console.log('Forms fetched successfully:', formattedForms.length);
    res.json(formattedForms);
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ error: 'Failed to fetch forms', details: error.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const form = await prisma.form.findUnique({
      where: { id: parseInt(id) },
      include: {
        template: { select: { id: true, title: true, created_by: true } },
        user: { select: { name: true } },
        answers: { include: { question: true } },
      },
    });
    if (!form) return res.status(404).json({ error: 'Form not found' });
    if (
      form.user_id !== req.user.id &&
      form.template.created_by !== req.user.id &&
      !req.user.is_admin
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(form);
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ error: 'Failed to fetch form', details: error.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const form = await prisma.form.findUnique({
      where: { id: parseInt(id) },
      include: { template: true },
    });
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    if (
      form.user_id !== req.user.id &&
      form.template.created_by !== req.user.id &&
      !req.user.is_admin
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.form.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ error: 'Failed to delete form', details: error.message });
  }
});

module.exports = router;
