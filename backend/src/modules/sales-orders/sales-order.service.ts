import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

/**
 * Generates the next Sales Order number.
 */
async function generateSalesOrderNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const latestOrder = await tx.salesOrder.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      orderNumber: true,
    },
  });

  if (!latestOrder) {
    return "SO-000001";
  }

  const lastNumber = Number(
    latestOrder.orderNumber.replace("SO-", ""),
  );

  const nextNumber = Number.isNaN(lastNumber)
    ? 1
    : lastNumber + 1;

  return `SO-${String(nextNumber).padStart(6, "0")}`;
}

/**
 * Convert an ACCEPTED quotation into a Sales Order.
 *
 * Important:
 * Inventory is NOT reserved during conversion.
 * The Sales Order starts in PENDING status.
 */
export async function convertQuotationToSalesOrder(
  quotationId: string,
) {
  const trimmedQuotationId = quotationId.trim();

  if (!trimmedQuotationId) {
    throw new Error("Quotation ID is required");
  }

  return prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUnique({
      where: {
        id: trimmedQuotationId,
      },
      include: {
        customer: true,
        enquiry: true,
        items: {
          include: {
            product: true,
          },
        },
        salesOrder: true,
      },
    });

    if (!quotation) {
      throw new Error("Quotation not found");
    }

    if (quotation.status !== "ACCEPTED") {
      throw new Error(
        "Only accepted quotations can be converted to a Sales Order",
      );
    }

    if (quotation.salesOrder) {
      throw new Error(
        "A Sales Order already exists for this quotation",
      );
    }

    if (quotation.items.length === 0) {
      throw new Error(
        "Quotation must contain at least one item",
      );
    }

    const orderNumber = await generateSalesOrderNumber(tx);

    const salesOrder = await tx.salesOrder.create({
      data: {
        orderNumber,
        quotationId: quotation.id,
        customerId: quotation.customerId,
        totalAmount: quotation.totalAmount,
        status: "PENDING",

        items: {
          create: quotation.items.map((item) => ({
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineAmount: item.lineAmount,

            product: {
              connect: {
                id: item.productId,
              },
            },
          })),
        },
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
      },
    });

    return salesOrder;
  });
}

/**
 * Confirm a pending Sales Order and reserve inventory.
 *
 * Business rules:
 *
 * 1. Sales Order must exist.
 * 2. Sales Order must be PENDING.
 * 3. Every product must have an inventory record.
 * 4. Available stock must be enough for the order.
 * 5. Reserved quantity is increased.
 * 6. Physical quantity is NOT decreased.
 * 7. Sales Order changes to CONFIRMED.
 *
 * All inventory changes and the Sales Order status change
 * happen inside one database transaction.
 *
 * PostgreSQL row-level locks are used to prevent two
 * simultaneous confirmations from reserving the same stock.
 */
export async function confirmSalesOrder(
  salesOrderId: string,
) {
  const trimmedSalesOrderId = salesOrderId.trim();

  if (!trimmedSalesOrderId) {
    throw new Error("Sales Order ID is required");
  }

  return prisma.$transaction(async (tx) => {
    // -------------------------------------------------------
    // Lock the Sales Order row.
    //
    // This prevents conflicting updates to the same order
    // while its inventory reservation is being processed.
    // -------------------------------------------------------

    const lockedOrderRows = await tx.$queryRaw<
      Array<{ id: string }>
    >(
      Prisma.sql`
        SELECT id
        FROM "SalesOrder"
        WHERE id = ${trimmedSalesOrderId}
        FOR UPDATE
      `,
    );

    if (lockedOrderRows.length === 0) {
      throw new Error("Sales Order not found");
    }

    // -------------------------------------------------------
    // Fetch the Sales Order and its items.
    // -------------------------------------------------------

    const salesOrder = await tx.salesOrder.findUnique({
      where: {
        id: trimmedSalesOrderId,
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
      },
    });

    if (!salesOrder) {
      throw new Error("Sales Order not found");
    }

    // -------------------------------------------------------
    // Only PENDING orders can be confirmed.
    // -------------------------------------------------------

    if (salesOrder.status !== "PENDING") {
      throw new Error(
        "Only PENDING Sales Orders can be confirmed",
      );
    }

    if (salesOrder.items.length === 0) {
      throw new Error(
        "Sales Order must contain at least one item",
      );
    }

    // -------------------------------------------------------
    // Lock inventory rows in a consistent order.
    //
    // Sorting product IDs prevents two transactions from
    // locking the same set of rows in different orders,
    // reducing the risk of deadlocks.
    // -------------------------------------------------------

    const sortedItems = [...salesOrder.items].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    );

    const inventoryRecords = new Map<
      string,
      {
        id: string;
        productId: string;
        physicalQuantity: number;
        reservedQuantity: number;
      }
    >();

    // -------------------------------------------------------
    // Lock each inventory row before checking availability.
    // -------------------------------------------------------

    for (const item of sortedItems) {
      const inventoryRows = await tx.$queryRaw<
        Array<{
          id: string;
          productId: string;
          physicalQuantity: number;
          reservedQuantity: number;
        }>
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

      if (inventoryRows.length === 0) {
        throw new Error(
          `Inventory record not found for product ${item.product.productCode}`,
        );
      }

      const inventory = inventoryRows[0];

      inventoryRecords.set(item.productId, inventory);
    }

    // -------------------------------------------------------
    // Check availability for every item BEFORE changing
    // any inventory.
    //
    // available = physical - reserved
    // -------------------------------------------------------

    for (const item of salesOrder.items) {
      const inventory = inventoryRecords.get(item.productId);

      if (!inventory) {
        throw new Error(
          `Inventory record not found for product ${item.product.productCode}`,
        );
      }

      const availableQuantity =
        inventory.physicalQuantity -
        inventory.reservedQuantity;

      if (item.quantity > availableQuantity) {
        throw new Error(
          `Insufficient inventory for ${item.product.productCode}. ` +
          `Available: ${availableQuantity}, Requested: ${item.quantity}`,
        );
      }
    }

    // -------------------------------------------------------
    // Reserve inventory.
    //
    // Physical quantity stays unchanged.
    // Only reserved quantity increases.
    // -------------------------------------------------------

    for (const item of salesOrder.items) {
      const inventory = inventoryRecords.get(item.productId);

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
          reservedQuantity:
            inventory.reservedQuantity + item.quantity,
        },
      });
    }

    // -------------------------------------------------------
    // Change Sales Order status to CONFIRMED.
    // -------------------------------------------------------

    const confirmedOrder = await tx.salesOrder.update({
      where: {
        id: salesOrder.id,
      },

      data: {
        status: "CONFIRMED",
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

    return confirmedOrder;
  });
}

/**
 * Get all Sales Orders.
 */
export async function getSalesOrders() {
  return prisma.salesOrder.findMany({
    orderBy: {
      createdAt: "desc",
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
}

/**
 * Get a single Sales Order by ID.
 */
export async function getSalesOrderById(id: string) {
  const salesOrder = await prisma.salesOrder.findUnique({
    where: {
      id,
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

  return salesOrder;
}