import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createCustomerController,
  getCustomersController,
} from './customer.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

/**
 * Customer APIs are protected by JWT authentication.
 *
 * Both ADMIN and SALES_USER can work with customer information.
 * More restrictive permissions will be applied to operations such as
 * inventory reservation and dispatch when those modules are implemented.
 */
router.use(
  authenticateToken,
  requireRole(Role.ADMIN, Role.SALES_USER),
);

/**
 * POST /api/customers
 *
 * Creates a new customer.
 */
router.post('/', createCustomerController);

/**
 * GET /api/customers
 *
 * Returns all customers.
 */
router.get('/', getCustomersController);

export default router;
