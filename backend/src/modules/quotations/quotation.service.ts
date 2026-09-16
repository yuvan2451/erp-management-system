import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

/**
 * Represents one product line in a quotation.
 */
export interface QuotationItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  gstPercent: number;
}

/**
 * Data required to create a quotation.
 *
 * createdById comes from the authenticated JWT user and is never
 * accepted directly from the frontend request body.
 */
export interface CreateQuotationInput {
  enquiryId: string;
  validUntil: string;
  items: QuotationItemInput[];
  createdById: string;
}

/**
 * Generates the next quotation number using a PostgreSQL sequence.
 *
 * PostgreSQL owns the counter, making number generation safe
 * when multiple quotation requests happen at the same time.
 *
 * Example:
 *
 * Sequence value: 4
 * Quotation number: QT-000004
 */
async function generateQuotationNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const result = await tx.$queryRaw<
    Array<{ nextNumber: bigint }>
  >(
    Prisma.sql`
      SELECT nextval('quotation_number_seq') AS "nextNumber"
    `,
  );

  if (!result[0]) {
    throw new Error("Unable to generate quotation number");
  }

  const nextNumber = Number(result[0].nextNumber);

  return `QT-${String(nextNumber).padStart(6, "0")}`;
}

/**
 * Calculates quotation totals on the backend.
 *
 * Gross Amount = Quantity × Unit Price
 *
 * Discount Amount =
 * Gross Amount × Discount %
 *
 * Amount After Discount =
 * Gross Amount - Discount Amount
 *
 * GST Amount =
 * Amount After Discount × GST %
 *
 * Line Amount =
 * Amount After Discount + GST Amount
 *
 * The frontend does not send trusted totals.
 * All financial calculations are performed here.
 */
function calculateQuotationTotals(
  items: QuotationItemInput[],
) {
  const calculatedItems = items.map((item) => {
    const grossAmount =
      item.quantity * item.unitPrice;

    const discountAmount =
      grossAmount *
      (item.discountPercent / 100);

    const amountAfterDiscount =
      grossAmount - discountAmount;

    const gstAmount =
      amountAfterDiscount *
      (item.gstPercent / 100);

    const lineAmount =
      amountAfterDiscount + gstAmount;

    return {
      ...item,
      lineAmount,
      discountAmount,
      gstAmount,
    };
  });

  const subtotal = calculatedItems.reduce(
    (total, item) =>
      total +
      item.quantity * item.unitPrice,
    0,
  );

  const discountAmount =
    calculatedItems.reduce(
      (total, item) =>
        total + item.discountAmount,
      0,
    );

  const taxAmount =
    calculatedItems.reduce(
      (total, item) =>
        total + item.gstAmount,
      0,
    );

  const totalAmount =
    subtotal -
    discountAmount +
    taxAmount;

  return {
    calculatedItems,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
  };
}

/**
 * Creates a quotation against an existing enquiry.
 */
