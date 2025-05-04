const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/authenticate');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// Utility function to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Utility function to validate question type
const validQuestionTypes = [
  'single_line',
  'multi_line',
  'positive_integer',
  'checkbox',
  'fixed_user',
  'fixed_date',
];

// Utility function to validate topic
const validTopics = ['Education', 'Quiz', 'Other'];

// GET /templates - Fetch all templates (public or user-specific)
router.get('/', async (req, res) => {
  console.log('Received GET /api/templates request');
  try {
    let user = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        user = await jwt.verify(token, process.env.JWT_SECRET);
        console.log('Authenticated user for GET /api/templates:', user.id);
      } catch (error) {
        console.log('No valid token provided for GET /api/templates, proceeding as unauthenticated:', error.message);
      }
    } else {
      console.log('No Authorization header provided for GET /api/templates, proceeding as unauthenticated');
    }

    const templates = await prisma.template.findMany({
      where: user
        ? {
            OR: [
              { created_by: user.id },
              { access: { some: { user_id: user.id } } },
              { is_public: true },
            ],
          }
        : { is_public: true },
      include: {
        creator: { select: { name: true } },
        tags: { include: { tag: true } },
        forms: true, // Include forms to calculate top templates
      },
    });

    const processedTemplates = templates.map((t) => ({
      ...t,
      user: t.creator || { name: 'Unknown User' }, // Fallback for creator
      tags: t.tags.map((tt) => tt.tag),
      description: t.description || '', // Return plain text
      createdAt: t.createdAt,
    }));

    console.log('Templates fetched successfully:', processedTemplates.length);
    res.json(processedTemplates);
  } catch (error) {
    console.error('Get templates error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to fetch templates', details: error.message });
  }
});

// GET /templates/shared - Fetch templates shared with the user
router.get('/shared', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.query.user_id, 10);
    if (isNaN(userId)) {
      console.log('Invalid user ID:', req.query.user_id);
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    console.log(`Fetching shared templates for user_id: ${userId}`);
    const templates = await prisma.template.findMany({
      where: {
        access: { some: { user_id: userId } },
        created_by: { not: userId }, // Exclude templates created by the user
      },
      include: {
        creator: { select: { name: true } },
        tags: { include: { tag: true } },
        forms: true,
      },
    });

    if (!templates || templates.length === 0) {
      console.log(`No shared templates found for user_id: ${userId}`);
      return res.status(404).json({ error: 'No shared templates found' });
    }

    const processedTemplates = templates.map((t) => ({
      ...t,
      user: t.creator || { name: 'Unknown User' },
      tags: t.tags.map((tt) => tt.tag),
      description: t.description || '', // Return plain text
      createdAt: t.createdAt,
    }));

    console.log(`Shared templates fetched successfully for user_id: ${userId}:`, processedTemplates.length);
    res.json(processedTemplates);
  } catch (error) {
    console.error('Get shared templates error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to fetch shared templates', details: error.message });
  }
});

// GET /templates/:id - Fetch a specific template
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    console.log('Invalid template ID:', id);
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  try {
    console.log(`Fetching template ID ${id} for user:`, req.user.id);
    const template = await prisma.template.findUnique({
      where: { id: parseInt(id) },
      include: {
        questions: true,
        forms: {
          include: {
            answers: { include: { question: true } },
            user: { select: { name: true } },
          },
          where: {
            OR: [
              { user_id: req.user.id },
              { template: { created_by: req.user.id } },
              { template: { access: { some: { user_id: req.user.id } } } },
            ],
          },
        },
        comments: { include: { user: { select: { name: true } } } },
        likes: true,
        tags: { include: { tag: true } },
        access: { include: { user: { select: { email: true, name: true } } } },
        creator: { select: { name: true, is_admin: true } },
      },
    });

    if (!template) {
      console.log(`Template ID ${id} not found`);
      return res.status(404).json({ error: 'Template not found' });
    }

    // Fallback for creator if user is missing
    const creator = template.creator || { name: 'Unknown User', is_admin: false };

    const hasAccess =
      template.is_public ||
      template.created_by === req.user.id ||
      template.access.some((a) => a.user_id === req.user.id) ||
      req.user.is_admin;

    console.log(`Access check for user ${req.user.id} on template ${id}:`, {
      created_by: template.created_by,
      is_public: template.is_public,
      access: template.access,
      is_admin: req.user.is_admin,
      hasAccess,
    });

    if (!hasAccess) {
      console.log(`User ${req.user.id} does not have access to template ID ${id}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    const numericQuestions = (template.questions || [])
      .filter((q) => q.type === 'positive_integer')
      .map((q) => q.id);

    let aggregation = [];
    if (numericQuestions.length > 0) {
      try {
        aggregation = await prisma.answer.groupBy({
          by: ['question_id'],
          where: {
            form: { template_id: parseInt(id) },
            question_id: { in: numericQuestions },
          },
          _avg: { value: true },
          _count: { value: true },
          _max: { value: true },
        });

        aggregation = aggregation.map((agg) => ({
          question_id: agg.question_id,
          _avg: agg._avg?.value ? parseFloat(agg._avg.value) : null,
          _count: { value: agg._count?.value || 0 },
          _max: agg._max?.value ? parseFloat(agg._max.value) : null,
        }));
      } catch (aggError) {
        console.error(`Error aggregating answers for template ${id}:`, aggError.message);
        aggregation = []; // Fallback to empty array if aggregation fails
      }
    }

    const response = {
      ...template,
      user: creator,
      tags: (template.tags || []).map((tt) => tt.tag),
      description: template.description || '', // Return plain text
      aggregation,
      createdAt: template.createdAt,
    };

    console.log(`Template ID ${id} fetched successfully for user ${req.user.id}`);
    res.json(response);
  } catch (error) {
    console.error(`Error fetching template ID ${id}:`, error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to fetch template', details: error.message });
  }
});

// POST /templates - Create a new template
router.post('/', authenticate, async (req, res) => {
  const { title, description, fields, topic, image_url, is_public, tags, access } = req.body;

  // Input validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    console.log('Title is required but missing');
    return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
  }
  if (description && typeof description !== 'string') {
    console.log('Invalid description:', description);
    return res.status(400).json({ error: 'Description must be a string' });
  }
  if (!topic || !validTopics.includes(topic)) {
    console.log('Invalid or missing topic:', topic);
    return res.status(400).json({ error: `Topic is required and must be one of: ${validTopics.join(', ')}` });
  }
  if (image_url && typeof image_url !== 'string') {
    console.log('Invalid image_url:', image_url);
    return res.status(400).json({ error: 'Image URL must be a string' });
  }
  if (typeof is_public !== 'boolean') {
    console.log('Invalid or missing is_public:', is_public);
    return res.status(400).json({ error: 'is_public must be a boolean' });
  }
  if (tags && (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string'))) {
    console.log('Invalid tags:', tags);
    return res.status(400).json({ error: 'Tags must be an array of strings' });
  }
  if (access && (!Array.isArray(access) || access.some((user_id) => typeof user_id !== 'number'))) {
    console.log('Invalid access:', access);
    return res.status(400).json({ error: 'Access must be an array of user IDs (numbers)' });
  }
  if (
    fields &&
    (!Array.isArray(fields) ||
      fields.some(
        (field) =>
          !field.type ||
          !field.label ||
          !validQuestionTypes.includes(field.type) ||
          (field.type.startsWith('fixed_') && !['fixed_user', 'fixed_date'].includes(field.type))
      ))
  ) {
    console.log('Invalid fields:', fields);
    return res.status(400).json({ error: 'Fields must be an array of objects with valid type and label, and type cannot be a fixed type unless explicitly allowed' });
  }
  if (fields && fields.some((field) => typeof field.required !== 'boolean')) {
    console.log('Invalid required field in fields:', fields);
    return res.status(400).json({ error: 'Each field must have a required property (boolean)' });
  }

  try {
    console.log('Received POST /api/templates request with body:', req.body);

    const questions = fields?.map((field, index) => ({
      type: field.type,
      title: field.label,
      description: field.label,
      order: index,
      is_shown_in_table: true,
      fixed: false,
      required: field.required || false,
    })) || [];

    const template = await prisma.template.create({
      data: {
        title: title.trim(),
        description: description || '',
        topic: topic,
        image_url: image_url || null,
        is_public: is_public,
        created_by: req.user.id,
        createdAt: new Date(),
        questions: {
          create: questions, // Removed fixed_user and fixed_date questions
        },
        tags: tags
          ? {
              connectOrCreate: tags.map((tag) => ({
                where: { name: tag },
                create: { name: tag },
              })),
            }
          : undefined,
        access: access
          ? {
              create: access.map((user_id) => ({ user_id })),
            }
          : undefined,
      },
      include: {
        questions: true,
        tags: { include: { tag: true } },
        access: true,
        creator: { select: { name: true } },
      },
    });

    console.log(`Template created successfully with ID ${template.id}`);
    res.status(201).json({
      ...template,
      user: template.creator,
      tags: template.tags.map((tt) => tt.tag),
      description: template.description || '', // Return plain text
      createdAt: template.createdAt,
    });
  } catch (error) {
    console.error('Create template error:', error.message);
    console.error('Stack trace:', error.stack);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid user ID in access list' });
    }
    res.status(500).json({ error: 'Failed to create template', details: error.message });
  }
});

// PUT /templates/:id - Update a template
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { title, description, topic, image_url, is_public, tags, access } = req.body;

  if (!/^\d+$/.test(id)) {
    console.log('Invalid template ID:', id);
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  // Input validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    console.log('Title is required but missing');
    return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
  }
  if (description && typeof description !== 'string') {
    console.log('Invalid description:', description);
    return res.status(400).json({ error: 'Description must be a string' });
  }
  if (!topic || !validTopics.includes(topic)) {
    console.log('Invalid or missing topic:', topic);
    return res.status(400).json({ error: `Topic is required and must be one of: ${validTopics.join(', ')}` });
  }
  if (image_url && typeof image_url !== 'string') {
    console.log('Invalid image_url:', image_url);
    return res.status(400).json({ error: 'Image URL must be a string' });
  }
  if (typeof is_public !== 'boolean') {
    console.log('Invalid or missing is_public:', is_public);
    return res.status(400).json({ error: 'is_public must be a boolean' });
  }
  if (tags && (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string'))) {
    console.log('Invalid tags:', tags);
    return res.status(400).json({ error: 'Tags must be an array of strings' });
  }
  if (access && (!Array.isArray(access) || access.some((user_id) => typeof user_id !== 'number'))) {
    console.log('Invalid access:', access);
    return res.status(400).json({ error: 'Access must be an array of user IDs (numbers)' });
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id: parseInt(id) },
      include: { creator: true, access: true },
    });

    if (!template) {
      console.log(`Template ID ${id} not found`);
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.created_by !== req.user.id && !req.user.is_admin) {
      console.log(`User ${req.user.id} is not authorized to update template ID ${id}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedTemplate = await prisma.template.update({
      where: { id: parseInt(id) },
      data: {
        title: title.trim(),
        description: description || '',
        topic: topic,
        image_url: image_url || null,
        is_public: is_public,
        updatedAt: new Date(),
        tags: tags
          ? {
              deleteMany: {},
              connectOrCreate: tags.map((tag) => ({
                where: { name: tag },
                create: { name: tag },
              })),
            }
          : undefined,
        access: access
          ? {
              deleteMany: {},
              create: access.map((user_id) => ({ user_id })),
            }
          : undefined,
      },
      include: {
        questions: true,
        tags: { include: { tag: true } },
        access: { include: { user: { select: { email: true, name: true } } } },
        creator: { select: { name: true } },
      },
    });

    console.log(`Template ID ${id} updated successfully by user ${req.user.id}`);
    res.json({
      ...updatedTemplate,
      user: updatedTemplate.creator,
      tags: updatedTemplate.tags.map((tt) => tt.tag),
      description: updatedTemplate.description || '', // Return plain text
      createdAt: updatedTemplate.createdAt,
    });
  } catch (error) {
    console.error(`Update template error for ID ${id}:`, error.message);
    console.error('Stack trace:', error.stack);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid user ID or tag reference' });
    }
    res.status(500).json({ error: 'Failed to update template', details: error.message });
  }
});

