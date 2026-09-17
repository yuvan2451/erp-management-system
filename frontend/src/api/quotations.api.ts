import apiClient from "./client";
import type {
  CreateQuotationInput,
  Quotation,
  QuotationStatus,
} from "../types/quotation";

interface QuotationsResponse {
  success: boolean;
  data?: Quotation[];
  quotations?: Quotation[];
}

interface QuotationResponse {
  success: boolean;
  quotation?: Quotation;
  data?: Quotation;
  message?: string;
}

interface UpdateQuotationStatusResponse {
  success: boolean;
  quotation?: Quotation;
  data?: Quotation;
  message?: string;
}

interface ConvertQuotationResponse {
  success: boolean;
  salesOrder?: unknown;
  data?: unknown;
  message?: string;
}

/**
 * Fetch all quotations.
 *
 * The backend is the source of truth for quotation data.
 * We accept the supported response property used by the API
 * and always return an array to the React page.
 */
export async function getQuotations(): Promise<Quotation[]> {
  const response =
    await apiClient.get<QuotationsResponse>(
      "/quotations",
    );

  return (
    response.data.data ??
    response.data.quotations ??
    []
  );
}

/**
 * Fetch one quotation by ID.
 */
export async function getQuotationById(
  id: string,
): Promise<Quotation> {
  const response =
    await apiClient.get<QuotationResponse>(
      `/quotations/${id}`,
    );

  const quotation =
    response.data.quotation ??
    response.data.data;

  if (!quotation) {
    throw new Error(
      "Quotation was not returned by the server.",
    );
  }

  return quotation;
}

/**
 * Create a new quotation.
 *
 * The backend calculates and validates all monetary
 * values before storing the quotation.
 */
export async function createQuotation(
  input: CreateQuotationInput,
): Promise<Quotation> {
  const response =
    await apiClient.post<QuotationResponse>(
      "/quotations",
      input,
    );

  const quotation =
    response.data.quotation ??
    response.data.data;

  if (!quotation) {
    throw new Error(
      "Quotation was not returned after creation.",
    );
  }

  return quotation;
}

/**
 * Update the quotation workflow status.
 *
 * Supported workflow actions:
 * DRAFT -> SENT
 * SENT -> ACCEPTED
 * SENT -> REJECTED
 */
export async function updateQuotationStatus(
  id: string,
  status: Extract<
    QuotationStatus,
    "SENT" | "ACCEPTED" | "REJECTED"
  >,
): Promise<Quotation> {
  const response =
    await apiClient.patch<UpdateQuotationStatusResponse>(
      `/quotations/${id}/status`,
      { status },
    );

  const quotation =
    response.data.quotation ??
    response.data.data;

  if (!quotation) {
    throw new Error(
      "Updated quotation was not returned by the server.",
    );
  }

  return quotation;
}

/**
 * Convert an accepted quotation into a Sales Order.
 *
 * Inventory reservation does NOT happen here.
 * Reservation happens later when an Admin confirms
 * the Sales Order.
 */
export async function convertQuotation(
  id: string,
): Promise<ConvertQuotationResponse> {
  const response =
    await apiClient.post<ConvertQuotationResponse>(
      `/quotations/${id}/convert`,
    );

  return response.data;
}