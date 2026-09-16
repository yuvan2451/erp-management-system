import { describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app";

describe("Quotation calculations", () => {
  let salesToken: string;
  let customerId: string;
  let productMotorId: string;
  let productValveId: string;
  let enquiryId: string;

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

  it("should create a customer for the quotation test", async () => {
    const timestamp = Date.now();

    const response = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        name: `Quotation Test Customer ${timestamp}`,
        email: `quotation-test-${timestamp}@example.com`,
        phone: "9000000000",
        address: "Bengaluru, Karnataka",
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toBeDefined();

    customerId = response.body.data.id;

    expect(customerId).toBeDefined();
  });

  // ---------------------------------------------------------
  // 3. GET PRODUCTS
  // ---------------------------------------------------------

  it("should find the seeded quotation products", async () => {
    const response = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${salesToken}`);

    expect(response.status).toBe(200);

    const products = response.body.data;

    expect(products).toBeDefined();
    expect(Array.isArray(products)).toBe(true);

    const motor = products.find(
      (product: { productCode: string }) =>
        product.productCode === "IND-MOT-001",
    );

    const valve = products.find(
      (product: { productCode: string }) =>
        product.productCode === "IND-VLV-002",
    );

    expect(motor).toBeDefined();
    expect(valve).toBeDefined();

    productMotorId = motor.id;
    productValveId = valve.id;
  });

  // ---------------------------------------------------------
  // 4. CREATE ENQUIRY
  // ---------------------------------------------------------

  it("should create an enquiry for the quotation", async () => {
    const response = await request(app)
      .post("/api/enquiries")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        customerId,
        requiredDate: "2026-12-31",
        notes: "Automated quotation calculation test",
        items: [
          {
            productId: productMotorId,
            quantity: 5,
          },
          {
            productId: productValveId,
            quantity: 10,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toBeDefined();

    enquiryId = response.body.data.id;

    expect(enquiryId).toBeDefined();
  });

  // ---------------------------------------------------------
  // 5. VERIFY QUOTATION CALCULATION
  // ---------------------------------------------------------

  it("should calculate quotation totals correctly", async () => {
    const response = await request(app)
      .post("/api/quotations")
      .set("Authorization", `Bearer ${salesToken}`)
      .send({
        enquiryId,
        validUntil: "2027-01-31",
        items: [
          {
            productId: productMotorId,
            quantity: 5,
            unitPrice: 24500,
            discountPercent: 10,
            gstPercent: 18,
          },
          {
            productId: productValveId,
            quantity: 10,
            unitPrice: 3200,
            discountPercent: 10,
            gstPercent: 18,
          },
        ],
      });

    expect(response.status).toBe(201);

    const quotation = response.body.quotation;

    expect(quotation).toBeDefined();

    // -------------------------------------------------------
    // QUOTATION-LEVEL TOTALS
    // -------------------------------------------------------

    /*
     * Motor:
     * 5 × ₹24,500 = ₹122,500
     *
     * Valve:
     * 10 × ₹3,200 = ₹32,000
     *
     * Subtotal:
     * ₹154,500
     *
     * Discount:
     * 10% = ₹15,450
     *
     * Amount after discount:
     * ₹139,050
     *
     * GST:
     * 18% of ₹139,050 = ₹25,029
     *
     * Grand Total:
     * ₹164,079
     */

    expect(Number(quotation.subtotal)).toBe(154500);

    expect(Number(quotation.discountAmount)).toBe(15450);

    expect(Number(quotation.taxAmount)).toBe(25029);

    expect(Number(quotation.totalAmount)).toBe(164079);

    // -------------------------------------------------------
    // LINE-LEVEL TOTALS
    // -------------------------------------------------------

    expect(quotation.items).toHaveLength(2);

    const motorLine = quotation.items.find(
      (item: { productId: string }) =>
        item.productId === productMotorId,
    );

    const valveLine = quotation.items.find(
      (item: { productId: string }) =>
        item.productId === productValveId,
    );

    expect(motorLine).toBeDefined();
    expect(valveLine).toBeDefined();

    /*
     * Motor line:
     *
     * Gross = 5 × ₹24,500
     *       = ₹122,500
     *
     * Discount = 10%
     *          = ₹12,250
     *
     * After discount = ₹110,250
     *
     * GST = 18%
     *     = ₹19,845
     *
     * Line amount = ₹130,095
     */

    expect(Number(motorLine.lineAmount)).toBe(130095);

    /*
     * Valve line:
     *
     * Gross = 10 × ₹3,200
     *       = ₹32,000
     *
     * Discount = 10%
     *          = ₹3,200
     *
     * After discount = ₹28,800
     *
     * GST = 18%
     *     = ₹5,184
     *
     * Line amount = ₹33,984
     */

    expect(Number(valveLine.lineAmount)).toBe(33984);

    /*
     * Final verification:
     *
     * ₹130,095 + ₹33,984 = ₹164,079
     */

    expect(
      Number(motorLine.lineAmount) +
        Number(valveLine.lineAmount),
    ).toBe(164079);
  });
});