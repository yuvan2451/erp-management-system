import { prisma } from '../../lib/prisma';

/**
 * Returns all products in the Product Master.
 *
 * Products are read-only through this API because the current
 * case study only requires seeded Product Master data.
 */
export async function getProducts() {
  return prisma.product.findMany({
    orderBy: {
      productCode: 'asc',
    },
  });
}

/**
 * Returns one product by its database ID.
 */
export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: {
      id,
    },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  return product;
}