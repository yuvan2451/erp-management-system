import express, { Application, Request, Response } from 'express';

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
