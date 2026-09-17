import apiClient from "./client";
import type { Customer } from "../types/enquiry";

interface CustomerResponse {
  success: boolean;
  data: Customer;
}

/**
 * Creates a new customer using the protected customer API.
 */
export async function createCustomer(input: {
  name: string;
  email?: string;
  phone?: string;
}): Promise<Customer> {
  const response = await apiClient.post<CustomerResponse>(
    "/customers",
    input,
  );

  return response.data.data;
}