// DELETE /templates/:id - Delete a template
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    console.log('Invalid template ID:', id);
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id: parseInt(id) },
      include: { creator: true },
    });

    if (!template) {
      console.log(`Template ID ${id} not found`);
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.created_by !== req.user.id && !req.user.is_admin) {
      console.log(`User ${req.user.id} is not authorized to delete template ID ${id}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { template_id: parseInt(id) } }),
      prisma.form.deleteMany({ where: { template_id: parseInt(id) } }),
      prisma.question.deleteMany({ where: { template_id: parseInt(id) } }),
      prisma.template.delete({ where: { id: parseInt(id) } }),
    ]);

    console.log(`Template ID ${id} deleted successfully by user ${req.user.id}`);
    res.status(204).send();
  } catch (error) {
    console.error(`Delete template error for ID ${id}:`, error.message);
    console.error('Stack trace:', error.stack);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.status(500).json({ error: 'Failed to delete template', details: error.message });
  }
});

// POST /templates/:id/questions - Add a question to a template
router.post('/:id/questions', authenticate, async (req, res) => {
  const { id } = req.params;
  const { type, title, description, order, is_shown_in_table } = req.body;

  if (!/^\d+$/.test(id)) {
    console.log('Invalid template ID:', id);
    return res.status(400).json({ error: 'Invalid template ID' });
  }
  if (!type || !validQuestionTypes.includes(type)) {
    console.log('Invalid question type:', type);
    return res.status(400).json({ error: `Type must be one of: ${validQuestionTypes.join(', ')}` });
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    console.log('Title is required but missing');
    return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
  }
  if (description && typeof description !== 'string') {
    console.log('Invalid description:', description);
    return res.status(400).json({ error: 'Description must be a string' });
  }
  if (typeof order !== 'number' || order < 0) {
    console.log('Invalid order:', order);
    return res.status(400).json({ error: 'Order must be a non-negative number' });
  }
  if (typeof is_shown_in_table !== 'boolean') {
    console.log('Invalid is_shown_in_table:', is_shown_in_table);
    return res.status(400).json({ error: 'is_shown_in_table must be a boolean' });
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id: parseInt(id) },
      include: { creator: true },
    });

    if (!template) {
      console.log(`Template ID ${id} not found`);
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.created_by !== req.user.id && !req.user.is_admin) {
      console.log(`User ${req.user.id} is not authorized to add question to template ID ${id}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    const question = await prisma.question.create({
      data: {
        type,
        title: title.trim(),
        description: description || '',
        order,
        is_shown_in_table,
        template_id: parseInt(id),
        fixed: false,
      },
    });

    console.log(`Question added successfully to template ID ${id} by user ${req.user.id}`);
    res.status(201).json(question);
  } catch (error) {
    console.error(`Add question error for template ID ${id}:`, error.message);
    console.error('Stack trace:', error.stack);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid template ID' });
    }
    res.status(500).json({ error: 'Failed to add question', details: error.message });
  }
});

// DELETE /templates/:id/questions/:questionId - Delete a question
router.delete('/:id/questions/:questionId', authenticate, async (req, res) => {
  const { id, questionId } = req.params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(questionId)) {
    console.log('Invalid template ID or question ID:', { id, questionId });
    return res.status(400).json({ error: 'Invalid template ID or question ID' });
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id: parseInt(id) },
      include: { creator: true, questions: true },
    });

    if (!template) {
      console.log(`Template ID ${id} not found`);
      return res.status(404).json({ error: 'Template not found' });
    }

    const question = template.questions.find(q => q.id === parseInt(questionId));
    if (!question) {
      console.log(`Question ID ${questionId} not found in template ID ${id}`);
      return res.status(404).json({ error: 'Question not found' });
    }

    if (template.created_by !== req.user.id && !req.user.is_admin) {
      console.log(`User ${req.user.id} is not authorized to delete question ID ${questionId} in template ID ${id}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Prevent deletion of fixed questions
    if (question.fixed) {
      console.log(`Cannot delete fixed question ID ${questionId} in template ID ${id}`);
      return res.status(400).json({ error: 'Cannot delete fixed question' });
    }

    await prisma.question.delete({
      where: { id: parseInt(questionId) },
    });

    console.log(`Question ID ${questionId} deleted successfully from template ID ${id} by user ${req.user.id}`);
    res.status(204).send();
  } catch (error) {
    console.error(`Delete question error for question ID ${questionId} in template ID ${id}:`, error.message);
    console.error('Stack trace:', error.stack);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.status(500).json({ error: 'Failed to delete question', details: error.message });
  }
});

// PUT /templates/:id/questions/:questionId - Update a question
router.put('/:id/questions/:questionId', authenticate, async (req, res) => {
  const { id, questionId } = req.params;
  const { title, type } = req.body;

  if (!/^\d+$/.test(id) || !/^\d+$/.test(questionId)) {
    console.log('Invalid template ID or question ID:', { id, questionId });
    return res.status(400).json({ error: 'Invalid template ID or question ID' });
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    console.log('Title is required but missing');
    return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
  }
  if (!type || !validQuestionTypes.includes(type)) {
    console.log('Invalid question type:', type);
    return res.status(400).json({ error: `Type must be one of: ${validQuestionTypes.join(', ')}` });
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id: parseInt(id) },
      include: { creator: true, questions: true },
    });

    if (!template) {
      console.log(`Template ID ${id} not found`);
      return res.status(404).json({ error: 'Template not found' });
    }

    const question = template.questions.find(q => q.id === parseInt(questionId));
    if (!question) {
      console.log(`Question ID ${questionId} not found in template ID ${id}`);
      return res.status(404).json({ error: 'Question not found' });
    }

    if (template.created_by !== req.user.id && !req.user.is_admin) {
      console.log(`User ${req.user.id} is not authorized to update question ID ${questionId} in template ID ${id}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Prevent updating fixed questions
    if (question.fixed) {
      console.log(`Cannot update fixed question ID ${questionId} in template ID ${id}`);
      return res.status(400).json({ error: 'Cannot update fixed question' });
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: parseInt(questionId) },
      data: {
        title: title.trim(),
        type,
        updatedAt: new Date(),
      },
    });

    console.log(`Question ID ${questionId} updated successfully in template ID ${id} by user ${req.user.id}`);
    res.json(updatedQuestion);
  } catch (error) {
    console.error(`Update question error for question ID ${questionId} in template ID ${id}:`, error.message);
    console.error('Stack trace:', error.stack);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.status(500).json({ error: 'Failed to update question', details: error.message });
  }
});

