import { Router } from 'express';
import { Role } from '@prisma/client';

import {
  getProductsController,
  getProductByIdController,
} from './product.controller';

import { authenticateToken } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

/**
 * Both ADMIN and SALES_USER can view the Product Master.
 *
 * Authentication and RBAC are enforced on the backend.
 */
router.use(
  authenticateToken,
  requireRole(Role.ADMIN, Role.SALES_USER),
);

router.get('/', getProductsController);

router.get('/:id', getProductByIdController);

export default router;