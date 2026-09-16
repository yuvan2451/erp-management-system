import { Router } from "express";

import {
  confirmSalesOrderController,
  getSalesOrderByIdController,
  getSalesOrdersController,
} from "./sales-order.controller";

import { createDispatchController } from "../dispatches/dispatch.controller";

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
 * Create a Dispatch for a confirmed Sales Order.
 *
 * ADMIN-only operation.
 *
 * CONFIRMED → DISPATCHED
 *
 * This operation decreases physical inventory
 * and releases the corresponding reservation.
 */
router.post(
  "/:id/dispatch",
  authenticateToken,
  requireRole("ADMIN"),
  createDispatchController,
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