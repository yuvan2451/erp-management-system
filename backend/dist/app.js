"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
/**
 * Express Application Setup
 *
 * Architectural Note:
 * We separate the Express app configuration (app.ts) from the HTTP server lifecycle (server.ts).
 * This allows the application instance to be imported into testing harnesses (like Supertest)
 * to run API integration tests without binding to a live network port or causing port conflicts.
 */
const app = (0, express_1.default)();
/**
 * Request Parsing Middleware
 *
 * Incoming ERP client requests (e.g., creating orders, managing inventory) predominantly send
 * payloads in JSON format. express.json() parses incoming JSON request bodies into req.body.
 */
app.use(express_1.default.json());
/**
 * Health Check Endpoint
 *
 * Why this exists:
 * The health endpoint provides an automated liveness check for monitoring tools, container
 * orchestrators (such as Docker or Kubernetes), and load balancers to determine if the backend
 * process is alive, healthy, and ready to accept incoming traffic.
 */
app.get('/api/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'ERP API is running',
    });
});
exports.default = app;
