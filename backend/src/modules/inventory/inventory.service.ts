import { prisma } from '../../lib/prisma';

/**
 * Returns all inventory records.
 *
 * Available quantity is calculated dynamically:
 *
 * Available = Physical Quantity - Reserved Quantity
 *
 * We intentionally do not store available quantity separately,
 * because storing it could lead to inconsistent inventory data.
 */
export async function getInventory() {
  const inventory = await prisma.inventory.findMany({
    include: {
      product: true,
    },
    orderBy: {
      product: {
        productCode: 'asc',
      },
    },
  });

  return inventory.map((item) => ({
    id: item.id,
    productId: item.productId,
    productCode: item.product.productCode,
    productName: item.product.name,
    unit: item.product.unit,
    physicalQuantity: item.physicalQuantity,
    reservedQuantity: item.reservedQuantity,
    availableQuantity: item.physicalQuantity - item.reservedQuantity,
  }));
}

/**
 * Returns inventory for one product.
 */
export async function getInventoryByProductId(productId: string) {
  const inventory = await prisma.inventory.findUnique({
    where: {
      productId,
    },
    include: {
      product: true,
    },
  });

  if (!inventory) {
    throw new Error('Inventory not found');
  }

  return {
    id: inventory.id,
    productId: inventory.productId,
    productCode: inventory.product.productCode,
    productName: inventory.product.name,
    unit: inventory.product.unit,
    physicalQuantity: inventory.physicalQuantity,
    reservedQuantity: inventory.reservedQuantity,
    availableQuantity:
      inventory.physicalQuantity - inventory.reservedQuantity,
  };
}

/**
 * Updates the physical quantity of a product.
 *
 * Only ADMIN users will be allowed to call this API through
 * the route-level RBAC middleware.
 *
 * Important business rule:
 *
 * Physical quantity cannot be reduced below the amount that
 * is already reserved.
 *
 * Example:
 *
 * Physical = 50
 * Reserved = 20
 *
 * Physical cannot be changed to 19 because that would make
 * Available = -1.
 */
export async function updatePhysicalQuantity(
  productId: string,
  physicalQuantity: number,
) {
  if (
    !Number.isFinite(physicalQuantity) ||
    physicalQuantity < 0
  ) {
    throw new Error('Physical quantity cannot be negative');
  }

  const inventory = await prisma.inventory.findUnique({
    where: {
      productId,
    },
  });

  if (!inventory) {
    throw new Error('Inventory not found');
  }

  if (physicalQuantity < inventory.reservedQuantity) {
    throw new Error(
      'Physical quantity cannot be less than reserved quantity',
    );
  }

  const updatedInventory = await prisma.inventory.update({
    where: {
      productId,
    },
    data: {
      physicalQuantity,
    },
    include: {
      product: true,
    },
  });

  return {
    id: updatedInventory.id,
    productId: updatedInventory.productId,
    productCode: updatedInventory.product.productCode,
    productName: updatedInventory.product.name,
    unit: updatedInventory.product.unit,
    physicalQuantity: updatedInventory.physicalQuantity,
    reservedQuantity: updatedInventory.reservedQuantity,
    availableQuantity:
      updatedInventory.physicalQuantity -
      updatedInventory.reservedQuantity,
  };
}