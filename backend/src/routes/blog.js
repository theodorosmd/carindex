import express from 'express';
import { getBlogListing, getBlogPost } from '../controllers/blogController.js';
import { listPosts, createPost, updatePost, deletePost, publishPost } from '../controllers/blogAdminController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Public SSR
router.get('/', getBlogListing);
router.get('/:slug', getBlogPost);

export const blogRoutes = router;

// Admin API routes (protected)
const adminRouter = express.Router();
adminRouter.use(authMiddleware);
adminRouter.get('/', listPosts);
adminRouter.post('/', createPost);
adminRouter.put('/:id', updatePost);
adminRouter.delete('/:id', deletePost);
adminRouter.post('/:id/publish', publishPost);

export const blogAdminRoutes = adminRouter;