// POST /templates/:id/form - Submit answers for a template
router.post('/:id/form', authenticate, async (req, res) => {
  const { id } = req.params;
  const { answers } = req.body;

  if (!/^\d+$/.test(id)) {
    console.log('Invalid template ID:', id);
    return res.status(400).json({ error: 'Invalid template ID' });
  }
  if (!Array.isArray(answers) || answers.some((a) => !a.question_id || typeof a.value !== 'string')) {
    console.log('Invalid answers format:', answers);
    return res.status(400).json({ error: 'Answers must be an array of objects with question_id and value' });
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id: parseInt(id) },
      include: { questions: true, creator: true, access: true },
    });

    if (!template) {
      console.log(`Template ID ${id} not found`);
      return res.status(404).json({ error: 'Template not found' });
    }

    const hasAccess =
      template.is_public ||
      template.created_by === req.user.id ||
      template.access.some((a) => a.user_id === req.user.id) ||
      req.user.is_admin;

    if (!hasAccess) {
      console.log(`User ${req.user.id} does not have access to submit form for template ID ${id}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    const form = await prisma.form.create({
      data: {
        user_id: req.user.id,
        template_id: parseInt(id),
        createdAt: new Date(),
        answers: {
          create: answers.map((a) => ({
            question_id: parseInt(a.question_id),
            value: a.value,
          })),
        },
      },
      include: { answers: { include: { question: true } } },
    });

    console.log(`Form submitted successfully for template ID ${id} by user ${req.user.id}`);
    res.status(201).json(form);
  } catch (error) {
    console.error(`Submit form error for template ID ${id}:`, error.message);
    console.error('Stack trace:', error.stack);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid question ID in answers' });
    }
    res.status(500).json({ error: 'Failed to submit form', details: error.message });
  }
});

// GET /forms - Fetch forms for the authenticated user
router.get('/forms', authenticate, async (req, res) => {
  try {
    console.log('Fetching forms for user:', req.user.id);
    const forms = await prisma.form.findMany({
      where: {
        user_id: req.user.id,
      },
      include: {
        template: {
          select: {
            id: true,
            title: true,
          },
        },
        answers: { include: { question: true } },
      },
    });

    const formattedForms = forms.map((form) => ({
      ...form,
      createdAt: form.createdAt,
    }));

    console.log('Forms fetched successfully:', formattedForms.length);
    res.json(formattedForms);
  } catch (error) {
    console.error('Get forms error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to fetch forms', details: error.message });
  }
});

// PUT /forms/:formId - Update a form submission
router.put('/forms/:formId', authenticate, async (req, res) => {
  const { formId } = req.params;
  const { answers } = req.body;

  if (!/^\d+$/.test(formId)) {
    console.log('Invalid form ID:', formId);
    return res.status(400).json({ error: 'Invalid form ID' });
  }

  // Input validation
  if (!Array.isArray(answers) || answers.length === 0) {
    console.log('Invalid answers array:', answers);
    return res.status(400).json({ error: 'Answers must be a non-empty array' });
  }
  for (const answer of answers) {
    if (!answer.question_id || typeof answer.question_id !== 'number' || answer.value === undefined) {
      console.log('Invalid answer:', answer);
      return res.status(400).json({ error: 'Each answer must have a question_id (number) and value' });
    }
  }

  try {
    console.log(`Received PUT /api/forms/${formId} request with body:`, req.body);
    const form = await prisma.form.findUnique({
      where: { id: parseInt(formId) },
      include: { template: { include: { questions: true } } },
    });

    if (!form) {
      console.log(`Form ID ${formId} not found`);
      return res.status(404).json({ error: 'Form not found' });
    }

    if (
      form.user_id !== req.user.id &&
      form.template.created_by !== req.user.id &&
      !req.user.is_admin
    ) {
      console.log(`User ${req.user.id} does not have permission to update form ${formId}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.answer.deleteMany({ where: { form_id: parseInt(formId) } });

    const updatedForm = await prisma.form.update({
      where: { id: parseInt(formId) },
      data: {
        answers: {
          create: answers.map((answer) => ({
            question_id: answer.question_id,
            value: answer.value.toString(),
          })), // Removed fixed_user and fixed_date answers
        },
      },
      include: { answers: { include: { question: true } }, user: true },
    });

    console.log(`Form ${formId} updated successfully`);
    res.json(updatedForm);
  } catch (error) {
    console.error('Update form error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to update form', details: error.message });
  }
});

// DELETE /forms/:formId - Delete a form submission
router.delete('/forms/:formId', authenticate, async (req, res) => {
  const { formId } = req.params;

  if (!/^\d+$/.test(formId)) {
    console.log('Invalid form ID:', formId);
    return res.status(400).json({ error: 'Invalid form ID' });
  }

  try {
    console.log(`Received DELETE /api/forms/${formId} request`);
    const form = await prisma.form.findUnique({
      where: { id: parseInt(formId) },
      include: { template: true },
    });

    if (!form) {
      console.log(`Form ID ${formId} not found`);
      return res.status(404).json({ error: 'Form not found' });
    }

    if (
      form.user_id !== req.user.id &&
      form.template.created_by !== req.user.id &&
      !req.user.is_admin
    ) {
      console.log(`User ${req.user.id} does not have permission to delete form ${formId}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.form.delete({ where: { id: parseInt(formId) } });

    console.log(`Form ${formId} deleted successfully`);
    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Delete form error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to delete form', details: error.message });
  }
});

// POST /templates/:id/comments - Add a comment to a template
router.post('/:id/comments', authenticate, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!/^\d+$/.test(id)) {
    console.log('Invalid template ID:', id);
    return res.status(400).json({ error: 'Invalid template ID' });
  }
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    console.log('Content is required but missing');
    return res.status(400).json({ error: 'Content is required and must be a non-empty string' });
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id: parseInt(id) },
      include: { creator: true, access: true },
    });

    if (!template) {
      console.log(`Template ID ${id} not found`);
      return res.status(404).json({ error: 'Template not found' });
    }

    const hasAccess =
      template.is_public ||
      template.created_by === req.user.id ||
      template.access.some((a) => a.user_id === req.user.id) ||
      req.user.is_admin;

    if (!hasAccess) {
      console.log(`User ${req.user.id} does not have access to comment on template ID ${id}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Prevent creator from adding comments
    if (template.created_by === req.user.id) {
      console.log(`Creator ${req.user.id} cannot add comments to template ID ${id}`);
      return res.status(403).json({ error: 'Creator cannot add comments' });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        user_id: req.user.id,
        template_id: parseInt(id),
        createdAt: new Date(),
      },
      include: { user: { select: { name: true } } },
    });

    console.log(`Comment added successfully to template ID ${id} by user ${req.user.id}`);
    res.status(201).json(comment);
  } catch (error) {
    console.error(`Add comment error for template ID ${id}:`, error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to add comment', details: error.message });
  }
});

// PUT /comments/:commentId - Update a comment
router.put('/comments/:commentId', authenticate, async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!/^\d+$/.test(commentId)) {
    console.log('Invalid comment ID:', commentId);
    return res.status(400).json({ error: 'Invalid comment ID' });
  }

  // Input validation
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    console.log('Invalid comment content:', content);
    return res.status(400).json({ error: 'Comment content is required and must be a non-empty string' });
  }

  try {
    console.log(`Received PUT /api/comments/${commentId} request with body:`, req.body);
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
    });

    if (!comment) {
      console.log(`Comment ID ${commentId} not found`);
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user_id !== req.user.id) {
      console.log(`User ${req.user.id} does not have permission to update comment ${commentId}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: parseInt(commentId) },
      data: { content: content.trim() },
      include: { user: { select: { name: true } } },
    });

    console.log(`Comment ${commentId} updated successfully`);
    res.json(updatedComment);
  } catch (error) {
    console.error('Update comment error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to update comment', details: error.message });
  }
});

// DELETE /comments/:commentId - Delete a comment
router.delete('/comments/:commentId', authenticate, async (req, res) => {
  const { commentId } = req.params;

  if (!/^\d+$/.test(commentId)) {
    console.log('Invalid comment ID:', commentId);
    return res.status(400).json({ error: 'Invalid comment ID' });
  }

  try {
    console.log(`Received DELETE /api/comments/${commentId} request`);
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
    });

    if (!comment) {
      console.log(`Comment ID ${commentId} not found`);
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user_id !== req.user.id) {
      console.log(`User ${req.user.id} does not have permission to delete comment ${commentId}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.comment.delete({ where: { id: parseInt(commentId) } });

    console.log(`Comment ${commentId} deleted successfully`);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to delete comment', details: error.message });
  }
});

// POST /templates/:id/likes - Add a like to a template
router.post('/:id/likes', authenticate, async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    console.log('Invalid template ID:', id);
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  try {
    console.log(`Received POST /api/templates/${id}/likes request`);
    const template = await prisma.template.findUnique({
      where: { id: parseInt(id) },
    });

    if (!template) {
      console.log(`Template ID ${id} not found`);
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.created_by === req.user.id) {
      console.log(`User ${req.user.id} cannot like their own template ${id}`);
      return res.status(403).json({ error: 'Creators cannot like their own templates' });
    }

    const existingLike = await prisma.like.findUnique({
      where: { template_id_user_id: { template_id: parseInt(id), user_id: req.user.id } },
    });

    if (existingLike) {
      console.log(`User ${req.user.id} has already liked template ${id}`);
      return res.status(400).json({ error: 'Already liked' });
    }

    const like = await prisma.like.create({
      data: { template_id: parseInt(id), user_id: req.user.id },
    });

    console.log(`Like added successfully for template ${id} by user ${req.user.id}`);
    res.json(like);
  } catch (error) {
    console.error('Create like error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to create like', details: error.message });
  }
});

// DELETE /templates/:id/likes - Remove a like from a template
router.delete('/:id/likes', authenticate, async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    console.log('Invalid template ID:', id);
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  try {
    console.log(`Received DELETE /api/templates/${id}/likes request`);
    const like = await prisma.like.findUnique({
      where: { template_id_user_id: { template_id: parseInt(id), user_id: req.user.id } },
    });

    if (!like) {
      console.log(`Like not found for template ${id} and user ${req.user.id}`);
      return res.status(404).json({ error: 'Like not found' });
    }

    await prisma.like.delete({
      where: { template_id_user_id: { template_id: parseInt(id), user_id: req.user.id } },
    });

    console.log(`Like removed successfully for template ${id} by user ${req.user.id}`);
    res.json({ message: 'Like removed successfully' });
  } catch (error) {
    console.error('Delete like error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to delete like', details: error.message });
  }
});