export async function createQuotation(
  input: CreateQuotationInput,
) {
  const enquiryId = input.enquiryId.trim();

  if (!enquiryId) {
    throw new Error("Enquiry is required");
  }

  if (!input.createdById) {
    throw new Error(
      "Authenticated user is required",
    );
  }

  if (!input.validUntil) {
    throw new Error(
      "Valid until date is required",
    );
  }

  const validUntil = new Date(
    input.validUntil,
  );

  if (Number.isNaN(validUntil.getTime())) {
    throw new Error(
      "Invalid valid until date",
    );
  }

  if (
    !Array.isArray(input.items) ||
    input.items.length === 0
  ) {
    throw new Error(
      "At least one quotation item is required",
    );
  }

  // ---------------------------------------------------------
  // Check for duplicate products
  // ---------------------------------------------------------

  const productIds = input.items.map(
    (item) => item.productId.trim(),
  );

  if (
    new Set(productIds).size !==
    productIds.length
  ) {
    throw new Error(
      "Duplicate products are not allowed in a quotation",
    );
  }

  // ---------------------------------------------------------
  // Validate quotation items
  // ---------------------------------------------------------

  for (const item of input.items) {
    if (!item.productId?.trim()) {
      throw new Error(
        "Product is required for every quotation item",
      );
    }

    if (
      typeof item.quantity !== "number" ||
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0 ||
      !Number.isInteger(item.quantity)
    ) {
      throw new Error(
        "Quantity must be a positive integer for every quotation item",
      );
    }

    if (
      typeof item.unitPrice !== "number" ||
      !Number.isFinite(item.unitPrice) ||
      item.unitPrice < 0
    ) {
      throw new Error(
        "Unit price cannot be negative",
      );
    }

    if (
      typeof item.discountPercent !== "number" ||
      !Number.isFinite(
        item.discountPercent,
      ) ||
      item.discountPercent < 0 ||
      item.discountPercent > 100
    ) {
      throw new Error(
        "Discount percentage must be between 0 and 100",
      );
    }

    if (
      typeof item.gstPercent !== "number" ||
      !Number.isFinite(item.gstPercent) ||
      item.gstPercent < 0 ||
      item.gstPercent > 100
    ) {
      throw new Error(
        "GST percentage must be between 0 and 100",
      );
    }
  }

  // ---------------------------------------------------------
  // Calculate all financial values
  // ---------------------------------------------------------

  const totals =
    calculateQuotationTotals(input.items);

  // ---------------------------------------------------------
  // Database transaction
  // ---------------------------------------------------------

  return prisma.$transaction(async (tx) => {
    // -------------------------------------------------------
    // Verify enquiry
    // -------------------------------------------------------

    const enquiry =
      await tx.enquiry.findUnique({
        where: {
          id: enquiryId,
        },
        include: {
          customer: true,
        },
      });

    if (!enquiry) {
      throw new Error("Enquiry not found");
    }

    // A LOST enquiry cannot receive a quotation.
    if (enquiry.status === "LOST") {
      throw new Error(
        "Cannot create quotation for a lost enquiry",
      );
    }

    // -------------------------------------------------------
    // Verify products
    // -------------------------------------------------------

    const products =
      await tx.product.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
        select: {
          id: true,
        },
      });

    if (
      products.length !==
      productIds.length
    ) {
      throw new Error(
        "One or more products were not found",
      );
    }

    // -------------------------------------------------------
    // Generate quotation number
    // -------------------------------------------------------

    /**
     * Use the PostgreSQL sequence instead of:
     *
     * find latest quotation → +1
     *
     * This prevents duplicate quotation numbers when
     * multiple requests happen concurrently.
     */
    const quotationNumber =
      await generateQuotationNumber(tx);

    // -------------------------------------------------------
    // Create quotation and quotation items
    // -------------------------------------------------------

    const quotation =
      await tx.quotation.create({
        data: {
          quotationNumber,

          enquiryId,

          customerId:
            enquiry.customerId,

          createdById:
            input.createdById,

          validUntil,

          subtotal:
            totals.subtotal,

          discountAmount:
            totals.discountAmount,

          taxAmount:
            totals.taxAmount,

          totalAmount:
            totals.totalAmount,

          /**
           * New quotations always start as DRAFT.
           */
          status: "DRAFT",

          items: {
            create:
              totals.calculatedItems.map(
                (item) => ({
                  productId:
                    item.productId.trim(),

                  quantity:
                    item.quantity,

                  unitPrice:
                    item.unitPrice,

                  discountPercent:
                    item.discountPercent,

                  gstPercent:
                    item.gstPercent,

                  lineAmount:
                    item.lineAmount,
                }),
              ),
          },
        },

        include: {
          customer: true,

          enquiry: true,

          items: {
            include: {
              product: true,
            },
          },
        },
      });

    // -------------------------------------------------------
    // Update enquiry status
    //
    // NEW → QUOTED
    // -------------------------------------------------------

    if (enquiry.status === "NEW") {
      await tx.enquiry.update({
        where: {
          id: enquiryId,
        },
        data: {
          status: "QUOTED",
        },
      });
    }

    return quotation;
  });
}

/**
 * Returns all quotations.
 */
export async function getQuotations() {
  return prisma.quotation.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      customer: true,

      enquiry: true,

      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

/**
 * Returns one quotation by ID.
 */
export async function getQuotationById(
  id: string,
) {
  const quotation =
    await prisma.quotation.findUnique({
      where: {
        id,
      },

      include: {
        customer: true,

        enquiry: true,

        items: {
          include: {
            product: true,
          },
        },
      },
    });

  if (!quotation) {
    throw new Error(
      "Quotation not found",
    );
  }

  return quotation;
}

/**
 * Updates quotation status.
 *
 * Allowed workflow:
 *
 * DRAFT → SENT
 * SENT → ACCEPTED
 * SENT → REJECTED
 */
export async function updateQuotationStatus(
  id: string,
  newStatus:
    | "SENT"
    | "ACCEPTED"
    | "REJECTED",
) {
  const quotation =
    await prisma.quotation.findUnique({
      where: {
        id,
      },
    });

  if (!quotation) {
    throw new Error(
      "Quotation not found",
    );
  }

  // ---------------------------------------------------------
  // DRAFT → SENT
  // ---------------------------------------------------------

  if (
    newStatus === "SENT" &&
    quotation.status !== "DRAFT"
  ) {
    throw new Error(
      "Only draft quotations can be sent",
    );
  }

  // ---------------------------------------------------------
  // SENT → ACCEPTED / REJECTED
  // ---------------------------------------------------------

  if (
    (newStatus === "ACCEPTED" ||
      newStatus === "REJECTED") &&
    quotation.status !== "SENT"
  ) {
    throw new Error(
      "Only sent quotations can be accepted or rejected",
    );
  }

  // ---------------------------------------------------------
  // Update status
  // ---------------------------------------------------------

  return prisma.quotation.update({
    where: {
      id,
    },

    data: {
      status: newStatus,
    },

    include: {
      customer: true,

      enquiry: true,

      items: {
        include: {
          product: true,
        },
      },
    },
  });
}