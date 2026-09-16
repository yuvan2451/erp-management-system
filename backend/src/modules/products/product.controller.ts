import { Request, Response } from 'express';
import { getProducts, getProductById } from './product.service';

/**
 * GET /api/products
 *
 * Returns the complete Product Master.
 */
export async function getProductsController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const products = await getProducts();

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Get products error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products',
    });
  }
}

/**
 * GET /api/products/:id
 *
 * Returns a single product.
 */
export async function getProductByIdController(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  try {
    const product = await getProductById(req.params.id);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Product not found') {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    console.error('Get product error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product',
    });
  }
}