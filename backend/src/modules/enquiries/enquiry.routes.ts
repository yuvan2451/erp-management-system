import { Router } from 'express';
import { Role } from '@prisma/client';
import {
  createEnquiryController,
  getEnquiriesController,
  getEnquiryByIdController,
} from './enquiry.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';

const router = Router();

/**
 * Enquiry APIs require authentication.
 *
 * ADMIN and SALES_USER can access the enquiry workflow.
 * SALES_USER is responsible for creating enquiries as defined
 * by the case-study role requirements.
 */
router.use(
  authenticateToken,
  requireRole(Role.ADMIN, Role.SALES_USER),
);

/**
 * POST /api/enquiries
 *
 * Creates a new enquiry with one or more product lines.
 */
router.post('/', createEnquiryController);

/**
 * GET /api/enquiries
 *
 * Returns all enquiries.
 */
router.get('/', getEnquiriesController);

/**
 * GET /api/enquiries/:id
 *
 * Returns a single enquiry and its product lines.
 */
router.get('/:id', getEnquiryByIdController);

export default router;