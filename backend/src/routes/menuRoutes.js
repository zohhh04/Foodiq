import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getCategories,
  getMenu,
  getMenuItem,
  getRecommendations,
  createCategory,
  updateCategory,
  deleteCategory,
  createItem,
  updateItem,
  deleteItem,
} from '../controllers/menuController.js';

const router = Router();

router.get('/categories', getCategories);
router.get('/menu', getMenu);
router.get('/recommendations', protect, getRecommendations);
router.get('/menu/:id', getMenuItem);

router.post('/categories', protect, authorize('admin'), createCategory);
router.put('/categories/:id', protect, authorize('admin'), updateCategory);
router.delete('/categories/:id', protect, authorize('admin'), deleteCategory);
router.post('/menu', protect, authorize('admin'), createItem);
router.put('/menu/:id', protect, authorize('admin'), updateItem);
router.delete('/menu/:id', protect, authorize('admin'), deleteItem);

export default router;
