import { Router } from 'express';
import { Role } from '@prisma/client';

import {
  createQuotationController,
  getQuotationsController,
  getQuotationByIdController,
  updateQuotationStatusController,
} from './quotation.controller';

import { authenticateToken } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import {
  convertQuotationToSalesOrderController,
} from "../sales-orders/sales-order.controller";

const router = Router();

/**
 * Both ADMIN and SALES_USER can work with quotations.
 *
 * The current case study allows Sales Users to create quotations
 * and manage the quotation workflow.
 */
router.use(
  authenticateToken,
  requireRole(Role.ADMIN, Role.SALES_USER),
);

router.post('/', createQuotationController);

router.get('/', getQuotationsController);

router.get('/:id', getQuotationByIdController);

router.patch(
  '/:id/status',
  updateQuotationStatusController,
);
router.post(
  "/:id/convert",
   authenticateToken ,
  requireRole("ADMIN", "SALES_USER"),
  convertQuotationToSalesOrderController,
);
export default router;
