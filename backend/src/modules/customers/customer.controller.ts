import { Request, Response } from 'express';
import {
  createCustomer,
  getCustomers,
} from './customer.service';

/**
 * Handles POST /api/customers.
 *
 * The controller handles HTTP concerns and delegates customer
 * business logic to the service layer.
 */
export async function createCustomerController(
  req: Request,
  res: Response,
): Promise<void> {
  const { name, email, phone, address } = req.body;

  // Validate the basic request shape before calling the service.
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({
      success: false,
      message: 'Customer name is required',
    });
    return;
  }

  if (email !== undefined && typeof email !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Email must be a string',
    });
    return;
  }

  if (phone !== undefined && typeof phone !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Phone must be a string',
    });
    return;
  }

  if (address !== undefined && typeof address !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Address must be a string',
    });
    return;
  }

  try {
    const customer = await createCustomer({
      name,
      email,
      phone,
      address,
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    console.error('Create customer error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * Handles GET /api/customers.
 *
 * Returns customers so the enquiry workflow can later allow
 * a sales user to select an existing customer.
 */
export async function getCustomersController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const customers = await getCustomers();

    res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error('Get customers error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}