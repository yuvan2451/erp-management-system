import { Request, Response } from "express";

import {
  createQuotation,
  getQuotationById,
  getQuotations,
  updateQuotationStatus,
} from "./quotation.service";

/**
 * Create a new quotation.
 *
 * POST /api/quotations
 */
export async function createQuotationController(
  req: Request,
  res: Response,
) {
  try {
    const {
      enquiryId,
      validUntil,
      items,
    } = req.body;

    // ---------------------------------------------------------
    // Authentication
    // ---------------------------------------------------------

    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // ---------------------------------------------------------
    // Validate enquiry ID
    // ---------------------------------------------------------

    if (
      typeof enquiryId !== "string" ||
      enquiryId.trim().length === 0
    ) {
      return res.status(400).json({
        message: "enquiryId is required",
      });
    }

    // ---------------------------------------------------------
    // Validate validUntil
    // ---------------------------------------------------------

    if (
      typeof validUntil !== "string" ||
      validUntil.trim().length === 0
    ) {
      return res.status(400).json({
        message: "validUntil is required",
      });
    }

    const validUntilDate =
      new Date(validUntil);

    if (
      Number.isNaN(
        validUntilDate.getTime(),
      )
    ) {
      return res.status(400).json({
        message:
          "validUntil must be a valid date",
      });
    }

    // ---------------------------------------------------------
    // Validate items
    // ---------------------------------------------------------

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          "At least one quotation item is required",
      });
    }

    // ---------------------------------------------------------
    // Validate every item
    // ---------------------------------------------------------

    for (const item of items) {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return res.status(400).json({
          message:
            "Each quotation item must be an object",
        });
      }

      // Product ID
      if (
        typeof item.productId !== "string" ||
        item.productId.trim().length === 0
      ) {
        return res.status(400).json({
          message:
            "productId is required for every quotation item",
        });
      }

      // Quantity
      if (
        !Number.isInteger(
          item.quantity,
        ) ||
        item.quantity <= 0
      ) {
        return res.status(400).json({
          message:
            "Quantity must be a positive integer for every quotation item",
        });
      }

      // Unit price
      if (
        typeof item.unitPrice !== "number" ||
        !Number.isFinite(
          item.unitPrice,
        ) ||
        item.unitPrice < 0
      ) {
        return res.status(400).json({
          message:
            "unitPrice must be a valid non-negative number for every quotation item",
        });
      }

      // Discount
      if (
        typeof item.discountPercent !==
          "number" ||
        !Number.isFinite(
          item.discountPercent,
        ) ||
        item.discountPercent < 0 ||
        item.discountPercent > 100
      ) {
        return res.status(400).json({
          message:
            "discountPercent must be between 0 and 100 for every quotation item",
        });
      }

      // GST
      if (
        typeof item.gstPercent !==
          "number" ||
        !Number.isFinite(
          item.gstPercent,
        ) ||
        item.gstPercent < 0 ||
        item.gstPercent > 100
      ) {
        return res.status(400).json({
          message:
            "gstPercent must be between 0 and 100 for every quotation item",
        });
      }
    }

    // ---------------------------------------------------------
    // Create quotation
    //
    // The service expects validUntil as a STRING.
    //
    // createdById comes from the authenticated JWT user,
    // not from the request body.
    // ---------------------------------------------------------

    const quotation =
      await createQuotation({
        enquiryId:
          enquiryId.trim(),

        validUntil:
          validUntil.trim(),

        items: items.map(
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
          }),
        ),

        createdById:
          req.user.userId,
      });

    return res.status(201).json({
      message:
        "Quotation created successfully",

      quotation,
    });
  } catch (error) {
    console.error(
      "Create quotation error:",
      error,
    );

    if (error instanceof Error) {
      const businessErrors = [
        "Enquiry is required",
        "Authenticated user is required",
        "Valid until date is required",
        "Invalid valid until date",
        "At least one quotation item is required",
        "Duplicate products are not allowed in a quotation",
        "Product is required for every quotation item",
        "Quantity must be a positive integer for every quotation item",
        "Unit price cannot be negative",
        "Discount percentage must be between 0 and 100",
        "GST percentage must be between 0 and 100",
        "Enquiry not found",
        "Cannot create quotation for a lost enquiry",
        "One or more products were not found",
      ];

      const isBusinessError =
        businessErrors.some(
          (message) =>
            error.message.includes(
              message,
            ),
        );

      if (isBusinessError) {
        return res.status(400).json({
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      message:
        "Failed to create quotation",
    });
  }
}

/**
 * Get all quotations.
 *
 * GET /api/quotations
 */
export async function getQuotationsController(
  req: Request,
  res: Response,
) {
  try {
    const quotations =
      await getQuotations();

    return res.status(200).json({
      quotations,
    });
  } catch (error) {
    console.error(
      "Get quotations error:",
      error,
    );

    return res.status(500).json({
      message:
        "Failed to fetch quotations",
    });
  }
}

/**
 * Get quotation by ID.
 *
 * GET /api/quotations/:id
 */
export async function getQuotationByIdController(
  req: Request,
  res: Response,
) {
  try {
    const quotationId =
      req.params.id;

    if (
      typeof quotationId !== "string" ||
      quotationId.trim().length === 0
    ) {
      return res.status(400).json({
        message:
          "Quotation ID is required",
      });
    }

    const quotation =
      await getQuotationById(
        quotationId.trim(),
      );

    return res.status(200).json({
      quotation,
    });
  } catch (error) {
    console.error(
      "Get quotation by ID error:",
      error,
    );

    if (
      error instanceof Error &&
      error.message ===
        "Quotation not found"
    ) {
      return res.status(404).json({
        message:
          "Quotation not found",
      });
    }

    return res.status(500).json({
      message:
        "Failed to fetch quotation",
    });
  }
}

/**
 * Update quotation status.
 *
 * PATCH /api/quotations/:id/status
 *
 * Allowed workflow:
 *
 * DRAFT → SENT
 * SENT → ACCEPTED
 * SENT → REJECTED
 */
export async function updateQuotationStatusController(
  req: Request,
  res: Response,
) {
  try {
    const quotationId =
      req.params.id;

    if (
      typeof quotationId !== "string" ||
      quotationId.trim().length === 0
    ) {
      return res.status(400).json({
        message:
          "Quotation ID is required",
      });
    }

    const { status } =
      req.body;

    if (
      typeof status !== "string" ||
      status.trim().length === 0
    ) {
      return res.status(400).json({
        message:
          "status is required",
      });
    }

    const normalizedStatus =
      status
        .trim()
        .toUpperCase();

    // ---------------------------------------------------------
    // Only these three statuses can be requested through
    // this endpoint.
    //
    // DRAFT is the initial status and is created automatically.
    // ---------------------------------------------------------

    if (
      normalizedStatus !== "SENT" &&
      normalizedStatus !==
        "ACCEPTED" &&
      normalizedStatus !==
        "REJECTED"
    ) {
      return res.status(400).json({
        message:
          "Invalid quotation status. Allowed values: SENT, ACCEPTED, REJECTED",
      });
    }

    const quotation =
      await updateQuotationStatus(
        quotationId.trim(),
        normalizedStatus,
      );

    return res.status(200).json({
      message:
        "Quotation status updated successfully",

      quotation,
    });
  } catch (error) {
    console.error(
      "Update quotation status error:",
      error,
    );

    if (error instanceof Error) {
      const businessErrors = [
        "Quotation not found",
        "Only draft quotations can be sent",
        "Only sent quotations can be accepted or rejected",
      ];

      const isBusinessError =
        businessErrors.some(
          (message) =>
            error.message.includes(
              message,
            ),
        );

      if (isBusinessError) {
        return res.status(400).json({
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      message:
        "Failed to update quotation status",
    });
  }
}