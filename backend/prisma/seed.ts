import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Prisma 7 Database Connection Setup
 *
 * In Prisma 7, database connectivity uses driver adapters for direct SQL engine communication.
 * We initialize a pg.Pool instance with the connection string from environment variables,
 * wrap it with PrismaPg, and pass it to the PrismaClient constructor.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for seeding.');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Standard Demo User Definitions
 *
 * Demo Credentials for Local Verification & Case-Study Testing:
 * - Admin:       admin@erp.local / Admin@123
 * - Sales User:  sales@erp.local / Sales@123
 */
const DEMO_USERS = [
  {
    email: 'admin@erp.local',
    name: 'System Administrator',
    role: Role.ADMIN,
    plaintextPassword: 'Admin@123',
  },
  {
    email: 'sales@erp.local',
    name: 'Sales Executive',
    role: Role.SALES_USER,
    plaintextPassword: 'Sales@123',
  },
];

/**
 * Catalog Products & Initial Warehouse Stock Definitions
 *
 * Provides realistic industrial manufacturing & distribution items
 * covering mechanical, electrical, and flow-control domains.
 */
const SEED_PRODUCTS = [
  {
    productCode: 'IND-MOT-001',
    name: '3-Phase Induction Motor 5HP',
    category: 'Electric Motors',
    unit: 'PCS',
    basePrice: 24500.0,
    initialStock: 50,
  },
  {
    productCode: 'IND-VLV-002',
    name: 'High-Pressure Ball Valve 2-Inch',
    category: 'Valves & Fittings',
    unit: 'PCS',
    basePrice: 3200.0,
    initialStock: 120,
  },
  {
    productCode: 'IND-PMP-003',
    name: 'Centrifugal Industrial Water Pump 10HP',
    category: 'Pumping Equipment',
    unit: 'SET',
    basePrice: 48000.0,
    initialStock: 30,
  },
  {
    productCode: 'IND-SEN-004',
    name: 'Digital Temperature Sensor Transmitter PT100',
    category: 'Instrumentation',
    unit: 'PCS',
    basePrice: 1850.0,
    initialStock: 200,
  },
  {
    productCode: 'IND-GBX-005',
    name: 'Helical Heavy-Duty Gearbox 20:1 Ratio',
    category: 'Power Transmission',
    unit: 'SET',
    basePrice: 35000.0,
    initialStock: 15,
  },
  {
    productCode: 'IND-BRG-006',
    name: 'Spherical Roller Bearing 120mm Bore',
    category: 'Bearings & Bushings',
    unit: 'PCS',
    basePrice: 4200.0,
    initialStock: 80,
  },
  {
    productCode: 'IND-VFD-007',
    name: 'Variable Frequency Drive (VFD) 7.5kW',
    category: 'Industrial Automation',
    unit: 'UNIT',
    basePrice: 28500.0,
    initialStock: 25,
  },
];

async function main() {
  console.log('--- Starting ERP Database Seeding ---');

  // =========================================================================
  // 1. SEED USERS (IDEMPOTENT UPSERT)
  // =========================================================================
  console.log('Seeding demo users...');

  for (const user of DEMO_USERS) {
    /**
     * Why passwords are encrypted with bcrypt:
     * Storing plaintext passwords in a database violates security compliance and exposes
     * credentials during unauthorized database dumps or inspections. Salted one-way hashing
     * ensures passwords can only be verified, never decrypted.
     */
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(user.plaintextPassword, saltRounds);

    const seededUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash, // Updates password hash if rerun
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash,
      },
    });

    console.log(`  ✓ User upserted: ${seededUser.email} (${seededUser.role})`);
  }

  // =========================================================================
  // 2. SEED PRODUCTS & INVENTORY (TRANSACTIONAL & IDEMPOTENT)
  // =========================================================================
  console.log('Seeding industrial products and warehouse inventory...');

  /**
   * Why we use an interactive transaction:
   * A product and its initial inventory record represent a single coherent business unit.
   * Wrapping them in a transaction guarantees that an inventory record is never orphaned
   * or omitted if a database error occurs halfway through seeding.
   */
  await prisma.$transaction(async (tx) => {
    for (const item of SEED_PRODUCTS) {
      // Upsert the catalog product
      const product = await tx.product.upsert({
        where: { productCode: item.productCode },
        update: {
          name: item.name,
          category: item.category,
          unit: item.unit,
          basePrice: item.basePrice,
        },
        create: {
          productCode: item.productCode,
          name: item.name,
          category: item.category,
          unit: item.unit,
          basePrice: item.basePrice,
        },
      });

      /**
       * Why reserved quantity starts at 0:
       * Reserved quantity represents physical inventory committed to confirmed sales orders
       * that have not yet been dispatched. For newly created initial inventory, no sales orders
       * exist yet, so reserved quantity must strictly begin at 0.
       *
       * Why available quantity is calculated rather than stored:
       * Available quantity is dynamically derived as:
       *    availableQuantity = physicalQuantity - reservedQuantity
       * Storing 'available' redundantly creates multiple sources of truth and causes data drift
       * during high-concurrency order placement and dispatching.
       */
      await tx.inventory.upsert({
        where: { productId: product.id },
        update: {
          // Preserve existing quantities on re-seed to avoid wiping operational testing stock
        },
        create: {
          productId: product.id,
          physicalQuantity: item.initialStock, // Must be > 0
          reservedQuantity: 0,                 // Must be 0 initially
        },
      });

      console.log(`  ✓ Product & Inventory: ${product.productCode} - ${product.name} (Stock: ${item.initialStock})`);
    }
  });

  console.log('--- ERP Database Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
