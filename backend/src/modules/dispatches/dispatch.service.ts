import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

interface CreateDispatchInput {
  salesOrderId: string;
  vehicleNumber: string;
  driverName: string;
  dispatchDate?: string;
  notes?: string | null;
}

/**
 * Generates the next Dispatch number.
 *
 * Example:
 * DSP-000001
 * DSP-000002
 */
async function generateDispatchNumber(tx: Prisma.TransactionClient) {
  const latestDispatch = await tx.dispatch.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      dispatchNumber: true,
    },
  });

  if (!latestDispatch) {
    return "DSP-000001";
  }

  const lastNumber = Number(
    latestDispatch.dispatchNumber.replace("DSP-", ""),
  );

  const nextNumber = lastNumber + 1;

  return `DSP-${String(nextNumber).padStart(6, "0")}`;
}

/**
 * Creates a Dispatch for a confirmed Sales Order.
 *
 * Business rules:
 * 1. Sales Order must exist.
 * 2. Sales Order must be CONFIRMED.
 * 3. A Sales Order cannot have multiple dispatches.
 * 4. Sales Order must contain at least one item.
 * 5. Inventory rows are locked before checking/updating stock.
 * 6. Dispatch quantity cannot exceed reserved quantity.
 * 7. Dispatch quantity cannot exceed physical quantity.
 * 8. Physical inventory decreases after dispatch.
 * 9. Reserved inventory decreases after dispatch.
 * 10. Sales Order becomes DISPATCHED.
 *
 * All changes happen inside one database transaction.
 */