// POST /templates/:id/duplicate - Duplicate a template
router.post('/:id/duplicate', authenticate, async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    console.log('Invalid template ID:', id);
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  try {
    console.log(`Received POST /api/templates/${id}/duplicate request`);
    const original = await prisma.template.findUnique({
      where: { id: parseInt(id) },
      include: { questions: true, tags: { include: { tag: true } } },
    });

    if (!original) {
      console.log(`Template ID ${id} not found`);
      return res.status(404).json({ error: 'Template not found' });
    }

    if (original.created_by !== req.user.id && !req.user.is_admin) {
      console.log(`User ${req.user.id} does not have permission to duplicate template ${id}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    const duplicate = await prisma.template.create({
      data: {
        title: `${original.title} (Copy)`,
        description: original.description,
        topic: original.topic,
        image_url: original.image_url,
        is_public: original.is_public,
        created_by: req.user.id,
        createdAt: new Date(),
        questions: {
          create: original.questions.map((q) => ({
            type: q.type,
            title: q.title,
            description: q.description,
            is_shown_in_table: q.is_shown_in_table,
            order: q.order,
            fixed: q.fixed,
            required: q.required,
          })),
        },
        tags: { connect: original.tags.map((tt) => ({ id: tt.tag.id })) },
      },
      include: { questions: true, tags: { include: { tag: true } }, creator: { select: { name: true } } },
    });

    console.log(`Template ${id} duplicated successfully as template ${duplicate.id}`);
    res.json({
      ...duplicate,
      user: duplicate.creator || { name: 'Unknown User' },
      tags: duplicate.tags.map((tt) => tt.tag),
      description: duplicate.description || '', // Return plain text
      createdAt: duplicate.createdAt,
    });
  } catch (error) {
    console.error('Duplicate template error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to duplicate template', details: error.message });
  }
});

// POST /templates/:id/share - Share a template with a user
router.post('/:id/share', authenticate, async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;

  if (!/^\d+$/.test(id)) {
    console.log('Invalid template ID:', id);
    return res.status(400).json({ error: 'Invalid template ID' });
  }
  if (!email || !isValidEmail(email)) {
    console.log('Invalid email:', email);
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id: parseInt(id) },
      include: { creator: true },
    });

    if (!template) {
      console.log(`Template ID ${id} not found`);
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.created_by !== req.user.id && !req.user.is_admin) {
      console.log(`User ${req.user.id} is not authorized to share template ID ${id}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`User with email ${email} not found`);
      return res.status(404).json({ error: 'User not found' });
    }

    const existingAccess = await prisma.templateAccess.findUnique({
      where: {
        template_id_user_id: {
          template_id: parseInt(id),
          user_id: user.id,
        },
      },
    });

    if (existingAccess) {
      console.log(`User ${email} already has access to template ID ${id}`);
      return res.status(400).json({ error: 'User already has access' });
    }

    await prisma.templateAccess.create({
      data: {
        template_id: parseInt(id),
        user_id: user.id,
      },
    });

    console.log(`Template ID ${id} shared successfully with user ${email} by user ${req.user.id}`);
    res.status(201).json({ message: 'Template shared successfully' });
  } catch (error) {
    console.error(`Share template error for template ID ${id}:`, error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to share template', details: error.message });
  }
});

