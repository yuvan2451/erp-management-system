import { describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app";
import { prisma } from "../src/lib/prisma";

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

  // ---------------------------------------------------------
  // 10. BONUS - SIMULTANEOUS INVENTORY RESERVATIONS
  // ---------------------------------------------------------

  it("should prevent simultaneous reservations from exceeding available inventory", async () => {
    /*
     * Save the current inventory state.
     *
     * The test temporarily changes the Motor inventory so that
     * only ONE unit is available. The original state is restored
     * in the finally block after the test finishes.
     */
    const originalInventory = await prisma.inventory.findUnique({
      where: {
        productId,
      },
    });

    expect(originalInventory).toBeDefined();

    try {
      // -------------------------------------------------------
      // Prepare controlled concurrency scenario
      // -------------------------------------------------------
      //
      // Physical stock = 1
      // Reserved stock = 0
      // Available stock = 1
      //
      // Two Sales Orders will each request that same one unit.
      // Only one should be able to reserve it.
      //

      await prisma.inventory.update({
        where: {
          productId,
        },
        data: {
          physicalQuantity: 1,
          reservedQuantity: 0,
        },
      });

      // -------------------------------------------------------
      // LOGIN AS ADMIN
      // -------------------------------------------------------
      //
      // Sales Order confirmation is ADMIN-only.
      //

      const adminLogin = await request(app)
        .post("/api/auth/login")
        .send({
          email: "admin@erp.local",
          password: "Admin@123",
        });

      expect(adminLogin.status).toBe(200);
      expect(adminLogin.body.data.token).toBeDefined();

      const adminToken = adminLogin.body.data.token;

      // -------------------------------------------------------
      // VERIFY INITIAL INVENTORY
      // -------------------------------------------------------

      const initialInventory = await request(app)
        .get(`/api/inventory/${productId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(initialInventory.status).toBe(200);

      expect(initialInventory.body.data.physicalQuantity).toBe(1);
      expect(initialInventory.body.data.reservedQuantity).toBe(0);
      expect(initialInventory.body.data.availableQuantity).toBe(1);

      // -------------------------------------------------------
      // CREATE FIRST ENQUIRY
      // -------------------------------------------------------

      const enquiry1 = await request(app)
        .post("/api/enquiries")
        .set("Authorization", `Bearer ${salesToken}`)
        .send({
          customerId,
          requiredDate: "2027-02-01",
          notes: "Concurrency reservation test - Order 1",
          items: [
            {
              productId,
              quantity: 1,
            },
          ],
        });

      expect(enquiry1.status).toBe(201);

      // -------------------------------------------------------
      // CREATE SECOND ENQUIRY
      // -------------------------------------------------------

      const enquiry2 = await request(app)
        .post("/api/enquiries")
        .set("Authorization", `Bearer ${salesToken}`)
        .send({
          customerId,
          requiredDate: "2027-02-01",
          notes: "Concurrency reservation test - Order 2",
          items: [
            {
              productId,
              quantity: 1,
            },
          ],
        });

      expect(enquiry2.status).toBe(201);

      // -------------------------------------------------------
      // CREATE FIRST QUOTATION
      // -------------------------------------------------------

      const quotation1 = await request(app)
        .post("/api/quotations")
        .set("Authorization", `Bearer ${salesToken}`)
        .send({
          enquiryId: enquiry1.body.data.id,
          validUntil: "2027-02-15",
          items: [
            {
              productId,
              quantity: 1,
              unitPrice: 24500,
              discountPercent: 0,
              gstPercent: 18,
            },
          ],
        });

      expect(quotation1.status).toBe(201);

      const quotation1Id = quotation1.body.quotation.id;

      // -------------------------------------------------------
      // CREATE SECOND QUOTATION
      // -------------------------------------------------------

      const quotation2 = await request(app)
        .post("/api/quotations")
        .set("Authorization", `Bearer ${salesToken}`)
        .send({
          enquiryId: enquiry2.body.data.id,
          validUntil: "2027-02-15",
          items: [
            {
              productId,
              quantity: 1,
              unitPrice: 24500,
              discountPercent: 0,
              gstPercent: 18,
            },
          ],
        });

      expect(quotation2.status).toBe(201);

      const quotation2Id = quotation2.body.quotation.id;

      // -------------------------------------------------------
      // MOVE BOTH QUOTATIONS TO ACCEPTED
      // -------------------------------------------------------

      for (const quotationId of [quotation1Id, quotation2Id]) {
        const sentResponse = await request(app)
          .patch(`/api/quotations/${quotationId}/status`)
          .set("Authorization", `Bearer ${salesToken}`)
          .send({
            status: "SENT",
          });

        expect(sentResponse.status).toBe(200);

        const acceptedResponse = await request(app)
          .patch(`/api/quotations/${quotationId}/status`)
          .set("Authorization", `Bearer ${salesToken}`)
          .send({
            status: "ACCEPTED",
          });

        expect(acceptedResponse.status).toBe(200);
      }

      // -------------------------------------------------------
      // CONVERT BOTH QUOTATIONS TO SALES ORDERS
      // -------------------------------------------------------

      const order1 = await request(app)
        .post(`/api/quotations/${quotation1Id}/convert`)
        .set("Authorization", `Bearer ${salesToken}`);

      expect(order1.status).toBe(201);

      const salesOrder1Id = order1.body.salesOrder.id;

      const order2 = await request(app)
        .post(`/api/quotations/${quotation2Id}/convert`)
        .set("Authorization", `Bearer ${salesToken}`);

      expect(order2.status).toBe(201);

      const salesOrder2Id = order2.body.salesOrder.id;

      // -------------------------------------------------------
      // ACTUAL CONCURRENCY TEST
      // -------------------------------------------------------
      //
      // Promise.all starts both confirmation requests without
      // waiting for the first request to finish.
      //
      // PostgreSQL row locking in the Sales Order confirmation
      // service ensures that both requests cannot reserve the
      // same inventory.
      //

      const [confirmation1, confirmation2] = await Promise.all([
        request(app)
          .post(`/api/sales-orders/${salesOrder1Id}/confirm`)
          .set("Authorization", `Bearer ${adminToken}`),

        request(app)
          .post(`/api/sales-orders/${salesOrder2Id}/confirm`)
          .set("Authorization", `Bearer ${adminToken}`),
      ]);

      const statuses = [
        confirmation1.status,
        confirmation2.status,
      ].sort();

      // Exactly one confirmation must succeed.
      // The other must fail because no inventory remains.
      expect(statuses).toEqual([200, 400]);

      // -------------------------------------------------------
      // VERIFY INVENTORY INTEGRITY
      // -------------------------------------------------------

      const finalInventory = await request(app)
        .get(`/api/inventory/${productId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(finalInventory.status).toBe(200);

      expect(finalInventory.body.data.physicalQuantity).toBe(1);
      expect(finalInventory.body.data.reservedQuantity).toBe(1);
      expect(finalInventory.body.data.availableQuantity).toBe(0);

      /*
       * Core inventory invariant:
       *
       * Reserved quantity must never exceed physical quantity.
       */
      expect(finalInventory.body.data.reservedQuantity)
        .toBeLessThanOrEqual(
          finalInventory.body.data.physicalQuantity,
        );
    } finally {
      // -------------------------------------------------------
      // RESTORE ORIGINAL INVENTORY
      // -------------------------------------------------------
      //
      // This makes the test repeatable. Even if an assertion
      // fails, finally still executes and restores the original
      // inventory values.
      //

      if (originalInventory) {
        await prisma.inventory.update({
          where: {
            productId,
          },
          data: {
            physicalQuantity:
              originalInventory.physicalQuantity,
            reservedQuantity:
              originalInventory.reservedQuantity,
          },
        });
      }
    }
  });
});