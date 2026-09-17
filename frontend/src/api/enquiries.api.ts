import apiClient from "./client";
import type {
  CreateEnquiryInput,
  Customer,
  Enquiry,
  Product,
} from "../types/enquiry";

interface EnquiriesResponse {
  success: boolean;
  data: Enquiry[];
}

interface EnquiryResponse {
  success: boolean;
  data: Enquiry;
}

interface CustomersResponse {
  success: boolean;
  data: Customer[];
}

interface ProductsResponse {
  success: boolean;
  data: Product[];
}

/**
 * Fetch all customers available to the logged-in user.
 */
export async function getCustomers(): Promise<Customer[]> {
  const response = await apiClient.get<CustomersResponse>("/customers");
  return response.data.data;
}

/**
 * Fetch Product Master records.
 */
export async function getProducts(): Promise<Product[]> {
  const response = await apiClient.get<ProductsResponse>("/products");
  return response.data.data;
}

/**
 * Fetch existing enquiries.
 */
export async function getEnquiries(): Promise<Enquiry[]> {
  const response = await apiClient.get<EnquiriesResponse>("/enquiries");
  return response.data.data;
}

/**
 * Create a new enquiry.
 *
 * The backend generates the enquiry number and initial status.
 */
export async function createEnquiry(
  input: CreateEnquiryInput,
): Promise<Enquiry> {
  const response = await apiClient.post<EnquiryResponse>(
    "/enquiries",
    input,
  );

  return response.data.data;
}