import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import {
  createEnquiry,
  getCustomers,
  getEnquiries,
  getProducts,
} from "../api/enquiries.api";

import { createCustomer } from "../api/customers.api";

import { useAuth } from "../context/AuthContext";

import type {
  Customer,
  Enquiry,
  Product,
} from "../types/enquiry";

interface EnquiryLine {
  productId: string;
  quantity: number;
}

export default function Enquiries() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // ---------------------------------------------------------
  // Existing enquiry/customer/product data
  // ---------------------------------------------------------

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // ---------------------------------------------------------
  // Enquiry form state
  // ---------------------------------------------------------

  const [customerId, setCustomerId] = useState("");

  const [enquiryDate, setEnquiryDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [requiredDate, setRequiredDate] = useState("");

  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<EnquiryLine[]>([
    {
      productId: "",
      quantity: 1,
    },
  ]);

  // ---------------------------------------------------------
  // Customer modal state
  // ---------------------------------------------------------

  const [showCustomerModal, setShowCustomerModal] =
    useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [customerSubmitting, setCustomerSubmitting] =
    useState(false);

  // ---------------------------------------------------------
  // Page state
  // ---------------------------------------------------------

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ---------------------------------------------------------
  // Load all data required by the page
  // ---------------------------------------------------------

  async function loadPageData() {
    try {
      setLoading(true);
      setError("");

      const [
        enquiryData,
        customerData,
        productData,
      ] = await Promise.all([
        getEnquiries(),
        getCustomers(),
        getProducts(),
      ]);

      setEnquiries(enquiryData);
      setCustomers(customerData);
      setProducts(productData);
    } catch (error) {
      console.error(
        "Failed to load enquiry page data:",
        error,
      );

      setError(
        "Unable to load enquiries. Please refresh the page.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  // ---------------------------------------------------------
  // Product line management
  // ---------------------------------------------------------

  function addItem() {
    setItems((currentItems) => [
      ...currentItems,
      {
        productId: "",
        quantity: 1,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((currentItems) =>
      currentItems.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    );
  }

  function updateItem(
    index: number,
    field: keyof EnquiryLine,
    value: string,
  ) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (field === "productId") {
          return {
            ...item,
            productId: value,
          };
        }

        return {
          ...item,
          quantity: Number(value),
        };
      }),
    );
  }

  // ---------------------------------------------------------
  // Enquiry validation
  // ---------------------------------------------------------

  function validateForm(): string | null {
    if (!customerId) {
      return "Please select a customer.";
    }

    if (!enquiryDate) {
      return "Please select an enquiry date.";
    }

    if (!requiredDate) {
      return "Please select the required date.";
    }

    if (requiredDate < enquiryDate) {
      return "Required date cannot be before enquiry date.";
    }

    if (items.length === 0) {
      return "Add at least one product.";
    }

    const selectedProducts = new Set<string>();

    for (const item of items) {
      if (!item.productId) {
        return "Please select a product for every line.";
      }

      if (
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        return "Quantity must be a positive whole number.";
      }

      if (selectedProducts.has(item.productId)) {
        return "The same product cannot be added more than once.";
      }

      selectedProducts.add(item.productId);
    }

    return null;
  }

  // ---------------------------------------------------------
  // Create enquiry
  // ---------------------------------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);

      const enquiry = await createEnquiry({
        customerId,
        enquiryDate,
        requiredDate,
        notes: notes.trim() || undefined,
        items,
      });

      setSuccess(
        `Enquiry ${enquiry.enquiryNumber} created successfully.`,
      );

      // Reset enquiry form after successful creation.
      setCustomerId("");

      setRequiredDate("");

      setNotes("");

      setItems([
        {
          productId: "",
          quantity: 1,
        },
      ]);

      // Refresh the enquiry list.
      await loadPageData();
    } catch (error) {
      console.error(
        "Failed to create enquiry:",
        error,
      );

      setError(
        "Unable to create enquiry. Please check the details and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------
  // Create customer
  // ---------------------------------------------------------

  async function handleCreateCustomer(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }

    try {
      setCustomerSubmitting(true);

      const customer = await createCustomer({
        name: customerName.trim(),
        email: customerEmail.trim() || undefined,
        phone: customerPhone.trim() || undefined,
      });

      // Refresh customers so the new customer appears
      // in the enquiry customer dropdown.
      const updatedCustomers = await getCustomers();

      setCustomers(updatedCustomers);

      // Automatically select the newly created customer.
      setCustomerId(customer.id);

      // Reset customer form.
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");

      // Close modal.
      setShowCustomerModal(false);

      setSuccess(
        `Customer "${customer.name}" created successfully.`,
      );
    } catch (error) {
      console.error(
        "Failed to create customer:",
        error,
      );

      setError(
        "Unable to create customer. Please check the details and try again.",
      );
    } finally {
      setCustomerSubmitting(false);
    }
  }

  // ---------------------------------------------------------
  // Logout
  // ---------------------------------------------------------

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <div className="app-shell">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="app-header">

        <div>
          <h1>ERP System</h1>
          <p>Customer Enquiries</p>
        </div>

        <div className="header-actions">

          <div className="user-info">
            <strong>{user?.email}</strong>

            <span className="role-badge">
              {user?.role}
            </span>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>

      {/* =====================================================
          NAVIGATION
          ===================================================== */}

      <nav className="app-nav">

        <button
          type="button"
          className="nav-button active"
          onClick={() => navigate("/enquiries")}
        >
          Enquiries
        </button>

        <button
          type="button"
          className="nav-button"
          onClick={() => navigate("/quotations")}
        >
          Quotations
        </button>

        <button
          type="button"
          className="nav-button"
          onClick={() => navigate("/sales-orders")}
        >
          Sales Orders
        </button>

      </nav>

      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <main className="page-content">

        {/* Page heading */}

        <section className="page-heading">

          <div>
            <h2>Enquiries</h2>

            <p>
              Create and manage customer enquiries.
            </p>
          </div>

        </section>

        {/* Alerts */}

        {error && (
          <div className="alert error-alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert success-alert">
            {success}
          </div>
        )}

        {/* =================================================
            EXISTING ENQUIRIES
            ================================================= */}

        <section className="content-card">

          <div className="card-heading">

            <div>
              <h3>Existing Enquiries</h3>

              <p className="card-description">
                Recently created customer enquiries.
              </p>
            </div>

            <span className="record-count">
              {enquiries.length} records
            </span>

          </div>

          {loading ? (
            <div className="empty-state">
              <p>Loading enquiries...</p>
            </div>
          ) : enquiries.length === 0 ? (
            <div className="empty-state">
              <p>No enquiries found.</p>
            </div>
          ) : (
            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>
                    <th>Enquiry No.</th>
                    <th>Customer</th>
                    <th>Enquiry Date</th>
                    <th>Required Date</th>
                    <th>Status</th>
                  </tr>

                </thead>

                <tbody>

                  {enquiries
                    .slice(0, 10)
                    .map((enquiry) => (
                      <tr key={enquiry.id}>

                        <td>
                          <span className="enquiry-number">
                            {enquiry.enquiryNumber}
                          </span>
                        </td>

                        <td>
                          {enquiry.customer?.name ??
                            enquiry.customerId}
                        </td>

                        <td>
                          {new Date(
                            enquiry.enquiryDate,
                          ).toLocaleDateString()}
                        </td>

                        <td>
                          {new Date(
                            enquiry.requiredDate,
                          ).toLocaleDateString()}
                        </td>

                        <td>
                          <span
                            className={`status-badge status-${enquiry.status.toLowerCase()}`}
                          >
                            {enquiry.status}
                          </span>
                        </td>

                      </tr>
                    ))}

                </tbody>

              </table>

            </div>
          )}

        </section>

        {/* =================================================
            CREATE ENQUIRY
            ================================================= */}

        <section className="content-card">

          <div className="card-heading">

            <div>
              <h3>Create Enquiry</h3>

              <p className="card-description">
                Enter customer requirements and requested
                products.
              </p>
            </div>

          </div>

          <form onSubmit={handleSubmit}>

            {/* Customer + dates */}

            <div className="form-grid">

              <div className="form-field">

                <div className="field-label-row">

                  <label htmlFor="customer">
                    Customer *
                  </label>

                  <button
                    type="button"
                    className="add-customer-button"
                    onClick={() => {
                      setError("");
                      setSuccess("");
                      setShowCustomerModal(true);
                    }}
                  >
                    + Add Customer
                  </button>

                </div>

                <select
                  id="customer"
                  value={customerId}
                  onChange={(event) =>
                    setCustomerId(
                      event.target.value,
                    )
                  }
                  required
                >

                  <option value="">
                    Select customer
                  </option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                    </option>
                  ))}

                </select>

              </div>

              <div className="form-field">

                <label htmlFor="enquiryDate">
                  Enquiry Date *
                </label>

                <input
                  id="enquiryDate"
                  type="date"
                  value={enquiryDate}
                  onChange={(event) =>
                    setEnquiryDate(
                      event.target.value,
                    )
                  }
                  required
                />

              </div>

              <div className="form-field">

                <label htmlFor="requiredDate">
                  Required Date *
                </label>

                <input
                  id="requiredDate"
                  type="date"
                  value={requiredDate}
                  min={enquiryDate}
                  onChange={(event) =>
                    setRequiredDate(
                      event.target.value,
                    )
                  }
                  required
                />

              </div>

            </div>

            {/* =================================================
                PRODUCTS
                ================================================= */}

            <div className="items-section">

              <div className="section-heading">

                <div>
                  <h4>Products</h4>

                  <p>
                    Add one or more products required by
                    the customer.
                  </p>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={addItem}
                >
                  + Add Product
                </button>

              </div>

              <div className="product-header">

                <span>Product</span>
                <span>Quantity</span>
                <span></span>

              </div>

              {items.map((item, index) => (

                <div
                  className="item-row"
                  key={index}
                >

                  <div className="form-field product-field">

                    <select
                      value={item.productId}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "productId",
                          event.target.value,
                        )
                      }
                      required
                    >

                      <option value="">
                        Select product
                      </option>

                      {products.map((product) => (
                        <option
                          key={product.id}
                          value={product.id}
                        >
                          {product.productCode} —{" "}
                          {product.name}
                        </option>
                      ))}

                    </select>

                  </div>

                  <div className="form-field quantity-field">

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "quantity",
                          event.target.value,
                        )
                      }
                      required
                    />

                  </div>

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() =>
                      removeItem(index)
                    }
                    disabled={items.length === 1}
                  >
                    Remove
                  </button>

                </div>

              ))}

            </div>

            {/* Notes */}

            <div className="form-field notes-field">

              <label htmlFor="notes">
                Notes
              </label>

              <textarea
                id="notes"
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Add any customer requirements or additional notes..."
                rows={4}
              />

            </div>

            {/* Submit */}

            <div className="form-actions">

              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                {submitting
                  ? "Creating Enquiry..."
                  : "Create Enquiry"}
              </button>

            </div>

          </form>

        </section>

      </main>

      {/* =====================================================
          ADD CUSTOMER MODAL
          ===================================================== */}

      {showCustomerModal && (

        <div
          className="modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget
            ) {
              setShowCustomerModal(false);
            }

          }}
        >

          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-customer-title"
          >

            <div className="modal-header">

              <div>
                <h3 id="add-customer-title">
                  Add Customer
                </h3>

                <p>
                  Create a customer for this enquiry.
                </p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() =>
                  setShowCustomerModal(false)
                }
                aria-label="Close"
              >
                ×
              </button>

            </div>

            <form onSubmit={handleCreateCustomer}>

              <div className="modal-form">

                <div className="form-field">

                  <label htmlFor="customerName">
                    Customer Name *
                  </label>

                  <input
                    id="customerName"
                    type="text"
                    value={customerName}
                    onChange={(event) =>
                      setCustomerName(
                        event.target.value,
                      )
                    }
                    placeholder="Enter customer name"
                    required
                    autoFocus
                  />

                </div>

                <div className="form-field">

                  <label htmlFor="customerEmail">
                    Email
                  </label>

                  <input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(event) =>
                      setCustomerEmail(
                        event.target.value,
                      )
                    }
                    placeholder="customer@example.com"
                  />

                </div>

                <div className="form-field">

                  <label htmlFor="customerPhone">
                    Phone
                  </label>

                  <input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(event) =>
                      setCustomerPhone(
                        event.target.value,
                      )
                    }
                    placeholder="Enter phone number"
                  />

                </div>

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowCustomerModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={customerSubmitting}
                >
                  {customerSubmitting
                    ? "Adding Customer..."
                    : "Add Customer"}
                </button>

              </div>

            </form>

          </section>

        </div>

      )}

    </div>
  );
}