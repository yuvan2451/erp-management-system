import { Request, Response } from "express";

import {
  createDispatch,
  getDispatchById,
  getDispatches,
} from "./dispatch.service";

/**
 * Create a dispatch for a Sales Order.
 *
 * The Sales Order ID comes from the URL:
 * POST /api/sales-orders/:id/dispatch
 *
 * Only ADMIN users can perform this operation.
 */
export async function createDispatchController(
  req: Request,
  res: Response,
) {
  try {
    const salesOrderId = req.params.id;
    const {
      vehicleNumber,
      driverName,
      dispatchDate,
      notes,
    } = req.body;

    // Validate Sales Order ID from URL.
    if (
      typeof salesOrderId !== "string" ||
      salesOrderId.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Sales Order ID is required",
      });
    }

    // Validate vehicle number.
    if (
      typeof vehicleNumber !== "string" ||
      vehicleNumber.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Vehicle number is required",
      });
    }

    // Validate driver name.
    if (
      typeof driverName !== "string" ||
      driverName.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Driver name is required",
      });
    }

    // Validate optional dispatch date.
    if (dispatchDate !== undefined) {
      if (typeof dispatchDate !== "string") {
        return res.status(400).json({
          message: "Dispatch date must be a valid date string",
        });
      }

      const parsedDate = new Date(dispatchDate);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          message: "Dispatch date must be a valid date string",
        });
      }
    }

    // Validate optional notes.
    if (
      notes !== undefined &&
      notes !== null &&
      typeof notes !== "string"
    ) {
      return res.status(400).json({
        message: "Notes must be a string",
      });
    }

    const dispatch = await createDispatch({
      salesOrderId: salesOrderId.trim(),
      vehicleNumber: vehicleNumber.trim(),
      driverName: driverName.trim(),
      dispatchDate,
      notes,
    });

    return res.status(201).json({
      message: "Dispatch created successfully",
      dispatch,
    });
  } catch (error) {
    console.error("Create Dispatch error:", error);

    if (error instanceof Error) {
      const businessErrors = [
        "Sales Order ID is required",
        "Vehicle number is required",
        "Driver name is required",
        "Sales Order not found",
        "Only CONFIRMED Sales Orders can be dispatched",
        "A dispatch already exists for this Sales Order",
        "Sales Order must contain at least one item",
        "Inventory record not found",
        "Cannot dispatch",
      ];

      const isBusinessError = businessErrors.some((message) =>
        error.message.includes(message),
      );

      if (isBusinessError) {
        return res.status(400).json({
          message: error.message,
        });
      }
    }

    return res.status(500).json({
      message: "Failed to create dispatch",
    });
  }
}

/**
 * Get all dispatches.
 */
export async function getDispatchesController(
  _req: Request,
  res: Response,
) {
  try {
    const dispatches = await getDispatches();

    return res.status(200).json({
      dispatches,
    });
  } catch (error) {
    console.error("Get Dispatches error:", error);

    return res.status(500).json({
      message: "Failed to fetch dispatches",
    });
  }
}

/**
 * Get a single dispatch by ID.
 */
export async function getDispatchByIdController(
  req: Request,
  res: Response,
) {
  try {
    const dispatchId = req.params.id;

    if (
      typeof dispatchId !== "string" ||
      dispatchId.trim().length === 0
    ) {
      return res.status(400).json({
        message: "Dispatch ID is required",
      });
    }

    const dispatch = await getDispatchById(dispatchId.trim());

    return res.status(200).json({
      dispatch,
    });
  } catch (error) {
    console.error("Get Dispatch by ID error:", error);

    if (
      error instanceof Error &&
      error.message === "Dispatch not found"
    ) {
      return res.status(404).json({
        message: "Dispatch not found",
      });
    }

    return res.status(500).json({
      message: "Failed to fetch dispatch",
    });
  }
}