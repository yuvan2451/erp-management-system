import { describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app";

describe("Sales Order conversion rules", () => {
  let salesToken: string;
  let customerId: string;
  let productId: string;
  let enquiryId: string;
  let quotationId: string;

  // ---------------------------------------------------------
  // 1. LOGIN
  // ---------------------------------------------------------

  it("should login as SALES_USER", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "sales@erp.local",
        password: "Sales@123",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeDefined();

    salesToken = response.body.data.token;
  });

  // ---------------------------------------------------------
  // 2. CREATE CUSTOMER
  // ---------------------------------------------------------

  it("should create a customer for the sales order test", async () => {
    const timestamp = Date.now();

    const response = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        name: `Sales Order Test Customer ${timestamp}`,
        email: `sales-order-test-${timestamp}@example.com`,
        phone: "9111111111",
        address: "Bengaluru, Karnataka",
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toBeDefined();

    customerId = response.body.data.id;

    expect(customerId).toBeDefined();
  });

  // ---------------------------------------------------------
  // 3. FIND PRODUCT
  // ---------------------------------------------------------

  it("should find a seeded product", async () => {
    const response = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${salesToken}`);

    expect(response.status).toBe(200);

    const products = response.body.data;

    expect(Array.isArray(products)).toBe(true);

    const motor = products.find(
      (product: { productCode: string }) =>
        product.productCode === "IND-MOT-001",
    );

    expect(motor).toBeDefined();

    productId = motor.id;

    expect(productId).toBeDefined();
  });

  // ---------------------------------------------------------
  // 4. CREATE ENQUIRY
  // ---------------------------------------------------------

  it("should create an enquiry", async () => {
    const response = await request(app)
      .post("/api/enquiries")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        customerId,
        requiredDate: "2026-12-31",
        notes: "Automated Sales Order conversion test",
        items: [
          {
            productId,
            quantity: 2,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toBeDefined();

    enquiryId = response.body.data.id;

    expect(enquiryId).toBeDefined();
  });

  // ---------------------------------------------------------
  // 5. CREATE QUOTATION
  // ---------------------------------------------------------

  it("should create a DRAFT quotation", async () => {
    const response = await request(app)
      .post("/api/quotations")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        enquiryId,
        validUntil: "2027-01-31",
        items: [
          {
            productId,
            quantity: 2,
            unitPrice: 24500,
            discountPercent: 0,
            gstPercent: 18,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.quotation).toBeDefined();

    quotationId = response.body.quotation.id;

    expect(quotationId).toBeDefined();

    // New quotations must start in DRAFT status.
    expect(response.body.quotation.status).toBe("DRAFT");
  });

  // ---------------------------------------------------------
  // 6. DRAFT → SALES ORDER MUST FAIL
  // ---------------------------------------------------------

  it("should reject conversion of a DRAFT quotation", async () => {
    const response = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set("Authorization", `Bearer ${salesToken}`);

    /*
     * A quotation must be ACCEPTED before it can generate
     * a Sales Order.
     */
    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
  "Only accepted quotations can be converted to a Sales Order",
);
  });

  // ---------------------------------------------------------
  // 7. DRAFT → SENT
  // ---------------------------------------------------------

  it("should move the quotation from DRAFT to SENT", async () => {
    const response = await request(app)
      .patch(`/api/quotations/${quotationId}/status`)
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        status: "SENT",
      });

    expect(response.status).toBe(200);

    expect(response.body.quotation).toBeDefined();
    expect(response.body.quotation.status).toBe("SENT");
  });

  // ---------------------------------------------------------
  // 8. SENT → REJECTED
  // ---------------------------------------------------------

  it("should move the quotation from SENT to REJECTED", async () => {
    const response = await request(app)
      .patch(`/api/quotations/${quotationId}/status`)
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        status: "REJECTED",
      });

    expect(response.status).toBe(200);

    expect(response.body.quotation).toBeDefined();
    expect(response.body.quotation.status).toBe("REJECTED");
  });

  // ---------------------------------------------------------
  // 9. REJECTED → SALES ORDER MUST FAIL
  // ---------------------------------------------------------

  it("should reject conversion of a REJECTED quotation", async () => {
    const response = await request(app)
      .post(`/api/quotations/${quotationId}/convert`)
      .set("Authorization", `Bearer ${salesToken}`);

    /*
     * Even though the quotation previously reached SENT,
     * once it is REJECTED it must not create a Sales Order.
     */
    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
  "Only accepted quotations can be converted to a Sales Order",
);
  });
});