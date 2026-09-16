import { Router } from "express";

import {
  confirmSalesOrderController,
  getSalesOrderByIdController,
  getSalesOrdersController,
} from "./sales-order.controller";

import { authenticateToken } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";

const router = Router();

/**
 * Confirm a Sales Order.
 *
 * ADMIN-only operation.
 *
 * PENDING → CONFIRMED
 *
 * This operation also reserves the required inventory.
 */
router.post(
  "/:id/confirm",
  authenticateToken,
  requireRole("ADMIN"),
  confirmSalesOrderController,
);

/**
 * Get all Sales Orders.
 *
 * ADMIN and SALES_USER can view Sales Orders.
 */
router.get(
  "/",
  authenticateToken,
  requireRole("ADMIN", "SALES_USER"),
  getSalesOrdersController,
);

/**
 * Get a Sales Order by ID.
 *
 * ADMIN and SALES_USER can view individual Sales Orders.
 */
router.get(
  "/:id",
  authenticateToken,
  requireRole("ADMIN", "SALES_USER"),
  getSalesOrderByIdController,
);

export default router;