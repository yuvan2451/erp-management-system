import apiClient from "./client";

import type {
  CreateDispatchInput,
  Dispatch,
  Inventory,
  SalesOrder,
} from "../types/sales-order";

interface SalesOrdersResponse {
  success: boolean;
  data?: SalesOrder[];
  salesOrders?: SalesOrder[];
}

interface SalesOrderResponse {
  success: boolean;
  data?: SalesOrder;
  salesOrder?: SalesOrder;
  message?: string;
}

interface InventoryResponse {
  success: boolean;
  data?: Inventory[];
  inventory?: Inventory[];
}

interface DispatchResponse {
  success: boolean;
  data?: Dispatch;
  dispatch?: Dispatch;
  salesOrder?: SalesOrder;
  message?: string;
}

/**
 * Get all Sales Orders visible to the logged-in user.
 */
export async function getSalesOrders(): Promise<
  SalesOrder[]
> {
  const response =
    await apiClient.get<SalesOrdersResponse>(
      "/sales-orders",
    );

  return (
    response.data.data ??
    response.data.salesOrders ??
    []
  );
}

/**
 * Get a single Sales Order with its related
 * quotation, customer, items and dispatches.
 */
export async function getSalesOrderById(
  id: string,
): Promise<SalesOrder> {
  const response =
    await apiClient.get<SalesOrderResponse>(
      `/sales-orders/${id}`,
    );

  const salesOrder =
    response.data.salesOrder ??
    response.data.data;

  if (!salesOrder) {
    throw new Error(
      "Sales Order was not returned by the server.",
    );
  }

  return salesOrder;
}

/**
 * Confirm a PENDING Sales Order.
 *
 * This operation is ADMIN-only on the backend.
 *
 * The backend transaction checks inventory availability
 * and increases reserved quantity safely.
 */
export async function confirmSalesOrder(
  id: string,
): Promise<SalesOrder> {
  const response =
    await apiClient.post<SalesOrderResponse>(
      `/sales-orders/${id}/confirm`,
    );

  const salesOrder =
    response.data.salesOrder ??
    response.data.data;

  if (!salesOrder) {
    throw new Error(
      "Confirmed Sales Order was not returned by the server.",
    );
  }

  return salesOrder;
}

/**
 * Create a dispatch for a CONFIRMED Sales Order.
 *
 * The backend validates the order status and inventory
 * reservation before reducing physical and reserved stock.
 */
export async function createDispatch(
  salesOrderId: string,
  input: CreateDispatchInput,
): Promise<DispatchResponse> {
  const response =
    await apiClient.post<DispatchResponse>(
      `/sales-orders/${salesOrderId}/dispatch`,
      input,
    );

  return response.data;
}

/**
 * Get inventory records.
 */
export async function getInventory(): Promise<
  Inventory[]
> {
  const response =
    await apiClient.get<InventoryResponse>(
      "/inventory",
    );

  return (
    response.data.data ??
    response.data.inventory ??
    []
  );
}