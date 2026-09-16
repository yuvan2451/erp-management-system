import { Request, Response } from 'express';
import {
  getInventory,
  getInventoryByProductId,
  updatePhysicalQuantity,
} from './inventory.service';

/**
 * GET /api/inventory
 *
 * Returns inventory for all products.
 */
export async function getInventoryController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const inventory = await getInventory();

    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error('Get inventory error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve inventory',
    });
  }
}

/**
 * GET /api/inventory/:productId
 *
 * Returns inventory for a specific product.
 */
export async function getInventoryByProductIdController(
  req: Request<{ productId: string }>,
  res: Response,
): Promise<void> {
  try {
    const inventory = await getInventoryByProductId(
      req.params.productId,
    );

    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Inventory not found'
    ) {
      res.status(404).json({
        success: false,
        message: 'Inventory not found',
      });
      return;
    }

    console.error('Get inventory item error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve inventory',
    });
  }
}

/**
 * PATCH /api/inventory/:productId
 *
 * Updates physical inventory quantity.
 *
 * This operation will be restricted to ADMIN at the route level.
 */
export async function updatePhysicalQuantityController(
  req: Request<{ productId: string }>,
  res: Response,
): Promise<void> {
  const { physicalQuantity } = req.body;

  /**
   * Validate the request body before calling the service.
   *
   * We require a number because inventory quantity is numeric.
   */
  if (
    typeof physicalQuantity !== 'number' ||
    !Number.isFinite(physicalQuantity)
  ) {
    res.status(400).json({
      success: false,
      message: 'Physical quantity must be a valid number',
    });
    return;
  }

  try {
    const inventory = await updatePhysicalQuantity(
      req.params.productId,
      physicalQuantity,
    );

    res.status(200).json({
      success: true,
      message: 'Inventory updated successfully',
      data: inventory,
    });
  } catch (error) {
    if (error instanceof Error) {
      const businessErrors = [
        'Inventory not found',
        'Physical quantity cannot be negative',
        'Physical quantity cannot be less than reserved quantity',
      ];

      if (businessErrors.includes(error.message)) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    console.error('Update inventory error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to update inventory',
    });
  }
}