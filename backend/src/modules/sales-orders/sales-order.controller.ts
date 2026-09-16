import { Request, Response } from "express";

import {
  confirmSalesOrder,
  convertQuotationToSalesOrder,
  getSalesOrderById,
  getSalesOrders,
} from "./sales-order.service";

/**
 * Convert an accepted quotation into a Sales Order.
 */
export async function convertQuotationToSalesOrderController(
  req: Request,
  res: Response,
) {
  try {
    const quotationId = req.params.id;

    if (
      typeof quotationId !== "string" ||
      quotationId.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Quotation ID is required",
      });
    }

    const salesOrder =
      await convertQuotationToSalesOrder(
        quotationId.trim(),
      );

    return res.status(201).json({
      message:
        "Quotation converted to Sales Order successfully",
      salesOrder,
    });
  } catch (error) {
    console.error(
      "Convert quotation to Sales Order error:",
      error,
    );

    if (error instanceof Error) {
      const businessErrors = [
        "Quotation ID is required",
        "Quotation not found",
        "Only accepted quotations can be converted to a Sales Order",
        "A Sales Order already exists for this quotation",
        "Quotation must contain at least one item",
      ];

      const isBusinessError = businessErrors.some(
        (message) => error.message.includes(message),
      );

      if (isBusinessError) {
        return res.status(400).json({
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      message:
        "Failed to convert quotation to Sales Order",
    });
  }
}

/**
 * Confirm a Sales Order.
 *
 * This operation is ADMIN-only at the route level.
 *
 * Confirmation:
 * - changes PENDING → CONFIRMED
 * - reserves inventory
 * - does NOT reduce physical stock
 */
export async function confirmSalesOrderController(
  req: Request,
  res: Response,
) {
  try {
    const salesOrderId = req.params.id;

    if (
      typeof salesOrderId !== "string" ||
      salesOrderId.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Sales Order ID is required",
      });
    }

    const salesOrder = await confirmSalesOrder(
      salesOrderId.trim(),
    );

    return res.status(200).json({
      message: "Sales Order confirmed successfully",
      salesOrder,
    });
  } catch (error) {
    console.error(
      "Confirm Sales Order error:",
      error,
    );

    if (error instanceof Error) {
      const businessErrors = [
        "Sales Order ID is required",
        "Sales Order not found",
        "Only PENDING Sales Orders can be confirmed",
        "Sales Order must contain at least one item",
        "Inventory record not found",
        "Insufficient inventory",
      ];

      const isBusinessError = businessErrors.some(
        (message) => error.message.includes(message),
      );

      if (isBusinessError) {
        return res.status(400).json({
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      message:
        "Failed to confirm Sales Order",
    });
  }
}

/**
 * Get all Sales Orders.
 */
export async function getSalesOrdersController(
  _req: Request,
  res: Response,
) {
  try {
    const salesOrders = await getSalesOrders();

    return res.status(200).json({
      salesOrders,
    });
  } catch (error) {
    console.error(
      "Get Sales Orders error:",
      error,
    );

    return res.status(500).json({
      message: "Failed to fetch Sales Orders",
    });
  }
}

/**
 * Get one Sales Order by ID.
 */
export async function getSalesOrderByIdController(
  req: Request,
  res: Response,
) {
  try {
    const salesOrderId = req.params.id;

    if (
      typeof salesOrderId !== "string" ||
      salesOrderId.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Sales Order ID is required",
      });
    }

    const salesOrder =
      await getSalesOrderById(
        salesOrderId.trim(),
      );

    return res.status(200).json({
      salesOrder,
    });
  } catch (error) {
    console.error(
      "Get Sales Order by ID error:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "Sales Order not found"
    ) {
      return res.status(404).json({
        message: "Sales Order not found",
      });
    }

    return res.status(500).json({
      message: "Failed to fetch Sales Order",
    });
  }
}