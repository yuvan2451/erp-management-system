import { prisma } from '../../lib/prisma';

/**
 * Data required to create a customer.
 *
 * Keeping this type separate from the Prisma model makes the service
 * independent from the exact shape of an HTTP request.
 */
export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

/**
 * Creates a new customer.
 *
 * Customer creation is kept inside the service layer so controllers
 * remain focused on HTTP request/response handling.
 */
export async function createCustomer(input: CreateCustomerInput) {
  const name = input.name.trim();

  // A customer without a name would not be useful in the ERP workflow.
  if (!name) {
    throw new Error('Customer name is required');
  }

  const email = input.email?.trim().toLowerCase() || undefined;
  const phone = input.phone?.trim() || undefined;
  const address = input.address?.trim() || undefined;

  /**
   * The Prisma schema/database constraints remain the final authority
   * for uniqueness and referential/data integrity.
   */
  return prisma.customer.create({
    data: {
      name,
      email,
      phone,
      address,
    },
  });
}

/**
 * Returns customers ordered by newest first.
 *
 * This will later support the enquiry screen when a sales user
 * needs to select an existing customer.
 */
export async function getCustomers() {
  return prisma.customer.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
}