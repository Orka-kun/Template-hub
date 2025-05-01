const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    console.log('Received GET /api/tags request'); // Updated log to reflect full route path
    let user = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        user = await jwt.verify(token, process.env.JWT_SECRET);
        console.log('Authenticated user for GET /api/tags:', user.id);
      } catch (error) {
        console.log('No valid token provided for GET /api/tags, proceeding as unauthenticated:', error.message);
      }
    } else {
      console.log('No Authorization header provided for GET /api/tags, proceeding as unauthenticated');
    }

    // Simplified query to fetch tags
    const tags = await prisma.tag.findMany({
      select: {
        id: true,
        name: true,
        templates: {
          select: {
            template: {
              select: {
                id: true,
                created_by: true,
                is_public: true,
                access: {
                  select: {
                    user_id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Filter tags based on user access
    const filteredTags = tags
      .filter((tag) => {
        const associatedTemplates = tag.templates.map((t) => t.template);
        return associatedTemplates.some((template) => {
          if (template.is_public) return true;
          if (!user) return false;
          if (template.created_by === user.id) return true;
          return template.access.some((a) => a.user_id === user.id);
        });
      })
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
      }));

    console.log(`Tags fetched successfully: ${filteredTags.length} tags for ${user ? `user ${user.id}` : 'unauthenticated user'}`);
    res.json(filteredTags);
  } catch (error) {
    console.error('Get tags error:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to fetch tags', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
});

module.exports = router;
// const express = require('express');
// const { PrismaClient } = require('@prisma/client');
// const jwt = require('jsonwebtoken');

// const router = express.Router();
// const prisma = new PrismaClient();

// router.get('/', async (req, res) => {
//   try {
//     console.log('Received GET /tags request');
//     let user = null;
//     if (req.headers.authorization) {
//       try {
//         const token = req.headers.authorization.replace('Bearer ', '');
//         user = await jwt.verify(token, process.env.JWT_SECRET);
//         console.log('Authenticated user for GET /tags:', user.id);
//       } catch (error) {
//         console.log('No valid token provided for GET /tags, proceeding as unauthenticated:', error.message);
//       }
//     } else {
//       console.log('No Authorization header provided for GET /tags, proceeding as unauthenticated');
//     }

//     // Simplified query to fetch tags
//     const tags = await prisma.tag.findMany({
//       select: {
//         id: true,
//         name: true,
//         templates: {
//           select: {
//             template: {
//               select: {
//                 id: true,
//                 created_by: true,
//                 is_public: true,
//                 access: {
//                   select: {
//                     user_id: true,
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     });

//     // Filter tags based on user access
//     const filteredTags = tags.filter(tag => {
//       const associatedTemplates = tag.templates.map(t => t.template);
//       return associatedTemplates.some(template => {
//         if (template.is_public) return true;
//         if (!user) return false;
//         if (template.created_by === user.id) return true;
//         return template.access.some(a => a.user_id === user.id);
//       });
//     }).map(tag => ({
//       id: tag.id,
//       name: tag.name,
//     }));

//     console.log(`Tags fetched successfully: ${filteredTags.length} tags for ${user ? `user ${user.id}` : 'unauthenticated user'}`);
//     res.json(filteredTags);
//   } catch (error) {
//     console.error('Get tags error:', error);
//     res.status(500).json({ error: 'Failed to fetch tags', details: error.message });
//   } finally {
//     await prisma.$disconnect();
//   }
// });

// module.exports = router;
