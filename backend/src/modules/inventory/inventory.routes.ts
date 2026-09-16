import { Router } from 'express';
import { Role } from '@prisma/client';

import {
  getInventoryController,
  getInventoryByProductIdController,
  updatePhysicalQuantityController,
} from './inventory.controller';

import { authenticateToken } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

/**
 * Both ADMIN and SALES_USER can view inventory.
 *
 * Authentication and authorization are enforced by the backend.
 */
router.get(
  '/',
  authenticateToken,
  requireRole(Role.ADMIN, Role.SALES_USER),
  getInventoryController,
);

router.get(
  '/:productId',
  authenticateToken,
  requireRole(Role.ADMIN, Role.SALES_USER),
  getInventoryByProductIdController,
);

/**
 * Only ADMIN can modify physical inventory.
 */
router.patch(
  '/:productId',
  authenticateToken,
  requireRole(Role.ADMIN),
  updatePhysicalQuantityController,
);

export default router;