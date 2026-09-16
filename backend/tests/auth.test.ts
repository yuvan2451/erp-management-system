import { describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app";

describe("Authentication and RBAC", () => {
  let adminToken: string;
  let salesToken: string;

  /**
   * Verify that ADMIN credentials return a JWT.
   */
  it("should login as ADMIN and return a JWT", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@erp.local",
        password: "Admin@123",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();

    adminToken = response.body.data.token;
  });

  /**
   * Verify that SALES_USER credentials return a JWT.
   */
  it("should login as SALES_USER and return a JWT", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "sales@erp.local",
        password: "Sales@123",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();

    salesToken = response.body.data.token;
  });

  /**
   * Protected endpoints must reject requests without authentication.
   */
  it("should reject a request without a JWT", async () => {
    const response = await request(app)
      .get("/api/inventory");

    expect(response.status).toBe(401);
  });

  /**
   * Invalid JWTs must be rejected.
   */
  it("should reject an invalid JWT", async () => {
    const response = await request(app)
      .get("/api/inventory")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
  });

  /**
   * ADMIN users can view inventory.
   */
  it("should allow ADMIN to view inventory", async () => {
    const response = await request(app)
      .get("/api/inventory")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
  });

  /**
   * SALES_USER users can view inventory.
   */
  it("should allow SALES_USER to view inventory", async () => {
    const response = await request(app)
      .get("/api/inventory")
      .set("Authorization", `Bearer ${salesToken}`);

    expect(response.status).toBe(200);
  });

  /**
   * Updating physical inventory is an ADMIN-only operation.
   *
   * SALES_USER should receive 403 Forbidden.
   */
  it("should reject SALES_USER from updating inventory", async () => {
    const response = await request(app)
      .patch(
        "/api/inventory/0eaaa568-89fe-473d-9723-3d1b0e62a67d",
      )
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        physicalQuantity: 81,
      });

    expect(response.status).toBe(403);
  });
});