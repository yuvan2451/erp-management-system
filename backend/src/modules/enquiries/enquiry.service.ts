import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

/**
 * Represents one product requested in an enquiry.
 */
export interface EnquiryItemInput {
  productId: string;
  quantity: number;
}

/**
 * Data required to create an enquiry.
 *
 * createdById comes from the authenticated JWT user and is never
 * accepted directly from the frontend request body.
 */
export interface CreateEnquiryInput {
  customerId: string;
  requiredDate: string;
  notes?: string;
  items: EnquiryItemInput[];
  createdById: string;
}

/**
 * Generates the next enquiry number using a PostgreSQL sequence.
 *
 * The sequence is managed by PostgreSQL and is concurrency-safe.
 * This prevents two simultaneous requests from generating the
 * same enquiry number.
 *
 * Example:
 *
 * PostgreSQL sequence value: 6
 * Generated enquiry number:  ENQ-000006
 */
async function generateEnquiryNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const result = await tx.$queryRaw<
    Array<{ nextNumber: bigint }>
  >(
    Prisma.sql`
      SELECT nextval('enquiry_number_seq') AS "nextNumber"
    `,
  );

  if (!result[0]) {
    throw new Error("Unable to generate enquiry number");
  }

  const nextNumber = Number(result[0].nextNumber);

  return `ENQ-${String(nextNumber).padStart(6, "0")}`;
}

/**
 * Creates an enquiry and all of its product lines in one transaction.
 *
 * If any validation or database operation fails, the transaction
 * is rolled back so we never create a partially completed enquiry.
 */
export async function createEnquiry(
  input: CreateEnquiryInput,
) {
  const customerId = input.customerId.trim();

  if (!customerId) {
    throw new Error("Customer is required");
  }

  if (!input.createdById) {
    throw new Error("Authenticated user is required");
  }

  if (!input.requiredDate) {
    throw new Error("Required date is required");
  }

  const requiredDate = new Date(input.requiredDate);

  if (Number.isNaN(requiredDate.getTime())) {
    throw new Error("Invalid required date");
  }

  if (input.items.length === 0) {
    throw new Error(
      "At least one enquiry item is required",
    );
  }

  /**
   * Prevent the same product from appearing multiple times
   * in one enquiry.
   */
  const productIds = input.items.map(
    (item) => item.productId,
  );

  if (
    new Set(productIds).size !== productIds.length
  ) {
    throw new Error(
      "Duplicate products are not allowed in an enquiry",
    );
  }

  /**
   * Every enquiry item must have a valid product and
   * a quantity greater than zero.
   */
  for (const item of input.items) {
    if (!item.productId?.trim()) {
      throw new Error(
        "Product is required for every enquiry item",
      );
    }

    if (
      typeof item.quantity !== "number" ||
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error(
        "Quantity must be greater than zero for every enquiry item",
      );
    }
  }

  /**
   * The enquiry and all its items are created inside one
   * database transaction.
   */
  return prisma.$transaction(async (tx) => {
    /**
     * Verify that the referenced customer exists.
     */
    const customer = await tx.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    /**
     * Verify that every requested product exists.
     */
    const products = await tx.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new Error(
        "One or more products were not found",
      );
    }

    /**
     * Generate the enquiry number using the PostgreSQL
     * sequence. This is safe for concurrent requests.
     */
    const enquiryNumber =
      await generateEnquiryNumber(tx);

    /**
     * Create the parent enquiry and all child enquiry items
     * together.
     */
    return tx.enquiry.create({
      data: {
        enquiryNumber,
        customerId,

        // Store the authenticated user who created the enquiry.
        createdById: input.createdById,

        requiredDate,
        notes: input.notes?.trim() || undefined,

        // NEW is the initial enquiry status.
        status: "NEW",

        items: {
          create: input.items.map((item) => ({
            productId: item.productId.trim(),
            quantity: item.quantity,
          })),
        },
      },

      /**
       * Return related customer and product information so
       * the frontend receives a complete enquiry response.
       */
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  });
}

/**
 * Returns all enquiries with their customer and product information.
 */
export async function getEnquiries() {
  return prisma.enquiry.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

/**
 * Returns one enquiry by its database ID.
 */
export async function getEnquiryById(
  id: string,
) {
  const enquiry = await prisma.enquiry.findUnique({
    where: {
      id,
    },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!enquiry) {
    throw new Error("Enquiry not found");
  }

  return enquiry;
}