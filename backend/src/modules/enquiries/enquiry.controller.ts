import { Request, Response } from 'express';
import {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
} from './enquiry.service';

/**
 * Handles POST /api/enquiries.
 *
 * The controller is responsible for HTTP-level validation and responses.
 * Business logic is delegated to the enquiry service.
 *
 * The authenticated user's ID is passed to the service so the enquiry
 * can be linked to the user who created it.
 */
export async function createEnquiryController(
  req: Request,
  res: Response,
): Promise<void> {
  const {
    customerId,
    requiredDate,
    notes,
    items,
  } = req.body;

  /**
   * Basic HTTP-level validation.
   *
   * Detailed business validation is handled by the service.
   */
  if (
    typeof customerId !== 'string' ||
    !customerId.trim()
  ) {
    res.status(400).json({
      success: false,
      message: 'Customer is required',
    });
    return;
  }

  if (
    typeof requiredDate !== 'string' ||
    !requiredDate.trim()
  ) {
    res.status(400).json({
      success: false,
      message: 'Required date is required',
    });
    return;
  }

  if (!Array.isArray(items)) {
    res.status(400).json({
      success: false,
      message: 'Items must be an array',
    });
    return;
  }

  if (notes !== undefined && typeof notes !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Notes must be a string',
    });
    return;
  }

  /**
   * Validate the basic shape of each enquiry item before
   * passing it to the business service.
   */
  for (const item of items) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item.productId !== 'string' ||
      typeof item.quantity !== 'number'
    ) {
      res.status(400).json({
        success: false,
        message: 'Each enquiry item requires productId and quantity',
      });
      return;
    }
  }

  try {
    /**
     * authenticateToken middleware runs before this controller.
     *
     * Therefore req.user contains the identity extracted from
     * the verified JWT.
     */
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const enquiry = await createEnquiry({
  customerId,
  requiredDate,
  notes,
  items,

  // The user ID comes from the verified JWT,
  // not from the frontend request body.
  createdById: req.user.userId,
});

    res.status(201).json({
      success: true,
      message: 'Enquiry created successfully',
      data: enquiry,
    });
  } catch (error) {
    /**
     * Business validation errors are returned as 400 responses.
     */
    if (error instanceof Error) {
      const businessErrors = [
        'Customer is required',
        'Required date is required',
        'Invalid required date',
        'At least one enquiry item is required',
        'Duplicate products are not allowed in an enquiry',
        'Product is required for every enquiry item',
        'Quantity must be greater than zero for every enquiry item',
        'Customer not found',
        'One or more products were not found',
      ];

      if (businessErrors.includes(error.message)) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    /**
     * Unexpected errors should not expose internal implementation
     * details to the API client.
     */
    console.error('Create enquiry error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * Handles GET /api/enquiries.
 *
 * Returns all enquiries with their customers and product items.
 */
export async function getEnquiriesController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const enquiries = await getEnquiries();

    res.status(200).json({
      success: true,
      data: enquiries,
    });
  } catch (error) {
    console.error('Get enquiries error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * Handles GET /api/enquiries/:id.
 *
 * The generic parameter Request<{ id: string }> explicitly tells
 * TypeScript that this route contains an "id" path parameter.
 */
export async function getEnquiryByIdController(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const { id } = req.params;

  try {
    const enquiry = await getEnquiryById(id);

    res.status(200).json({
      success: true,
      data: enquiry,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Enquiry not found'
    ) {
      res.status(404).json({
        success: false,
        message: 'Enquiry not found',
      });
      return;
    }

    console.error('Get enquiry error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}