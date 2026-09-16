import app from './app';

/**
 * Server Lifecycle & Networking Setup
 *
 * Architectural Note:
 * server.ts serves as the executable entry point for the backend service. It is responsible
 * for binding the configured Express application to a network socket. Decoupling this from
 * app.ts isolates environment-specific runtime concerns (port bindings, host listeners) from
 * application routing and middleware definitions.
 */

/**
 * Port Configuration
 *
 * In production environments (such as container platforms or cloud hosts), the runtime
 * environment dynamically assigns a PORT variable. We fallback to 5000 for local development
 * to provide a consistent, zero-configuration local developer experience.
 */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