// PUT /templates/:id/questions/order - Update question order
router.put('/:id/questions/order', authenticate, async (req, res) => {
  const { id } = req.params;
  const { orders } = req.body;

  if (!/^\d+$/.test(id)) {
    console.log('Invalid template ID:', id);
    return res.status(400).json({ error: 'Invalid template ID' });
  }
  if (!Array.isArray(orders) || orders.some((o) => !o.id || typeof o.order !== 'number' || o.order < 0)) {
    console.log('Invalid orders format:', orders);
    return res.status(400).json({ error: 'Orders must be an array of objects with id and order' });
  }

  try {
    const template = await prisma.template.findUnique({
      where: { id: parseInt(id) },
      include: { creator: true, questions: true },
    });

    if (!template) {
      console.log(`Template ID ${id} not found`);
      return res.status(404).json({ error: 'Template not found' });
    }

    if (template.created_by !== req.user.id && !req.user.is_admin) {
      console.log(`User ${req.user.id} is not authorized to update order for template ID ${id}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.$transaction(
      orders.map((o) =>
        prisma.question.update({
          where: { id: o.id },
          data: { order: o.order },
        })
      )
    );

    console.log(`Question order updated successfully for template ID ${id} by user ${req.user.id}`);
    res.json({ message: 'Question order updated successfully' });
  } catch (error) {
    console.error(`Update question order error for template ID ${id}:`, error.message);
    console.error('Stack trace:', error.stack);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'One or more questions not found' });
    }
    res.status(500).json({ error: 'Failed to update question order', details: error.message });
  }
});

module.exports = router;
// const express = require('express');
// const { PrismaClient } = require('@prisma/client');
// const authenticate = require('../middleware/authenticate');
// const jwt = require('jsonwebtoken');

// const router = express.Router();
// const prisma = new PrismaClient();

// // Utility function to validate email format
// const isValidEmail = (email) => {
//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   return emailRegex.test(email);
// };

// // Utility function to validate question type
// const validQuestionTypes = [
//   'single_line',
//   'multi_line',
//   'positive_integer',
//   'checkbox',
//   'fixed_user',
//   'fixed_date',
// ];

// // Utility function to validate topic
// const validTopics = ['Education', 'Quiz', 'Other'];

// // GET /templates - Fetch all templates (public or user-specific)
// router.get('/', async (req, res) => {
//   console.log('Received GET /api/templates request');
//   try {
//     let user = null;
//     if (req.headers.authorization) {
//       try {
//         const token = req.headers.authorization.replace('Bearer ', '');
//         user = await jwt.verify(token, process.env.JWT_SECRET);
//         console.log('Authenticated user for GET /api/templates:', user.id);
//       } catch (error) {
//         console.log('No valid token provided for GET /api/templates, proceeding as unauthenticated:', error.message);
//       }
//     } else {
//       console.log('No Authorization header provided for GET /api/templates, proceeding as unauthenticated');
//     }

//     const templates = await prisma.template.findMany({
//       where: user
//         ? {
//             OR: [
//               { created_by: user.id },
//               { access: { some: { user_id: user.id } } },
//               { is_public: true },
//             ],
//           }
//         : { is_public: true },
//       include: {
//         creator: { select: { name: true } },
//         tags: { include: { tag: true } },
//         forms: true, // Include forms to calculate top templates
//       },
//     });

//     const processedTemplates = templates.map((t) => ({
//       ...t,
//       user: t.creator || { name: 'Unknown User' }, // Fallback for creator
//       tags: t.tags.map((tt) => tt.tag),
//       description: t.description || '', // Return plain text
//       createdAt: t.createdAt,
//     }));

//     console.log('Templates fetched successfully:', processedTemplates.length);
//     res.json(processedTemplates);
//   } catch (error) {
//     console.error('Get templates error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to fetch templates', details: error.message });
//   }
// });

// // GET /templates/shared - Fetch templates shared with the user
// router.get('/shared', authenticate, async (req, res) => {
//   try {
//     const userId = parseInt(req.query.user_id, 10);
//     if (isNaN(userId)) {
//       console.log('Invalid user ID:', req.query.user_id);
//       return res.status(400).json({ error: 'Invalid user ID' });
//     }

//     console.log(`Fetching shared templates for user_id: ${userId}`);
//     const templates = await prisma.template.findMany({
//       where: {
//         access: { some: { user_id: userId } },
//         created_by: { not: userId }, // Exclude templates created by the user
//       },
//       include: {
//         creator: { select: { name: true } },
//         tags: { include: { tag: true } },
//         forms: true,
//       },
//     });

//     if (!templates || templates.length === 0) {
//       console.log(`No shared templates found for user_id: ${userId}`);
//       return res.status(404).json({ error: 'No shared templates found' });
//     }

//     const processedTemplates = templates.map((t) => ({
//       ...t,
//       user: t.creator || { name: 'Unknown User' },
//       tags: t.tags.map((tt) => tt.tag),
//       description: t.description || '', // Return plain text
//       createdAt: t.createdAt,
//     }));

//     console.log(`Shared templates fetched successfully for user_id: ${userId}:`, processedTemplates.length);
//     res.json(processedTemplates);
//   } catch (error) {
//     console.error('Get shared templates error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to fetch shared templates', details: error.message });
//   }
// });

// // GET /templates/:id - Fetch a specific template
// router.get('/:id', authenticate, async (req, res) => {
//   const { id } = req.params;
//   if (!/^\d+$/.test(id)) {
//     console.log('Invalid template ID:', id);
//     return res.status(400).json({ error: 'Invalid template ID' });
//   }

//   try {
//     console.log(`Fetching template ID ${id} for user:`, req.user.id);
//     const template = await prisma.template.findUnique({
//       where: { id: parseInt(id) },
//       include: {
//         questions: true,
//         forms: {
//           include: {
//             answers: { include: { question: true } },
//             user: { select: { name: true } },
//           },
//           where: {
//             OR: [
//               { user_id: req.user.id },
//               { template: { created_by: req.user.id } },
//               { template: { access: { some: { user_id: req.user.id } } } },
//             ],
//           },
//         },
//         comments: { include: { user: { select: { name: true } } } },
//         likes: true,
//         tags: { include: { tag: true } },
//         access: { include: { user: { select: { email: true, name: true } } } },
//         creator: { select: { name: true, is_admin: true } },
//       },
//     });

//     if (!template) {
//       console.log(`Template ID ${id} not found`);
//       return res.status(404).json({ error: 'Template not found' });
//     }

//     // Fallback for creator if user is missing
//     const creator = template.creator || { name: 'Unknown User', is_admin: false };

//     const hasAccess =
//       template.is_public ||
//       template.created_by === req.user.id ||
//       template.access.some((a) => a.user_id === req.user.id) ||
//       req.user.is_admin;

//     console.log(`Access check for user ${req.user.id} on template ${id}:`, {
//       created_by: template.created_by,
//       is_public: template.is_public,
//       access: template.access,
//       is_admin: req.user.is_admin,
//       hasAccess,
//     });

//     if (!hasAccess) {
//       console.log(`User ${req.user.id} does not have access to template ID ${id}`);
//       return res.status(403).json({ error: 'Forbidden' });
//     }

//     const numericQuestions = (template.questions || [])
//       .filter((q) => q.type === 'positive_integer')
//       .map((q) => q.id);

//     let aggregation = [];
//     if (numericQuestions.length > 0) {
//       try {
//         aggregation = await prisma.answer.groupBy({
//           by: ['question_id'],
//           where: {
//             form: { template_id: parseInt(id) },
//             question_id: { in: numericQuestions },
//           },
//           _avg: { value: true },
//           _count: { value: true },
//           _max: { value: true },
//         });

//         aggregation = aggregation.map((agg) => ({
//           question_id: agg.question_id,
//           _avg: agg._avg?.value ? parseFloat(agg._avg.value) : null,
//           _count: { value: agg._count?.value || 0 },
//           _max: agg._max?.value ? parseFloat(agg._max.value) : null,
//         }));
//       } catch (aggError) {
//         console.error(`Error aggregating answers for template ${id}:`, aggError.message);
//         aggregation = []; // Fallback to empty array if aggregation fails
//       }
//     }

//     const response = {
//       ...template,
//       user: creator,
//       tags: (template.tags || []).map((tt) => tt.tag),
//       description: template.description || '', // Return plain text
//       aggregation,
//       createdAt: template.createdAt,
//     };

//     console.log(`Template ID ${id} fetched successfully for user ${req.user.id}`);
//     res.json(response);
//   } catch (error) {
//     console.error(`Error fetching template ID ${id}:`, error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to fetch template', details: error.message });
//   }
// });

// // POST /templates - Create a new template
// router.post('/', authenticate, async (req, res) => {
//   const { title, description, fields, topic, image_url, is_public, tags, access } = req.body;

//   // Input validation
//   if (!title || typeof title !== 'string' || title.trim().length === 0) {
//     console.log('Title is required but missing');
//     return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
//   }
//   if (description && typeof description !== 'string') {
//     console.log('Invalid description:', description);
//     return res.status(400).json({ error: 'Description must be a string' });
//   }
//   if (!topic || !validTopics.includes(topic)) {
//     console.log('Invalid or missing topic:', topic);
//     return res.status(400).json({ error: `Topic is required and must be one of: ${validTopics.join(', ')}` });
//   }
//   if (image_url && typeof image_url !== 'string') {
//     console.log('Invalid image_url:', image_url);
//     return res.status(400).json({ error: 'Image URL must be a string' });
//   }
//   if (typeof is_public !== 'boolean') {
//     console.log('Invalid or missing is_public:', is_public);
//     return res.status(400).json({ error: 'is_public must be a boolean' });
//   }
//   if (tags && (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string'))) {
//     console.log('Invalid tags:', tags);
//     return res.status(400).json({ error: 'Tags must be an array of strings' });
//   }
//   if (access && (!Array.isArray(access) || access.some((user_id) => typeof user_id !== 'number'))) {
//     console.log('Invalid access:', access);
//     return res.status(400).json({ error: 'Access must be an array of user IDs (numbers)' });
//   }
//   if (
//     fields &&
//     (!Array.isArray(fields) ||
//       fields.some(
//         (field) =>
//           !field.type ||
//           !field.label ||
//           !validQuestionTypes.includes(field.type) ||
//           (field.type.startsWith('fixed_') && !['fixed_user', 'fixed_date'].includes(field.type))
//       ))
//   ) {
//     console.log('Invalid fields:', fields);
//     return res.status(400).json({ error: 'Fields must be an array of objects with valid type and label, and type cannot be a fixed type unless explicitly allowed' });
//   }
//   if (fields && fields.some((field) => typeof field.required !== 'boolean')) {
//     console.log('Invalid required field in fields:', fields);
//     return res.status(400).json({ error: 'Each field must have a required property (boolean)' });
//   }

//   try {
//     console.log('Received POST /api/templates request with body:', req.body);

//     const questions = fields?.map((field, index) => ({
//       type: field.type,
//       title: field.label,
//       description: field.label,
//       order: index,
//       is_shown_in_table: true,
//       fixed: false,
//       required: field.required || false,
//     })) || [];

//     const template = await prisma.template.create({
//       data: {
//         title: title.trim(),
//         description: description || '',
//         topic: topic,
//         image_url: image_url || null,
//         is_public: is_public,
//         created_by: req.user.id,
//         createdAt: new Date(),
//         questions: {
//           create: questions, // Removed fixed_user and fixed_date questions
//         },
//         tags: tags
//           ? {
//               connectOrCreate: tags.map((tag) => ({
//                 where: { name: tag },
//                 create: { name: tag },
//               })),
//             }
//           : undefined,
//         access: access
//           ? {
//               create: access.map((user_id) => ({ user_id })),
//             }
//           : undefined,
//       },
//       include: {
//         questions: true,
//         tags: { include: { tag: true } },
//         access: true,
//         creator: { select: { name: true } },
//       },
//     });

//     console.log(`Template created successfully with ID ${template.id}`);
//     res.status(201).json({
//       ...template,
//       user: template.creator,
//       tags: template.tags.map((tt) => tt.tag),
//       description: template.description || '', // Return plain text
//       createdAt: template.createdAt,
//     });
//   } catch (error) {
//     console.error('Create template error:', error.message);
//     console.error('Stack trace:', error.stack);
//     if (error.code === 'P2003') {
//       return res.status(400).json({ error: 'Invalid user ID in access list' });
//     }
//     res.status(500).json({ error: 'Failed to create template', details: error.message });
//   }
// });

// // PUT /templates/:id - Update a template
// router.put('/:id', authenticate, async (req, res) => {
//   const { id } = req.params;
//   const { title, description, topic, image_url, is_public, tags, access } = req.body;

//   if (!/^\d+$/.test(id)) {
//     console.log('Invalid template ID:', id);
//     return res.status(400).json({ error: 'Invalid template ID' });
//   }

//   if (!req.user) {
//     console.log('User not authenticated for PUT /api/templates');
//     return res.status(401).json({ error: 'Authentication required' });
//   }
//   if (!title || typeof title !== 'string' || title.trim().length === 0) {
//     console.log('Invalid title:', title);
//     return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
//   }
//   if (description && typeof description !== 'string') {
//     console.log('Invalid description:', description);
//     return res.status(400).json({ error: 'Description must be a string' });
//   }
//   if (topic && !validTopics.includes(topic)) {
//     console.log('Invalid topic:', topic);
//     return res.status(400).json({ error: `Invalid topic. Must be one of: ${validTopics.join(', ')}` });
//   }
//   if (image_url && typeof image_url !== 'string') {
//     console.log('Invalid image_url:', image_url);
//     return res.status(400).json({ error: 'Image URL must be a string' });
//   }
//   if (typeof is_public !== 'boolean') {
//     console.log('Invalid is_public:', is_public);
//     return res.status(400).json({ error: 'is_public must be a boolean' });
//   }
//   if (tags && (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string'))) {
//     console.log('Invalid tags:', tags);
//     return res.status(400).json({ error: 'Tags must be an array of strings' });
//   }
//   if (access && (!Array.isArray(access) || access.some((user_id) => typeof user_id !== 'number'))) {
//     console.log('Invalid access:', access);
//     return res.status(400).json({ error: 'Access must be an array of user IDs (numbers)' });
//   }

//   try {
//     console.log(`Received PUT /api/templates/${id} request with body:`, req.body);

//     // Fetch the existing template
//     const template = await prisma.template.findUnique({
//       where: { id: parseInt(id) },
//       include: {
//         access: true,
//         tags: true,
//       },
//     });

//     if (!template) {
//       console.log(`Template ID ${id} not found`);
//       return res.status(404).json({ error: 'Template not found' });
//     }

//     // Check if the user has permission to update
//     if (template.created_by !== req.user.id && !req.user.is_admin) {
//       console.log(`User ${req.user.id} does not have permission to update template ${id}`);
//       return res.status(403).json({ error: 'You do not have permission to update this template' });
//     }

//     // Handle tags: Disconnect existing tags and connect or create new ones
//     const tagOperations = [];
//     if (Array.isArray(tags)) {
//       console.log('Processing tags:', tags);
//       // Disconnect all existing tags
//       await prisma.template.update({
//         where: { id: parseInt(id) },
//         data: {
//           tags: {
//             set: [], // Disconnect all existing tags
//           },
//         },
//       });

//       // Connect or create new tags
//       for (const tagName of tags) {
//         if (tagName && typeof tagName === 'string') {
//           tagOperations.push(
//             prisma.tag.upsert({
//               where: { name: tagName },
//               update: {},
//               create: { name: tagName },
//             })
//           );
//         }
//       }

//       const newTags = await Promise.all(tagOperations);
//       await prisma.template.update({
//         where: { id: parseInt(id) },
//         data: {
//           tags: {
//             connect: newTags.map((tag) => ({ id: tag.id })),
//           },
//         },
//       });
//     }

//     // Handle access: Disconnect existing access and connect new ones
//     if (Array.isArray(access)) {
//       console.log('Processing access:', access);
//       // Disconnect all existing access
//       await prisma.template.update({
//         where: { id: parseInt(id) },
//         data: {
//           access: {
//             deleteMany: {}, // Remove all existing access
//           },
//         },
//       });

//       // Add new access entries
//       const accessOperations = access
//         .filter((userId) => typeof userId === 'number')
//         .map((userId) =>
//           prisma.templateAccess.create({
//             data: {
//               template_id: parseInt(id),
//               user_id: userId,
//             },
//           })
//         );
//       await Promise.all(accessOperations);
//     }

//     // Update the template
//     const updatedTemplate = await prisma.template.update({
//       where: { id: parseInt(id) },
//       data: {
//         title: title.trim(),
//         description: description || '',
//         topic: topic || template.topic,
//         image_url: image_url || template.image_url,
//         is_public: !!is_public,
//       },
//       include: {
//         creator: { select: { name: true } },
//         questions: true,
//         tags: { include: { tag: true } },
//         access: {
//           include: { user: true },
//         },
//         forms: {
//           include: {
//             user: true,
//             answers: {
//               include: { question: true },
//             },
//           },
//         },
//         comments: {
//           include: { user: true },
//         },
//       },
//     });

//     console.log(`Template ${id} updated successfully`);
//     res.json({
//       ...updatedTemplate,
//       user: updatedTemplate.creator || { name: 'Unknown User' },
//       tags: updatedTemplate.tags.map((tt) => tt.tag),
//       description: updatedTemplate.description || '', // Return plain text
//       createdAt: updatedTemplate.createdAt,
//     });
//   } catch (error) {
//     console.error(`Error updating template ${id}:`, error.message);
//     console.error('Stack trace:', error.stack);
//     if (error.code === 'P2003') {
//       return res.status(400).json({ error: 'Invalid user ID in access list' });
//     }
//     res.status(500).json({ error: 'Failed to update template', details: error.message });
//   }
// });

// // DELETE /templates/:id - Delete a template
// router.delete('/:id', authenticate, async (req, res) => {
//   const { id } = req.params;
//   if (!/^\d+$/.test(id)) {
//     console.log('Invalid template ID:', id);
//     return res.status(400).json({ error: 'Invalid template ID' });
//   }

//   try {
//     console.log(`Received DELETE /api/templates/${id} request`);
//     const template = await prisma.template.findUnique({
//       where: { id: parseInt(id) },
//     });

//     if (!template) {
//       console.log(`Template ID ${id} not found`);
//       return res.status(404).json({ error: 'Template not found' });
//     }

//     if (template.created_by !== req.user.id && !req.user.is_admin) {
//       console.log(`User ${req.user.id} does not have permission to delete template ${id}`);
//       return res.status(403).json({ error: 'Forbidden' });
//     }

//     // Delete related TemplateTag entries
//     await prisma.templateTag.deleteMany({ where: { template_id: parseInt(id) } });

//     // Delete the template
//     await prisma.template.delete({
//       where: { id: parseInt(id) },
//     });

//     console.log(`Template ${id} deleted successfully`);
//     res.json({ message: 'Template deleted successfully' });
//   } catch (error) {
//     console.error('Delete template error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to delete template', details: error.message });
//   }
// });

// // POST /templates/:id/questions - Add a question to a template
// router.post('/:id/questions', authenticate, async (req, res) => {
//   const { id } = req.params;
//   const { type, title, description, order, is_shown_in_table } = req.body;

//   if (!/^\d+$/.test(id)) {
//     console.log('Invalid template ID:', id);
//     return res.status(400).json({ error: 'Invalid template ID' });
//   }

//   // Input validation
//   if (!type || !validQuestionTypes.includes(type)) {
//     console.log('Invalid question type:', type);
//     return res.status(400).json({ error: `Invalid question type. Must be one of: ${validQuestionTypes.join(', ')}` });
//   }
//   if (!title || typeof title !== 'string' || title.trim().length === 0) {
//     console.log('Invalid question title:', title);
//     return res.status(400).json({ error: 'Question title is required and must be a non-empty string' });
//   }
//   if (description && typeof description !== 'string') {
//     console.log('Invalid description:', description);
//     return res.status(400).json({ error: 'Description must be a string' });
//   }
//   if (typeof order !== 'number') {
//     console.log('Invalid order:', order);
//     return res.status(400).json({ error: 'Order must be a number' });
//   }
//   if (typeof is_shown_in_table !== 'boolean') {
//     console.log('Invalid is_shown_in_table:', is_shown_in_table);
//     return res.status(400).json({ error: 'is_shown_in_table must be a boolean' });
//   }

//   try {
//     console.log(`Received POST /api/templates/${id}/questions request with body:`, req.body);
//     const template = await prisma.template.findUnique({
//       where: { id: parseInt(id) },
//       include: { questions: true },
//     });

//     if (!template) {
//       console.log(`Template ID ${id} not found`);
//       return res.status(404).json({ error: 'Template not found' });
//     }

//     if (template.created_by !== req.user.id && !req.user.is_admin) {
//       console.log(`User ${req.user.id} does not have permission to add questions to template ${id}`);
//       return res.status(403).json({ error: 'Forbidden' });
//     }

//     const questionCounts = template.questions.reduce((acc, q) => {
//       if (!q.fixed) acc[q.type] = (acc[q.type] || 0) + 1;
//       return acc;
//     }, {});

//     if (questionCounts[type] >= 4) {
//       console.log(`Maximum 4 ${type} questions reached for template ${id}`);
//       return res.status(400).json({ error: `Maximum 4 ${type} questions allowed` });
//     }

//     const question = await prisma.question.create({
//       data: {
//         template_id: parseInt(id),
//         type,
//         title: title.trim(),
//         description: description || '',
//         is_shown_in_table,
//         order,
//       },
//     });

//     console.log(`Question created successfully for template ${id}`);
//     res.json(question);
//   } catch (error) {
//     console.error('Create question error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to create question', details: error.message });
//   }
// });

// // DELETE /templates/:id/questions/:questionId - Delete a question
// router.delete('/:id/questions/:questionId', authenticate, async (req, res) => {
//   const { id, questionId } = req.params;

//   if (!/^\d+$/.test(id) || !/^\d+$/.test(questionId)) {
//     console.log('Invalid template or question ID:', { id, questionId });
//     return res.status(400).json({ error: 'Invalid template or question ID' });
//   }

//   try {
//     console.log(`Received DELETE /api/templates/${id}/questions/${questionId} request`);
//     const template = await prisma.template.findUnique({
//       where: { id: parseInt(id) },
//     });

//     if (!template) {
//       console.log(`Template ID ${id} not found`);
//       return res.status(404).json({ error: 'Template not found' });
//     }

//     if (template.created_by !== req.user.id && !req.user.is_admin) {
//       console.log(`User ${req.user.id} does not have permission to delete questions from template ${id}`);
//       return res.status(403).json({ error: 'Forbidden' });
//     }

//     const question = await prisma.question.findUnique({
//       where: { id: parseInt(questionId) },
//     });

//     if (!question) {
//       console.log(`Question ID ${questionId} not found`);
//       return res.status(404).json({ error: 'Question not found' });
//     }

//     if (question.fixed) {
//       console.log(`Cannot delete fixed question ID ${questionId}`);
//       return res.status(400).json({ error: 'Cannot delete fixed question' });
//     }

//     await prisma.question.delete({
//       where: { id: parseInt(questionId), template_id: parseInt(id) },
//     });

//     console.log(`Question ${questionId} deleted successfully from template ${id}`);
//     res.json({ message: 'Question deleted successfully' });
//   } catch (error) {
//     console.error('Delete question error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to delete question', details: error.message });
//   }
// });

// // PUT /templates/:id/questions/order - Update question order
// router.put('/:id/questions/order', authenticate, async (req, res) => {
//   const { id } = req.params;
//   const { order } = req.body;

//   if (!/^\d+$/.test(id)) {
//     console.log('Invalid template ID:', id);
//     return res.status(400).json({ error: 'Invalid template ID' });
//   }

//   // Input validation
//   if (!Array.isArray(order) || order.length === 0) {
//     console.log('Invalid order array:', order);
//     return res.status(400).json({ error: 'Order must be a non-empty array' });
//   }
//   for (const item of order) {
//     if (!item.id || typeof item.order !== 'number') {
//       console.log('Invalid order item:', item);
//       return res.status(400).json({ error: 'Each order item must have an id and order number' });
//     }
//   }

//   try {
//     console.log(`Received PUT /api/templates/${id}/questions/order request with body:`, req.body);
//     const template = await prisma.template.findUnique({
//       where: { id: parseInt(id) },
//       include: { questions: true },
//     });

//     if (!template) {
//       console.log(`Template ID ${id} not found`);
//       return res.status(404).json({ error: 'Template not found' });
//     }

//     if (template.created_by !== req.user.id && !req.user.is_admin) {
//       console.log(`User ${req.user.id} does not have permission to update question order for template ${id}`);
//       return res.status(403).json({ error: 'Forbidden' });
//     }

//     // Verify all question IDs exist and belong to the template
//     const questionIds = template.questions.map((q) => q.id);
//     const invalidIds = order.filter((item) => !questionIds.includes(item.id));
//     if (invalidIds.length > 0) {
//       console.log('Invalid question IDs in order:', invalidIds);
//       return res.status(400).json({ error: 'One or more question IDs are invalid' });
//     }

//     // Update the order
//     await prisma.$transaction(
//       order.map((item) => {
//         return prisma.question.update({
//           where: { id: item.id, template_id: parseInt(id) },
//           data: { order: item.order },
//         });
//       })
//     );

//     console.log(`Question order updated successfully for template ${id}`);
//     res.json({ message: 'Order updated successfully' });
//   } catch (error) {
//     console.error('Update question order error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to update question order', details: error.message });
//   }
// });

// // POST /templates/:id/form - Submit a form
// router.post('/:id/form', authenticate, async (req, res) => {
//   const { id } = req.params;
//   const { answers } = req.body;

//   if (!/^\d+$/.test(id)) {
//     console.log('Invalid template ID:', id);
//     return res.status(400).json({ error: 'Invalid template ID' });
//   }

//   // Input validation
//   if (!Array.isArray(answers) || answers.length === 0) {
//     console.log('Invalid answers array:', answers);
//     return res.status(400).json({ error: 'Answers must be a non-empty array' });
//   }
//   for (const answer of answers) {
//     if (!answer.question_id || typeof answer.question_id !== 'number' || answer.value === undefined) {
//       console.log('Invalid answer:', answer);
//       return res.status(400).json({ error: 'Each answer must have a question_id (number) and value' });
//     }
//   }

//   try {
//     console.log(`Received POST /api/templates/${id}/form request with body:`, req.body);
//     const template = await prisma.template.findUnique({
//       where: { id: parseInt(id) },
//       include: { questions: true, access: true },
//     });

//     if (!template) {
//       console.log(`Template ID ${id} not found`);
//       return res.status(404).json({ error: 'Template not found' });
//     }

//     if (template.created_by === req.user.id) {
//       console.log(`User ${req.user.id} is the creator of template ${id} and cannot fill their own template`);
//       return res.status(403).json({ error: 'Creators cannot fill their own templates' });
//     }

//     if (
//       !template.is_public &&
//       !template.access.some((a) => a.user_id === req.user.id) &&
//       !req.user.is_admin
//     ) {
//       console.log(`User ${req.user.id} does not have access to fill template ${id}`);
//       return res.status(403).json({ error: 'Forbidden' });
//     }

//     const form = await prisma.form.create({
//       data: {
//         template_id: parseInt(id),
//         user_id: req.user.id,
//         createdAt: new Date(),
//         answers: {
//           create: answers.map((answer) => ({
//             question_id: answer.question_id,
//             value: answer.value.toString(),
//           })), // Removed fixed_user and fixed_date answers
//         },
//       },
//       include: {
//         answers: { include: { question: true } },
//         user: { select: { name: true } },
//         template: { select: { title: true, created_by: true } },
//       },
//     });

//     if (form.template.created_by !== req.user.id) {
//       await prisma.notification.create({
//         data: {
//           user_id: form.template.created_by,
//           message: `${form.user.name} submitted a form for your template "${form.template.title}" (ID: ${form.id})`,
//         },
//       });
//     }

//     console.log(`Form created successfully for template ${id} by user ${req.user.id}`);
//     res.json(form);
//   } catch (error) {
//     console.error('Create form error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to submit form', details: error.message });
//   }
// });

// // GET /forms - Fetch forms for the authenticated user
// router.get('/forms', authenticate, async (req, res) => {
//   try {
//     console.log('Fetching forms for user:', req.user.id);
//     const forms = await prisma.form.findMany({
//       where: {
//         user_id: req.user.id,
//       },
//       include: {
//         template: {
//           select: {
//             id: true,
//             title: true,
//           },
//         },
//         answers: { include: { question: true } },
//       },
//     });

//     const formattedForms = forms.map((form) => ({
//       ...form,
//       createdAt: form.createdAt,
//     }));

//     console.log('Forms fetched successfully:', formattedForms.length);
//     res.json(formattedForms);
//   } catch (error) {
//     console.error('Get forms error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to fetch forms', details: error.message });
//   }
// });

// // PUT /forms/:formId - Update a form submission
// router.put('/forms/:formId', authenticate, async (req, res) => {
//   const { formId } = req.params;
//   const { answers } = req.body;

//   if (!/^\d+$/.test(formId)) {
//     console.log('Invalid form ID:', formId);
//     return res.status(400).json({ error: 'Invalid form ID' });
//   }

//   // Input validation
//   if (!Array.isArray(answers) || answers.length === 0) {
//     console.log('Invalid answers array:', answers);
//     return res.status(400).json({ error: 'Answers must be a non-empty array' });
//   }
//   for (const answer of answers) {
//     if (!answer.question_id || typeof answer.question_id !== 'number' || answer.value === undefined) {
//       console.log('Invalid answer:', answer);
//       return res.status(400).json({ error: 'Each answer must have a question_id (number) and value' });
//     }
//   }

//   try {
//     console.log(`Received PUT /api/forms/${formId} request with body:`, req.body);
//     const form = await prisma.form.findUnique({
//       where: { id: parseInt(formId) },
//       include: { template: { include: { questions: true } } },
//     });

//     if (!form) {
//       console.log(`Form ID ${formId} not found`);
//       return res.status(404).json({ error: 'Form not found' });
//     }

//     if (
//       form.user_id !== req.user.id &&
//       form.template.created_by !== req.user.id &&
//       !req.user.is_admin
//     ) {
//       console.log(`User ${req.user.id} does not have permission to update form ${formId}`);
//       return res.status(403).json({ error: 'Forbidden' });
//     }

//     await prisma.answer.deleteMany({ where: { form_id: parseInt(formId) } });

//     const updatedForm = await prisma.form.update({
//       where: { id: parseInt(formId) },
//       data: {
//         answers: {
//           create: answers.map((answer) => ({
//             question_id: answer.question_id,
//             value: answer.value.toString(),
//           })), // Removed fixed_user and fixed_date answers
//         },
//       },
//       include: { answers: { include: { question: true } }, user: true },
//     });

//     console.log(`Form ${formId} updated successfully`);
//     res.json(updatedForm);
//   } catch (error) {
//     console.error('Update form error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to update form', details: error.message });
//   }
// });

// // DELETE /forms/:formId - Delete a form submission
// router.delete('/forms/:formId', authenticate, async (req, res) => {
//   const { formId } = req.params;

//   if (!/^\d+$/.test(formId)) {
//     console.log('Invalid form ID:', formId);
//     return res.status(400).json({ error: 'Invalid form ID' });
//   }

//   try {
//     console.log(`Received DELETE /api/forms/${formId} request`);
//     const form = await prisma.form.findUnique({
//       where: { id: parseInt(formId) },
//       include: { template: true },
//     });

//     if (!form) {
//       console.log(`Form ID ${formId} not found`);
//       return res.status(404).json({ error: 'Form not found' });
//     }

//     if (
//       form.user_id !== req.user.id &&
//       form.template.created_by !== req.user.id &&
//       !req.user.is_admin
//     ) {
//       console.log(`User ${req.user.id} does not have permission to delete form ${formId}`);
//       return res.status(403).json({ error: 'Forbidden' });
//     }

//     await prisma.form.delete({ where: { id: parseInt(formId) } });

//     console.log(`Form ${formId} deleted successfully`);
//     res.json({ message: 'Form deleted successfully' });
//   } catch (error) {
//     console.error('Delete form error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to delete form', details: error.message });
//   }
// });

// // POST /templates/:id/comments - Add a comment to a template
// router.post('/:id/comments', authenticate, async (req, res) => {
//   const { id } = req.params;
//   const { content } = req.body;

//   if (!/^\d+$/.test(id)) {
//     console.log('Invalid template ID:', id);
//     return res.status(400).json({ error: 'Invalid template ID' });
//   }

//   // Input validation
//   if (!req.user) {
//     console.log('User not authenticated for POST /api/comments');
//     return res.status(401).json({ error: 'Authentication required' });
//   }
//   if (!content || typeof content !== 'string' || content.trim().length === 0) {
//     console.log('Invalid comment content:', content);
//     return res.status(400).json({ error: 'Comment content is required and must be a non-empty string' });
//   }

//   try {
//     console.log(`Received POST /api/templates/${id}/comments request`);
//     const template = await prisma.template.findUnique({
//       where: { id: parseInt(id) },
//       include: {
//         access: {
//           select: { user_id: true },
//         },
//       },
//     });

//     if (!template) {
//       console.log(`Template ID ${id} not found`);
//       return res.status(404).json({ error: 'Template not found' });
//     }

//     // Check if the user is the creator
//     if (template.created_by === req.user.id) {
//       console.log(`User ${req.user.id} is the creator of template ${id} and cannot comment on their own template`);
//       return res.status(403).json({ error: 'Creators cannot comment on their own templates' });
//     }

//     // Check access
//     const hasAccess =
//       template.is_public ||
//       template.created_by === req.user.id ||
//       template.access.some((a) => a.user_id === req.user.id) ||
//       req.user.is_admin;

//     console.log(`Access check for user ${req.user.id} to comment on template ${id}:`, {
//       created_by: template.created_by,
//       is_public: template.is_public,
//       access: template.access,
//       is_admin: req.user.is_admin,
//       hasAccess,
//     });

//     if (!hasAccess) {
//       console.log(`User ${req.user.id} does not have access to comment on template ${id}`);
//       return res.status(403).json({ error: 'You do not have access to this template' });
//     }

//     // Create the comment
//     const comment = await prisma.comment.create({
//       data: {
//         content: content.trim(),
//         template_id: parseInt(id),
//         user_id: req.user.id,
//         createdAt: new Date(),
//       },
//       include: {
//         user: {
//           select: { id: true, name: true },
//         },
//       },
//     });

//     console.log(`Comment added successfully for template ${id} by user ${req.user.id}`);
//     res.status(201).json(comment);
//   } catch (error) {
//     console.error(`Error adding comment to template ${id}:`, error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to add comment', details: error.message });
//   }
// });

// // PUT /comments/:commentId - Update a comment
// router.put('/comments/:commentId', authenticate, async (req, res) => {
//   const { commentId } = req.params;
//   const { content } = req.body;

//   if (!/^\d+$/.test(commentId)) {
//     console.log('Invalid comment ID:', commentId);
//     return res.status(400).json({ error: 'Invalid comment ID' });
//   }

//   // Input validation
//   if (!content || typeof content !== 'string' || content.trim().length === 0) {
//     console.log('Invalid comment content:', content);
//     return res.status(400).json({ error: 'Comment content is required and must be a non-empty string' });
//   }

//   try {
//     console.log(`Received PUT /api/comments/${commentId} request with body:`, req.body);
//     const comment = await prisma.comment.findUnique({
//       where: { id: parseInt(commentId) },
//     });

//     if (!comment) {
//       console.log(`Comment ID ${commentId} not found`);
//       return res.status(404).json({ error: 'Comment not found' });
//     }

//     if (comment.user_id !== req.user.id) {
//       console.log(`User ${req.user.id} does not have permission to update comment ${commentId}`);
//       return res.status(403).json({ error: 'Forbidden' });
//     }

//     const updatedComment = await prisma.comment.update({
//       where: { id: parseInt(commentId) },
//       data: { content: content.trim() },
//       include: { user: { select: { name: true } } },
//     });

//     console.log(`Comment ${commentId} updated successfully`);
//     res.json(updatedComment);
//   } catch (error) {
//     console.error('Update comment error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to update comment', details: error.message });
//   }
// });

// // DELETE /comments/:commentId - Delete a comment
// router.delete('/comments/:commentId', authenticate, async (req, res) => {
//   const { commentId } = req.params;

//   if (!/^\d+$/.test(commentId)) {
//     console.log('Invalid comment ID:', commentId);
//     return res.status(400).json({ error: 'Invalid comment ID' });
//   }

//   try {
//     console.log(`Received DELETE /api/comments/${commentId} request`);
//     const comment = await prisma.comment.findUnique({
//       where: { id: parseInt(commentId) },
//     });

//     if (!comment) {
//       console.log(`Comment ID ${commentId} not found`);
//       return res.status(404).json({ error: 'Comment not found' });
//     }

//     if (comment.user_id !== req.user.id) {
//       console.log(`User ${req.user.id} does not have permission to delete comment ${commentId}`);
//       return res.status(403).json({ error: 'Forbidden' });
//     }

//     await prisma.comment.delete({ where: { id: parseInt(commentId) } });

//     console.log(`Comment ${commentId} deleted successfully`);
//     res.json({ message: 'Comment deleted successfully' });
//   } catch (error) {
//     console.error('Delete comment error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to delete comment', details: error.message });
//   }
// });

// // POST /templates/:id/likes - Add a like to a template
// router.post('/:id/likes', authenticate, async (req, res) => {
//   const { id } = req.params;

//   if (!/^\d+$/.test(id)) {
//     console.log('Invalid template ID:', id);
//     return res.status(400).json({ error: 'Invalid template ID' });
//   }

//   try {
//     console.log(`Received POST /api/templates/${id}/likes request`);
//     const template = await prisma.template.findUnique({
//       where: { id: parseInt(id) },
//     });

//     if (!template) {
//       console.log(`Template ID ${id} not found`);
//       return res.status(404).json({ error: 'Template not found' });
//     }

//     if (template.created_by === req.user.id) {
//       console.log(`User ${req.user.id} cannot like their own template ${id}`);
//       return res.status(403).json({ error: 'Creators cannot like their own templates' });
//     }

//     const existingLike = await prisma.like.findUnique({
//       where: { template_id_user_id: { template_id: parseInt(id), user_id: req.user.id } },
//     });

//     if (existingLike) {
//       console.log(`User ${req.user.id} has already liked template ${id}`);
//       return res.status(400).json({ error: 'Already liked' });
//     }

//     const like = await prisma.like.create({
//       data: { template_id: parseInt(id), user_id: req.user.id },
//     });

//     console.log(`Like added successfully for template ${id} by user ${req.user.id}`);
//     res.json(like);
//   } catch (error) {
//     console.error('Create like error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to create like', details: error.message });
//   }
// });

// // DELETE /templates/:id/likes - Remove a like from a template
// router.delete('/:id/likes', authenticate, async (req, res) => {
//   const { id } = req.params;

//   if (!/^\d+$/.test(id)) {
//     console.log('Invalid template ID:', id);
//     return res.status(400).json({ error: 'Invalid template ID' });
//   }

//   try {
//     console.log(`Received DELETE /api/templates/${id}/likes request`);
//     const like = await prisma.like.findUnique({
//       where: { template_id_user_id: { template_id: parseInt(id), user_id: req.user.id } },
//     });

//     if (!like) {
//       console.log(`Like not found for template ${id} and user ${req.user.id}`);
//       return res.status(404).json({ error: 'Like not found' });
//     }

//     await prisma.like.delete({
//       where: { template_id_user_id: { template_id: parseInt(id), user_id: req.user.id } },
//     });

//     console.log(`Like removed successfully for template ${id} by user ${req.user.id}`);
//     res.json({ message: 'Like removed successfully' });
//   } catch (error) {
//     console.error('Delete like error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to delete like', details: error.message });
//   }
// });

// // POST /templates/:id/duplicate - Duplicate a template
// router.post('/:id/duplicate', authenticate, async (req, res) => {
//   const { id } = req.params;

//   if (!/^\d+$/.test(id)) {
//     console.log('Invalid template ID:', id);
//     return res.status(400).json({ error: 'Invalid template ID' });
//   }

//   try {
//     console.log(`Received POST /api/templates/${id}/duplicate request`);
//     const original = await prisma.template.findUnique({
//       where: { id: parseInt(id) },
//       include: { questions: true, tags: { include: { tag: true } } },
//     });

//     if (!original) {
//       console.log(`Template ID ${id} not found`);
//       return res.status(404).json({ error: 'Template not found' });
//     }

//     if (original.created_by !== req.user.id && !req.user.is_admin) {
//       console.log(`User ${req.user.id} does not have permission to duplicate template ${id}`);
//       return res.status(403).json({ error: 'Forbidden' });
//     }

//     const duplicate = await prisma.template.create({
//       data: {
//         title: `${original.title} (Copy)`,
//         description: original.description,
//         topic: original.topic,
//         image_url: original.image_url,
//         is_public: original.is_public,
//         created_by: req.user.id,
//         createdAt: new Date(),
//         questions: {
//           create: original.questions.map((q) => ({
//             type: q.type,
//             title: q.title,
//             description: q.description,
//             is_shown_in_table: q.is_shown_in_table,
//             order: q.order,
//             fixed: q.fixed,
//             required: q.required,
//           })),
//         },
//         tags: { connect: original.tags.map((tt) => ({ id: tt.tag.id })) },
//       },
//       include: { questions: true, tags: { include: { tag: true } }, creator: { select: { name: true } } },
//     });

//     console.log(`Template ${id} duplicated successfully as template ${duplicate.id}`);
//     res.json({
//       ...duplicate,
//       user: duplicate.creator || { name: 'Unknown User' },
//       tags: duplicate.tags.map((tt) => tt.tag),
//       description: duplicate.description || '', // Return plain text
//       createdAt: duplicate.createdAt,
//     });
//   } catch (error) {
//     console.error('Duplicate template error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to duplicate template', details: error.message });
//   }
// });

// // POST /templates/:id/share - Share a template with a user
// router.post('/:id/share', authenticate, async (req, res) => {
//   const { id } = req.params;
//   const { email } = req.body;

//   if (!/^\d+$/.test(id)) {
//     console.log('Invalid template ID:', id);
//     return res.status(400).json({ error: 'Invalid template ID' });
//   }

//   // Input validation
//   if (!email || !isValidEmail(email)) {
//     console.log('Invalid email:', email);
//     return res.status(400).json({ error: 'A valid email is required' });
//   }

//   try {
//     console.log(`Received POST /api/templates/${id}/share request with body:`, req.body);
//     const template = await prisma.template.findUnique({
//       where: { id: parseInt(id) },
//       include: { creator: { select: { name: true } } },
//     });

//     if (!template) {
//       console.log(`Template ID ${id} not found`);
//       return res.status(404).json({ error: 'Template not found' });
//     }

//     if (template.created_by !== req.user.id && !req.user.is_admin) {
//       console.log(`User ${req.user.id} does not have permission to share template ${id}`);
//       return res.status(403).json({ error: 'Forbidden' });
//     }

//     const user = await prisma.user.findUnique({ where: { email } });

//     if (!user) {
//       console.log(`User with email ${email} not found`);
//       return res.status(404).json({ error: 'User not found' });
//     }

//     const access = await prisma.templateAccess.upsert({
//       where: { template_id_user_id: { template_id: parseInt(id), user_id: user.id } },
//       update: {},
//       create: { template_id: parseInt(id), user_id: user.id },
//     });

//     await prisma.notification.create({
//       data: {
//         user_id: user.id,
//         message: `${template.creator.name} shared the template "${template.title}" with you`,
//       },
//     });

//     console.log(`Template ${id} shared successfully with user ${user.id}`);
//     res.json({ message: 'Template shared successfully', access });
//   } catch (error) {
//     console.error('Share template error:', error.message);
//     console.error('Stack trace:', error.stack);
//     res.status(500).json({ error: 'Failed to share template', details: error.message });
//   }
// });

// module.exports = router;
