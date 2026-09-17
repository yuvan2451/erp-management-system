# ERP Management System

A full-stack Enterprise Resource Planning (ERP) system developed as a technical case study using PostgreSQL, Express.js, React.js, and Node.js.

The application manages the complete sales and operations workflow:

**Customer Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch**

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Business Workflow](#2-business-workflow)
- [3. Main Screens](#3-main-screens)
- [4. User Roles](#4-user-roles)
- [5. Technology Stack](#5-technology-stack)
- [6. System Architecture](#6-system-architecture)
- [7. Project Structure](#7-project-structure)
- [8. Prerequisites](#8-prerequisites)
- [9. Database Setup](#9-database-setup)
- [10. Environment Variables](#10-environment-variables)
- [11. Backend Installation](#11-backend-installation)
- [12. Database Migration](#12-database-migration)
- [13. Database Seeding](#13-database-seeding)
- [14. Running the Backend](#14-running-the-backend)
- [15. Frontend Installation](#15-frontend-installation)
- [16. Running the Frontend](#16-running-the-frontend)
- [17. Test Credentials](#17-test-credentials)
- [18. Authentication](#18-authentication)
- [19. Role-Based Access Control](#19-role-based-access-control)
- [20. REST API](#20-rest-api)
- [21. Database Design](#21-database-design)
- [22. Business Rules](#22-business-rules)
- [23. Quotation Calculation](#23-quotation-calculation)
- [24. Inventory Reservation](#24-inventory-reservation)
- [25. Dispatch Workflow](#25-dispatch-workflow)
- [26. Automated Testing](#26-automated-testing)
- [27. Build Verification](#27-build-verification)
- [28. End-to-End Demonstration](#28-end-to-end-demonstration)
- [29. Security](#29-security)
- [30. Git Development History](#30-git-development-history)
- [31. Project Status](#31-project-status)

---

# 1. Project Overview

This project implements a small ERP system for managing industrial product enquiries, quotations, sales orders, inventory reservations, and dispatch operations.

The system provides role-based access for two types of users:

- **ADMIN**
- **SALES_USER**

The application follows a REST API architecture with:

- React + TypeScript frontend
- Node.js + Express.js backend
- PostgreSQL database
- Prisma ORM
- JWT authentication
- Backend role-based access control

The main objective is to maintain a consistent business workflow from the initial customer enquiry through quotation creation, sales order processing, inventory reservation, and final dispatch.

---

# 2. Business Workflow

The main ERP workflow is:

```text
Customer
    |
    v
Enquiry
    |
    v
Quotation
    |
    v
Accepted Quotation
    |
    v
Sales Order
    |
    v
Admin Confirmation
    |
    v
Inventory Reservation
    |
    v
Confirmed Sales Order
    |
    v
Dispatch
    |
    v
Inventory Consumption
    |
    v
Dispatched Sales Order
```

## Enquiry

A customer enquiry contains:

- Customer
- Enquiry number
- Enquiry date
- Required date
- Multiple products
- Product quantities
- Notes
- Enquiry status

Enquiry status:

```text
NEW → QUOTED → WON / LOST
```

## Quotation

A quotation is created against an enquiry.

It contains:

- Quotation number
- Enquiry reference
- Customer
- Products
- Quantity
- Unit price
- Discount
- GST
- Line amount
- Subtotal
- Discount amount
- Tax amount
- Grand total
- Valid until date
- Status

Quotation status:

```text
DRAFT → SENT → ACCEPTED
                 |
                 └── REJECTED
```

## Sales Order

An accepted quotation can be converted into a Sales Order.

Sales Order status:

```text
PENDING → CONFIRMED → DISPATCHED
    |
    └──────────────→ CANCELLED
```

Only an accepted quotation can be converted into a Sales Order.

A quotation can generate only one Sales Order.

## Inventory Reservation

When an ADMIN confirms a Sales Order, the system checks the available inventory.

Available quantity is calculated as:

```text
Available Quantity =
Physical Quantity - Reserved Quantity
```

During confirmation:

```text
Physical Quantity   → unchanged
Reserved Quantity   → increases
Available Quantity  → decreases
```

## Dispatch

When an ADMIN dispatches a confirmed Sales Order:

```text
Physical Quantity   → decreases
Reserved Quantity   → decreases
Available Quantity  → remains consistent
```

The system prevents:

- Dispatching an unconfirmed order
- Duplicate dispatches
- Dispatch beyond reserved inventory

---

# 3. Main Screens

The application contains four primary screens:

1. **Login**
2. **Enquiries**
3. **Quotations**
4. **Sales Orders**

Inventory is displayed inside the Sales Orders workflow rather than being implemented as a separate main screen.

## Login

Provides authentication using email and password.

## Enquiries

Allows users to:

- View customer enquiries
- Create enquiries
- Create customers
- Select products
- Specify quantities
- Add notes

## Quotations

Allows users to:

- View quotations
- Create quotations from enquiries
- Set unit prices
- Apply discounts
- Apply GST
- Save quotations as drafts
- Send quotations
- Accept or reject quotations
- Convert accepted quotations into Sales Orders

## Sales Orders

Allows users to:

- View Sales Orders
- View order details
- View inventory
- Confirm Sales Orders
- Reserve inventory
- Process dispatch
- View dispatch information

---

# 4. User Roles

## ADMIN

ADMIN users can:

- Login
- View customers
- Create customers
- Create enquiries
- View enquiries
- View products
- View inventory
- Update inventory
- Create quotations
- Update quotation status
- Convert accepted quotations
- View Sales Orders
- Confirm Sales Orders
- Reserve inventory
- Process dispatches

## SALES_USER

SALES_USER users can:

- Login
- Create customers
- Create enquiries
- View enquiries
- View products
- View inventory
- Create quotations
- Update quotation status
- Convert accepted quotations
- View Sales Orders

ADMIN-only operations such as inventory updates, Sales Order confirmation, and dispatch are protected by backend RBAC.

---

# 5. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Axios
- React Router

## Backend

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT
- bcryptjs

## Testing

- Vitest
- Supertest

## Database

- PostgreSQL

---

# 6. System Architecture

The application follows a layered full-stack architecture.

```text
┌─────────────────────────────────────────┐
│             React Frontend              │
│                                         │
│ Login                                    │
│ Enquiries                                │
│ Quotations                               │
│ Sales Orders                             │
└───────────────────┬─────────────────────┘
                    │
                    │ REST API
                    │ JWT
                    ▼
┌─────────────────────────────────────────┐
│            Express Backend              │
│                                         │
│ Routes                                   │
│ Controllers                              │
│ Services                                 │
│ Authentication                           │
│ RBAC                                     │
│ Validation                               │
│ Error Handling                           │
└───────────────────┬─────────────────────┘
                    │
                    │ Prisma ORM
                    ▼
┌─────────────────────────────────────────┐
│              PostgreSQL                 │
│                                         │
│ Users                                    │
│ Customers                                │
│ Products                                 │
│ Inventory                                │
│ Enquiries                                │
│ Quotations                               │
│ Sales Orders                             │
│ Dispatches                               │
└─────────────────────────────────────────┘
```

---

# 7. Project Structure

```text
erp-case-study/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── customers/
│   │   │   ├── enquiries/
│   │   │   ├── products/
│   │   │   ├── inventory/
│   │   │   ├── quotations/
│   │   │   ├── sales-orders/
│   │   │   └── dispatches/
│   │   └── app.ts
│   │
│   ├── tests/
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── prisma.config.ts
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Enquiries.tsx
│   │   │   ├── Quotations.tsx
│   │   │   └── SalesOrders.tsx
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

# 8. Prerequisites

Install:

- Node.js 22 or compatible recent Node.js version
- npm
- PostgreSQL 18 or compatible PostgreSQL version
- Git

Verify:

```powershell
node --version
npm --version
git --version
psql --version
```

---

# 9. Database Setup

Create a PostgreSQL database named:

```text
erp_db
```

Using PostgreSQL:

```sql
CREATE DATABASE erp_db;
```

The backend connects to PostgreSQL through Prisma.

---

# 10. Environment Variables

Go to:

```text
backend/
```

Create:

```text
.env
```

Add:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/erp_db"
PORT=5000
JWT_SECRET="YOUR_SECRET_KEY"
```

Replace:

```text
YOUR_PASSWORD
YOUR_SECRET_KEY
```

with your local PostgreSQL password and JWT secret.

**Important:** Do not commit `.env` to Git.

The repository contains `.env.example` as a template.

---

# 11. Backend Installation

From the project root:

```powershell
cd D:\erp-case-studyackend
npm install
```

Generate the Prisma client:

```powershell
npx prisma generate
```

---

# 12. Database Migration

Apply the existing migrations:

```powershell
npx prisma migrate deploy
```

For local development, migrations can also be created using:

```powershell
npx prisma migrate dev
```

---

# 13. Database Seeding

Run:

```powershell
npx prisma db seed
```

The seed creates:

- ADMIN user
- SALES_USER user
- Industrial products
- Initial inventory
- Sample customers

---

# 14. Running the Backend

From:

```text
D:\erp-case-studyackend
```

run:

```powershell
npm run dev
```

Backend:

```text
http://localhost:5000
```

API base URL:

```text
http://localhost:5000/api
```

---

# 15. Frontend Installation

Open another terminal:

```powershell
cd D:\erp-case-studyrontend
npm install
```

---

# 16. Running the Frontend

Run:

```powershell
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Open:

```text
http://localhost:5173
```

---

# 17. Test Credentials

## ADMIN

```text
Email:
admin@erp.local

Password:
Admin@123

Role:
ADMIN
```

## SALES USER

```text
Email:
sales@erp.local

Password:
Sales@123

Role:
SALES_USER
```

These credentials are intended for local development and demonstration.

---

# 18. Authentication

Authentication is implemented using JSON Web Tokens (JWT).

Login:

```http
POST /api/auth/login
```

Example request:

```json
{
  "email": "admin@erp.local",
  "password": "Admin@123"
}
```

A successful login returns a JWT token.

Protected requests use:

```http
Authorization: Bearer <JWT_TOKEN>
```

The backend verifies the JWT before allowing access to protected APIs.

Passwords are stored using bcrypt hashing rather than plain text.

---

# 19. Role-Based Access Control

RBAC is enforced in the backend.

```text
ADMIN
  |
  ├── Update Inventory
  ├── Confirm Sales Orders
  └── Process Dispatch

SALES_USER
  |
  ├── View Inventory
  ├── Create Enquiries
  ├── Create Quotations
  └── View Sales Orders
```

Frontend role checks control which actions are displayed to the user.

The backend remains the security boundary and independently rejects unauthorized operations.

Example:

```text
SALES_USER
     |
     └── POST /api/sales-orders/:id/confirm
                    |
                    ▼
                   403
```

---

# 20. REST API

## Authentication

```http
POST /api/auth/login
```

## Customers

```http
GET  /api/customers
POST /api/customers
```

## Enquiries

```http
GET  /api/enquiries
POST /api/enquiries
```

## Products

```http
GET /api/products
GET /api/products/:id
```

## Inventory

```http
GET   /api/inventory
GET   /api/inventory/:productId
PATCH /api/inventory/:productId
```

Inventory update operations are restricted to ADMIN users.

## Quotations

```http
GET   /api/quotations
GET   /api/quotations/:id
POST  /api/quotations
PATCH /api/quotations/:id/status
POST  /api/quotations/:id/convert
```

## Sales Orders

```http
GET  /api/sales-orders
GET  /api/sales-orders/:id
POST /api/sales-orders/:id/confirm
POST /api/sales-orders/:id/dispatch
```

## Dispatches

```http
GET /api/dispatches
GET /api/dispatches/:id
```

---

# 21. Database Design

The database contains:

```text
User
Customer
Product
Inventory
Enquiry
EnquiryItem
Quotation
QuotationItem
SalesOrder
SalesOrderItem
Dispatch
```

Main relationships:

```text
Customer
   |
   └── Enquiry
          |
          └── EnquiryItem
                 |
                 └── Product
                       |
                       └── Inventory

Enquiry
   |
   └── Quotation
          |
          └── QuotationItem
                 |
                 └── Product

Quotation
   |
   └── SalesOrder
          |
          └── SalesOrderItem
                 |
                 └── Product

SalesOrder
   |
   └── Dispatch
```

The database uses:

- Primary keys
- Foreign keys
- Unique constraints
- Indexes
- Enum status values
- Transactional operations
- Referential integrity

---

# 22. Business Rules

## Enquiry Rules

- Customer must exist.
- At least one product is required.
- Products must exist.
- Quantity must be positive.
- Quantity must be a whole number.
- Duplicate products in the same enquiry are rejected.
- Enquiry numbers are generated by the backend.

## Quotation Rules

- Quotation must reference an existing enquiry.
- LOST enquiries cannot receive quotations.
- Product quantities must be positive.
- Unit price cannot be negative.
- Discount must be between 0% and 100%.
- GST must be between 0% and 100%.
- Duplicate products are rejected.
- Quotation totals are calculated by the backend.
- Quotation numbers are generated by the backend.
- Draft quotations cannot be converted into Sales Orders.
- Rejected quotations cannot be converted into Sales Orders.

## Sales Order Rules

- Only ACCEPTED quotations can be converted.
- One quotation can create only one Sales Order.
- Sales Orders start with PENDING status.
- Only ADMIN users can confirm Sales Orders.
- Confirmation checks available inventory.
- Inventory is reserved during confirmation.

## Inventory Rules

Available inventory is:

```text
Available =
Physical - Reserved
```

The system prevents:

```text
Reserved > Available
```

Physical inventory cannot be reduced below the currently reserved inventory.

Inventory reservation is performed inside a database transaction.

## Dispatch Rules

- Only CONFIRMED Sales Orders can be dispatched.
- Only ADMIN users can dispatch.
- Duplicate dispatch is prevented.
- Dispatch cannot exceed reserved inventory.
- Physical inventory decreases during dispatch.
- Reserved inventory decreases during dispatch.
- Sales Order becomes DISPATCHED after successful dispatch.

---

# 23. Quotation Calculation

Quotation totals are calculated by the backend.

For each quotation line:

```text
Gross Amount =
Quantity × Unit Price
```

```text
Discount Amount =
Gross Amount × Discount Percentage
```

```text
Amount After Discount =
Gross Amount - Discount Amount
```

```text
GST Amount =
Amount After Discount × GST Percentage
```

```text
Line Amount =
Amount After Discount + GST Amount
```

Quotation-level totals:

```text
Subtotal =
Sum of Gross Amounts
```

```text
Discount =
Sum of Discount Amounts
```

```text
Tax =
Sum of GST Amounts
```

```text
Grand Total =
Subtotal - Discount + Tax
```

The React frontend displays a calculation preview for the user.

The backend independently validates and calculates the final quotation totals.

---

# 24. Inventory Reservation

Inventory reservation occurs when an ADMIN confirms a PENDING Sales Order.

The confirmation process is:

```text
1. Lock Sales Order
        |
        v
2. Verify status = PENDING
        |
        v
3. Lock required inventory rows
        |
        v
4. Calculate available quantity
        |
        v
5. Verify sufficient inventory
        |
        v
6. Increase reserved quantity
        |
        v
7. Change Sales Order to CONFIRMED
        |
        v
8. Commit transaction
```

The reservation is handled by the backend/database rather than relying only on frontend checks.

This protects the system from concurrent confirmations attempting to reserve the same inventory.

---

# 25. Dispatch Workflow

A confirmed Sales Order can be dispatched by an ADMIN.

The dispatch process is:

```text
CONFIRMED Sales Order
        |
        v
Check existing dispatch
        |
        v
Lock Sales Order
        |
        v
Lock inventory rows
        |
        v
Verify reserved quantity
        |
        v
Decrease physical quantity
        |
        v
Decrease reserved quantity
        |
        v
Create dispatch record
        |
        v
Set Sales Order = DISPATCHED
```

Dispatch information includes:

- Dispatch number
- Sales Order
- Dispatch date
- Vehicle number
- Driver name
- Notes

---

# 26. Automated Testing

The backend contains automated tests using:

- Vitest
- Supertest

Test coverage includes authentication, authorization, quotation calculations, Sales Order conversion, inventory reservation, concurrency, and dispatch.

## Authentication Tests

- ADMIN login
- SALES_USER login
- Missing JWT
- Invalid JWT
- ADMIN inventory access
- SALES_USER inventory access
- Unauthorized inventory update

## Quotation Tests

- Quotation creation
- Quotation total calculation
- Invalid quotation data
- Draft conversion restrictions
- Rejected conversion restrictions
- Sales Order conversion

## Sales Order Tests

- Sales Order conversion
- Duplicate Sales Order prevention
- Inventory reservation
- Over-reservation prevention
- Concurrent reservation handling
- Dispatch workflow

Run all tests:

```powershell
cd D:\erp-case-studyackend
npm run test
```

---

# 27. Build Verification

## Backend

```powershell
cd D:\erp-case-studyackend
npm run build
```

## Frontend

```powershell
cd D:\erp-case-studyrontend
npm run build
```

Both projects should compile successfully without TypeScript errors.

---

# 28. End-to-End Demonstration

The complete demonstration workflow is:

```text
1. Login
      |
      v
2. Create / View Customer
      |
      v
3. Create Enquiry
      |
      v
4. Create Quotation
      |
      v
5. Save as Draft
      |
      v
6. Send Quotation
      |
      v
7. Accept Quotation
      |
      v
8. Convert to Sales Order
      |
      v
9. ADMIN confirms Sales Order
      |
      v
10. Inventory is Reserved
      |
      v
11. ADMIN processes Dispatch
      |
      v
12. Physical and Reserved Inventory are Updated
      |
      v
13. Sales Order becomes DISPATCHED
```

---

# 29. Security

The application implements:

- Password hashing using bcrypt
- JWT authentication
- Backend role-based access control
- Protected REST APIs
- Input validation
- Database foreign keys
- Unique constraints
- Transactional inventory operations
- Environment-based configuration
- Secrets stored outside source code
- `.env` excluded from Git

Frontend checks are used for user experience, while sensitive authorization decisions are enforced by the backend.

---

# 30. Git Development History

The project was developed incrementally using feature-specific Git commits.

Important development milestones include:

```text
chore: initialize ERP project
chore: configure backend dependencies
feat: initialize Express TypeScript backend
feat: add ERP database schema
feat: add initial database migration
feat: add database seed data
feat: add JWT authentication and RBAC
feat: add customer management APIs
feat: add enquiry management APIs
feat: add product and inventory APIs
feat: add sales order conversion and inventory reservation
feat: add dispatch workflow
test: add quotation calculation coverage
fix: make business number generation concurrency safe
test: add sales order conversion rules
test: configure backend integration tests
chore: stop tracking generated files
test: add concurrent inventory reservation coverage
fix: enable frontend cors access
feat: build enquiries frontend workflow
feat: build quotations frontend workflow
feat: build sales orders frontend workflow
```

The feature-based Git history makes the development process easier to review and understand.

---

# 31. Project Status

## Backend

```text
Authentication              ✓
JWT                         ✓
RBAC                        ✓
Customer APIs               ✓
Enquiry APIs                ✓
Product APIs                ✓
Inventory APIs              ✓
Quotation APIs              ✓
Sales Order APIs             ✓
Inventory Reservation       ✓
Concurrent Reservation      ✓
Dispatch APIs               ✓
Automated Tests             ✓
```

## Frontend

```text
Login                       ✓
Enquiries                   ✓
Customer Creation           ✓
Quotations                  ✓
Sales Orders                ✓
Inventory View              ✓
Dispatch Workflow           ✓
```

## Documentation

```text
README                      ✓
ER Diagram                  Pending
API / Postman Documentation Pending
Demo Video                  Pending
```

---

# Project Workflow Summary

The completed application provides an end-to-end ERP workflow:

```text
                    ERP SYSTEM
                        |
                        v
                    CUSTOMER
                        |
                        v
                    ENQUIRY
                        |
                        v
                   QUOTATION
                        |
                     ACCEPTED
                        |
                        v
                  SALES ORDER
                        |
                 ADMIN CONFIRM
                        |
                        v
              INVENTORY RESERVATION
                        |
                        v
                   CONFIRMED
                        |
                 ADMIN DISPATCH
                        |
                        v
                 INVENTORY UPDATE
                        |
                        v
                   DISPATCHED
```

The system combines a React frontend, Express/Node.js backend, PostgreSQL database, JWT authentication, backend RBAC, validation, transactional inventory management, and automated testing into one complete ERP workflow.

---

## License

This project was developed as a technical case study and demonstration project.