export async function createDispatch(input: CreateDispatchInput) {
  if (!input.salesOrderId) {
    throw new Error("Sales Order ID is required");
  }

  if (!input.vehicleNumber.trim()) {
    throw new Error("Vehicle number is required");
  }

  if (!input.driverName.trim()) {
    throw new Error("Driver name is required");
  }

  return prisma.$transaction(async (tx) => {
    /**
     * Lock the Sales Order row.
     *
     * FOR UPDATE prevents two dispatch requests from
     * modifying the same Sales Order concurrently.
     */
    await tx.$queryRaw(
      Prisma.sql`
        SELECT id
        FROM "SalesOrder"
        WHERE id = ${input.salesOrderId}
        FOR UPDATE
      `,
    );

    /**
     * Fetch the latest Sales Order state after acquiring
     * the row lock.
     */
    const salesOrder = await tx.salesOrder.findUnique({
      where: {
        id: input.salesOrderId,
      },
      include: {
        customer: true,
        quotation: {
          include: {
            enquiry: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        dispatches: true,
      },
    });

    if (!salesOrder) {
      throw new Error("Sales Order not found");
    }

    /**
     * Only CONFIRMED Sales Orders can be dispatched.
     */
    if (salesOrder.status !== "CONFIRMED") {
      throw new Error(
        "Only CONFIRMED Sales Orders can be dispatched",
      );
    }

    /**
     * A Sales Order can have only one dispatch in this
     * implementation.
     */
    if (salesOrder.dispatches.length > 0) {
      throw new Error(
        "A dispatch already exists for this Sales Order",
      );
    }

    if (salesOrder.items.length === 0) {
      throw new Error(
        "Sales Order must contain at least one item",
      );
    }

    /**
     * Sort products consistently before locking inventory rows.
     *
     * This reduces the possibility of deadlocks when multiple
     * transactions reserve/dispatch multiple products.
     */
    const sortedItems = [...salesOrder.items].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    );

    /**
     * Lock every inventory row needed by this dispatch.
     */
    const inventoryRows = new Map<
      string,
      {
        id: string;
        productId: string;
        physicalQuantity: number;
        reservedQuantity: number;
      }
    >();

    for (const item of sortedItems) {
      const inventoryResult = await tx.$queryRaw<
        {
          id: string;
          productId: string;
          physicalQuantity: number;
          reservedQuantity: number;
        }[]
      >(
        Prisma.sql`
          SELECT
            id,
            "productId",
            "physicalQuantity",
            "reservedQuantity"
          FROM "Inventory"
          WHERE "productId" = ${item.productId}
          FOR UPDATE
        `,
      );

      if (inventoryResult.length === 0) {
        throw new Error(
          `Inventory record not found for product ${item.product.productCode}`,
        );
      }

      const inventory = inventoryResult[0];

      inventoryRows.set(item.productId, inventory);
    }

    /**
     * Validate all inventory before changing anything.
     *
     * This ensures that a failed dispatch does not partially
     * update some products.
     */
    for (const item of sortedItems) {
      const inventory = inventoryRows.get(item.productId);

      if (!inventory) {
        throw new Error(
          `Inventory record not found for product ${item.product.productCode}`,
        );
      }

      if (item.quantity > inventory.reservedQuantity) {
        throw new Error(
          `Cannot dispatch ${item.quantity} units of ${item.product.productCode}. Only ${inventory.reservedQuantity} units are reserved.`,
        );
      }

      if (item.quantity > inventory.physicalQuantity) {
        throw new Error(
          `Cannot dispatch ${item.quantity} units of ${item.product.productCode}. Only ${inventory.physicalQuantity} physical units are available.`,
        );
      }
    }

    /**
     * Update inventory.
     *
     * Dispatch consumes the reservation:
     *
     * physicalQuantity = physicalQuantity - dispatchedQuantity
     * reservedQuantity = reservedQuantity - dispatchedQuantity
     */
    for (const item of sortedItems) {
      const inventory = inventoryRows.get(item.productId);

      if (!inventory) {
        throw new Error(
          `Inventory record not found for product ${item.product.productCode}`,
        );
      }

      await tx.inventory.update({
        where: {
          id: inventory.id,
        },
        data: {
          physicalQuantity: {
            decrement: item.quantity,
          },
          reservedQuantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    /**
     * Generate a unique Dispatch number inside the transaction.
     */
    const dispatchNumber = await generateDispatchNumber(tx);

    /**
     * Create the Dispatch record.
     */
    const dispatch = await tx.dispatch.create({
      data: {
        dispatchNumber,

        salesOrder: {
          connect: {
            id: input.salesOrderId,
          },
        },

        dispatchDate: input.dispatchDate
          ? new Date(input.dispatchDate)
          : new Date(),

        vehicleNumber: input.vehicleNumber.trim(),

        driverName: input.driverName.trim(),

        notes:
          input.notes && input.notes.trim().length > 0
            ? input.notes.trim()
            : null,
      },
    });

    /**
     * Move the Sales Order to DISPATCHED.
     */
    await tx.salesOrder.update({
      where: {
        id: input.salesOrderId,
      },
      data: {
        status: "DISPATCHED",
      },
    });

    /**
     * Fetch the updated Sales Order.
     *
     * This is important because the object fetched earlier
     * still contains status = CONFIRMED.
     *
     * Returning this fresh record ensures the API response
     * correctly shows:
     *
     * CONFIRMED → DISPATCHED
     */
    const updatedSalesOrder = await tx.salesOrder.findUnique({
      where: {
        id: input.salesOrderId,
      },
      include: {
        customer: true,
        quotation: {
          include: {
            enquiry: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        dispatches: true,
      },
    });

    return {
      ...dispatch,
      salesOrder: updatedSalesOrder,
    };
  });
}

/**
 * Get all Dispatches.
 */
export async function getDispatches() {
  return prisma.dispatch.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      salesOrder: {
        include: {
          customer: true,
          quotation: {
            include: {
              enquiry: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
          dispatches: true,
        },
      },
    },
  });
}

/**
 * Get a Dispatch by ID.
 */
export async function getDispatchById(id: string) {
  const dispatch = await prisma.dispatch.findUnique({
    where: {
      id,
    },
    include: {
      salesOrder: {
        include: {
          customer: true,
          quotation: {
            include: {
              enquiry: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
          dispatches: true,
        },
      },
    },
  });

  if (!dispatch) {
    throw new Error("Dispatch not found");
  }

  return dispatch;
}