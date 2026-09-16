import express, { Application, Request, Response } from 'express';
import authRouter from './modules/auth/auth.routes';
import customerRouter from './modules/customers/customer.routes';
import enquiryRouter from './modules/enquiries/enquiry.routes';
import productRouter from './modules/products/product.routes';
import inventoryRouter from './modules/inventory/inventory.routes';
import quotationRouter from './modules/quotations/quotation.routes';
import salesOrderRouter from './modules/sales-orders/sales-order.routes';
/**
 * Express Application Setup
 *
 * Architectural Note:
 * We separate the Express app configuration (app.ts) from the HTTP server lifecycle (server.ts).
 * This allows the application instance to be imported into testing harnesses (like Supertest)
 * to run API integration tests without binding to a live network port or causing port conflicts.
 */
const app: Application = express();

/**
 * Request Parsing Middleware
 *
 * Incoming ERP client requests (e.g., creating orders, managing inventory) predominantly send
 * payloads in JSON format. express.json() parses incoming JSON request bodies into req.body.
 */
app.use(express.json());

/**
 * Authentication Routes
 *
 * The authentication router exposes the public login endpoint.
 * Login itself does not require a JWT because it is the endpoint
 * that creates the JWT after validating the user's credentials.
 */
app.use('/api/auth', authRouter);
app.use('/api/customers', customerRouter);
app.use('/api/enquiries', enquiryRouter);
app.use('/api/products', productRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/quotations', quotationRouter);
app.use('/api/sales-orders', salesOrderRouter);
console.log('Sales Order router registered');
/**
 * Health Check Endpoint
 *
 * Why this exists:
 * The health endpoint provides an automated liveness check for monitoring tools, container
 * orchestrators (such as Docker or Kubernetes), and load balancers to determine if the backend
 * process is alive, healthy, and ready to accept incoming traffic.
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'ERP API is running',
  });
});

export default app;