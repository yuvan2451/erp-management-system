import { Router } from "express";

import {
  createDispatchController,
  getDispatchByIdController,
  getDispatchesController,
} from "./dispatch.controller";

import { authenticateToken } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";

const router = Router();

/**
 * Create a Dispatch.
 *
 * ADMIN-only operation.
 *
 * The Sales Order must be CONFIRMED.
 * Inventory is physically reduced and the reservation
 * is released when the dispatch is successfully created.
 */
router.post(
  "/",
  authenticateToken,
  requireRole("ADMIN"),
  createDispatchController,
);

/**
 * Get all Dispatches.
 *
 * ADMIN and SALES_USER can view dispatch information.
 */
router.get(
  "/",
  authenticateToken,
  requireRole("ADMIN", "SALES_USER"),
  getDispatchesController,
);

/**
 * Get one Dispatch by ID.
 *
 * ADMIN and SALES_USER can view individual dispatches.
 */
router.get(
  "/:id",
  authenticateToken,
  requireRole("ADMIN", "SALES_USER"),
  getDispatchByIdController,
);

export default router;