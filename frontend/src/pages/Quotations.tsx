import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import {
  getEnquiries,
  getProducts,
} from "../api/enquiries.api";

import {
  createQuotation,
  getQuotations,
  updateQuotationStatus,
  convertQuotation,
} from "../api/quotations.api";

import type {
  Enquiry,
  Product,
} from "../types/enquiry";

import type {
  CreateQuotationInput,
  Quotation,
  QuotationItemInput,
} from "../types/quotation";

import "./Quotations.css";

function formatCurrency(
  value: number | string,
): string {
  const amount = Number(value);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
}

function getToday(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultValidUntil(): string {
  const date = new Date();

  date.setDate(date.getDate() + 15);

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
            error?: string;
          };
        };
      }
    ).response;

    return (
      response?.data?.message ??
      response?.data?.error ??
      "The request could not be completed."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "The request could not be completed.";
}

interface FormItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  gstPercent: number;
}

function createEmptyItem(): FormItem {
  return {
    productId: "",
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0,
    gstPercent: 18,
  };
}

function calculateLine(
  item: FormItem,
) {
  const gross =
    item.quantity *
    item.unitPrice;

  const discount =
    gross *
    (item.discountPercent / 100);

  const afterDiscount =
    gross - discount;

  const gst =
    afterDiscount *
    (item.gstPercent / 100);

  const lineAmount =
    afterDiscount + gst;

  return {
    gross,
    discount,
    gst,
    lineAmount,
  };
}

export default function Quotations() {
  const { user, logout } = useAuth();

  const [quotations, setQuotations] =
    useState<Quotation[]>([]);

  const [enquiries, setEnquiries] =
    useState<Enquiry[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [showForm, setShowForm] =
    useState(false);

  const [selectedEnquiryId, setSelectedEnquiryId] =
    useState("");

  const [validUntil, setValidUntil] =
    useState(getDefaultValidUntil());

  const [reference, setReference] =
    useState("");

  const [items, setItems] =
    useState<FormItem[]>([
      createEmptyItem(),
    ]);

  const [submitting, setSubmitting] =
    useState(false);

  const [actionId, setActionId] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        quotationData,
        enquiryData,
        productData,
      ] = await Promise.all([
        getQuotations(),
        getEnquiries(),
        getProducts(),
      ]);

      setQuotations(
        Array.isArray(quotationData)
          ? quotationData
          : [],
      );

      setEnquiries(
        Array.isArray(enquiryData)
          ? enquiryData
          : [],
      );

      setProducts(
        Array.isArray(productData)
          ? productData
          : [],
      );
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedEnquiry =
    useMemo(
      () =>
        enquiries.find(
          (enquiry) =>
            enquiry.id ===
            selectedEnquiryId,
        ),
      [
        enquiries,
        selectedEnquiryId,
      ],
    );

  const availableEnquiries =
    useMemo(
      () =>
        enquiries.filter(
          (enquiry) =>
            enquiry.status !==
            "LOST",
        ),
      [enquiries],
    );

  const totals = useMemo(() => {
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    for (const item of items) {
      const line =
        calculateLine(item);

      subtotal += line.gross;
      discountAmount +=
        line.discount;
      taxAmount += line.gst;
      totalAmount +=
        line.lineAmount;
    }

    return {
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
    };
  }, [items]);

  function resetForm() {
    setSelectedEnquiryId("");
    setValidUntil(
      getDefaultValidUntil(),
    );
    setReference("");
    setItems([
      createEmptyItem(),
    ]);
  }

  function openCreateForm() {
    setErrorMessage("");
    setSuccessMessage("");
    resetForm();
    setShowForm(true);
  }

  function closeCreateForm() {
    if (submitting) {
      return;
    }

    setShowForm(false);
    resetForm();
  }

  function handleEnquiryChange(
    enquiryId: string,
  ) {
    setSelectedEnquiryId(
      enquiryId,
    );

    const enquiry =
      enquiries.find(
        (item) =>
          item.id ===
          enquiryId,
      );

    if (!enquiry) {
      setItems([
        createEmptyItem(),
      ]);
      return;
    }

    if (
      !enquiry.items ||
      enquiry.items.length === 0
    ) {
      setItems([
        createEmptyItem(),
      ]);
      return;
    }

    const mappedItems =
      enquiry.items.map(
        (enquiryItem) => {
          const product =
            products.find(
              (item) =>
                item.id ===
                enquiryItem.productId,
            );

          return {
            productId:
              enquiryItem.productId,
            quantity:
              enquiryItem.quantity,
            unitPrice: product
              ? Number(
                  product.basePrice,
                )
              : 0,
            discountPercent: 0,
            gstPercent: 18,
          };
        },
      );

    setItems(mappedItems);
  }

  function handleProductChange(
    index: number,
    productId: string,
  ) {
    const product =
      products.find(
        (item) =>
          item.id ===
          productId,
      );

    setItems(
      (currentItems) =>
        currentItems.map(
          (item, itemIndex) => {
            if (
              itemIndex !==
              index
            ) {
              return item;
            }

            return {
              ...item,
              productId,
              unitPrice:
                product
                  ? Number(
                      product.basePrice,
                    )
                  : 0,
            };
          },
        ),
    );
  }

  function updateItem(
    index: number,
    field: keyof FormItem,
    value: string,
  ) {
    const numericFields:
      Array<keyof FormItem> = [
        "quantity",
        "unitPrice",
        "discountPercent",
        "gstPercent",
      ];

    setItems(
      (currentItems) =>
        currentItems.map(
          (item, itemIndex) => {
            if (
              itemIndex !==
              index
            ) {
              return item;
            }

            if (
              numericFields.includes(
                field,
              )
            ) {
              const numericValue =
                value === ""
                  ? 0
                  : Number(value);

              return {
                ...item,
                [field]:
                  Number.isFinite(
                    numericValue,
                  )
                    ? numericValue
                    : 0,
              };
            }

            return {
              ...item,
              [field]: value,
            };
          },
        ),
    );
  }

  function addItem() {
    setItems(
      (currentItems) => [
        ...currentItems,
        createEmptyItem(),
      ],
    );
  }

  function removeItem(
    index: number,
  ) {
    if (items.length === 1) {
      return;
    }

    setItems(
      (currentItems) =>
        currentItems.filter(
          (_, itemIndex) =>
            itemIndex !==
            index,
        ),
    );
  }

  function validateForm():
    string | null {
    if (!selectedEnquiryId) {
      return "Please select an enquiry.";
    }

    if (!validUntil) {
      return "Please select a valid-until date.";
    }

    if (
      validUntil <
      getToday()
    ) {
      return "Valid-until date cannot be in the past.";
    }

    if (
      selectedEnquiry &&
      validUntil <
        selectedEnquiry.enquiryDate.slice(
          0,
          10,
        )
    ) {
      return "Valid-until date cannot be before the enquiry date.";
    }

    if (items.length === 0) {
      return "At least one quotation item is required.";
    }

    const productIds =
      new Set<string>();

    for (const item of items) {
      if (!item.productId) {
        return "Please select a product for every line.";
      }

      if (
        productIds.has(
          item.productId,
        )
      ) {
        return "The same product cannot appear more than once.";
      }

      productIds.add(
        item.productId,
      );

      if (
        !Number.isInteger(
          item.quantity,
        ) ||
        item.quantity <= 0
      ) {
        return "Quantity must be a positive whole number.";
      }

      if (
        !Number.isFinite(
          item.unitPrice,
        ) ||
        item.unitPrice < 0
      ) {
        return "Unit price cannot be negative.";
      }

      if (
        item.discountPercent <
          0 ||
        item.discountPercent >
          100
      ) {
        return "Discount must be between 0% and 100%.";
      }

      if (
        item.gstPercent <
          0 ||
        item.gstPercent >
          100
      ) {
        return "GST must be between 0% and 100%.";
      }
    }

    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const validationError =
      validateForm();

    if (validationError) {
      setErrorMessage(
        validationError,
      );
      return;
    }

    const payload:
      CreateQuotationInput = {
      enquiryId:
        selectedEnquiryId,
      validUntil,
      reference:
        reference.trim() ||
        undefined,
      items: items.map(
        (
          item,
        ): QuotationItemInput => ({
          productId:
            item.productId,
          quantity:
            item.quantity,
          unitPrice:
            item.unitPrice,
          discountPercent:
            item.discountPercent,
          gstPercent:
            item.gstPercent,
        }),
      ),
    };

    try {
      setSubmitting(true);

      const quotation =
        await createQuotation(
          payload,
        );

      setSuccessMessage(
        `${quotation.quotationNumber} created successfully as DRAFT.`,
      );

      setShowForm(false);
      resetForm();

      await loadData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(
    quotationId: string,
    status:
      | "SENT"
      | "ACCEPTED"
      | "REJECTED",
  ) {
    try {
      setActionId(
        quotationId,
      );
      setErrorMessage("");
      setSuccessMessage("");

      const quotation =
        await updateQuotationStatus(
          quotationId,
          status,
        );

      setSuccessMessage(
        `${quotation.quotationNumber} changed to ${status}.`,
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error),
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleConvert(
    quotationId: string,
  ) {
    try {
      setActionId(
        quotationId,
      );
      setErrorMessage("");
      setSuccessMessage("");

      const response =
        await convertQuotation(
          quotationId,
        );

      setSuccessMessage(
        response.message ??
          "Quotation converted to Sales Order successfully.",
      );

      await loadData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error),
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="app-shell quotation-page">
      {/* =================================================
          HEADER
          ================================================= */}

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            ERP
          </div>

          <div>
            <h1>
              ERP Management System
            </h1>

            <span>
              Sales & Operations
            </span>
          </div>
        </div>

        <nav className="main-nav">
          <Link to="/enquiries">
            Enquiries
          </Link>

          <Link
            to="/quotations"
            className="active"
          >
            Quotations
          </Link>

          <Link to="/sales-orders">
            Sales Orders
          </Link>
        </nav>

        <div className="user-menu">
          <div className="user-info">
            <strong>
              {user?.email}
            </strong>

            <span>
              {user?.role ===
              "ADMIN"
                ? "Administrator"
                : "Sales User"}
            </span>
          </div>

          <button
            className="btn btn-outline"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      {/* =================================================
          MAIN CONTENT
          ================================================= */}

      <main className="page-container">
        <section className="page-header">
          <div>
            <p className="eyebrow">
              SALES MANAGEMENT
            </p>

            <h2>
              Quotations
            </h2>

            <p className="page-description">
              Create and manage customer
              quotations.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={
              openCreateForm
            }
          >
            + New Quotation
          </button>
        </section>

        {/* Alerts */}

        {successMessage && (
          <div className="alert alert-success">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-error">
            {errorMessage}
          </div>
        )}

        {/* =================================================
            CREATE QUOTATION FORM
            ================================================= */}

        {showForm && (
          <section className="form-card">
            <div className="form-card-header">
              <div>
                <p className="eyebrow">
                  NEW QUOTATION
                </p>

                <h3>
                  Create Quotation
                </h3>

                <p>
                  Create a quotation from
                  an existing customer
                  enquiry.
                </p>
              </div>

              <button
                className="btn btn-outline"
                onClick={
                  closeCreateForm
                }
                disabled={
                  submitting
                }
              >
                Cancel
              </button>
            </div>

            <form
              className="erp-form"
              onSubmit={
                handleSubmit
              }
            >
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    Enquiry *
                  </label>

                  <select
                    value={
                      selectedEnquiryId
                    }
                    onChange={(
                      event,
                    ) =>
                      handleEnquiryChange(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      submitting
                    }
                  >
                    <option value="">
                      Select an enquiry
                    </option>

                    {availableEnquiries.map(
                      (
                        enquiry,
                      ) => (
                        <option
                          key={
                            enquiry.id
                          }
                          value={
                            enquiry.id
                          }
                        >
                          {
                            enquiry.enquiryNumber
                          }{" "}
                          —{" "}
                          {enquiry
                            .customer
                            ?.name ??
                            "Customer"}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Customer
                  </label>

                  <input
                    value={
                      selectedEnquiry
                        ?.customer
                        ?.name ??
                      ""
                    }
                    placeholder="Customer appears after selecting an enquiry"
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label>
                    Valid Until *
                  </label>

                  <input
                    type="date"
                    value={
                      validUntil
                    }
                    min={getToday()}
                    onChange={(
                      event,
                    ) =>
                      setValidUntil(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      submitting
                    }
                  />
                </div>

                <div className="form-group">
                  <label>
                    Reference
                  </label>

                  <input
                    value={
                      reference
                    }
                    onChange={(
                      event,
                    ) =>
                      setReference(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Optional reference"
                    disabled={
                      submitting
                    }
                  />
                </div>
              </div>

              {/* Enquiry information */}

              {selectedEnquiry && (
                <div className="selected-enquiry-info">
                  <div>
                    <span>
                      Enquiry
                    </span>

                    <strong>
                      {
                        selectedEnquiry.enquiryNumber
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Enquiry Date
                    </span>

                    <strong>
                      {formatDate(
                        selectedEnquiry.enquiryDate,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Required Date
                    </span>

                    <strong>
                      {formatDate(
                        selectedEnquiry.requiredDate,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Customer
                    </span>

                    <strong>
                      {
                        selectedEnquiry
                          .customer
                          ?.name
                      }
                    </strong>
                  </div>
                </div>
              )}

              {/* Items */}

              <div className="section-heading">
                <div>
                  <h4>
                    Quotation Items
                  </h4>

                  <p>
                    Configure quantity,
                    pricing, discount
                    and GST.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={
                    addItem
                  }
                  disabled={
                    submitting
                  }
                >
                  + Add Item
                </button>
              </div>

              <div className="quotation-table-wrapper">
                <table className="data-table quotation-items-table">
                  <thead>
                    <tr>
                      <th>
                        Product
                      </th>

                      <th>
                        Qty
                      </th>

                      <th>
                        Unit Price
                      </th>

                      <th>
                        Discount
                      </th>

                      <th>
                        GST
                      </th>

                      <th>
                        Line Amount
                      </th>

                      <th>
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map(
                      (
                        item,
                        index,
                      ) => {
                        const line =
                          calculateLine(
                            item,
                          );

                        return (
                          <tr
                            key={`${index}-${item.productId}`}
                          >
                            <td>
                              <select
                                value={
                                  item.productId
                                }
                                onChange={(
                                  event,
                                ) =>
                                  handleProductChange(
                                    index,
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                disabled={
                                  submitting
                                }
                              >
                                <option value="">
                                  Select product
                                </option>

                                {products.map(
                                  (
                                    product,
                                  ) => (
                                    <option
                                      key={
                                        product.id
                                      }
                                      value={
                                        product.id
                                      }
                                    >
                                      {
                                        product.productCode
                                      }{" "}
                                      —{" "}
                                      {
                                        product.name
                                      }
                                    </option>
                                  ),
                                )}
                              </select>
                            </td>

                            <td>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={
                                  item.quantity
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateItem(
                                    index,
                                    "quantity",
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                disabled={
                                  submitting
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.unitPrice
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateItem(
                                    index,
                                    "unitPrice",
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                disabled={
                                  submitting
                                }
                              />
                            </td>

                            <td>
                              <div className="input-with-suffix">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={
                                    item.discountPercent
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateItem(
                                      index,
                                      "discountPercent",
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  disabled={
                                    submitting
                                  }
                                />

                                <span>
                                  %
                                </span>
                              </div>
                            </td>

                            <td>
                              <div className="input-with-suffix">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={
                                    item.gstPercent
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    updateItem(
                                      index,
                                      "gstPercent",
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  disabled={
                                    submitting
                                  }
                                />

                                <span>
                                  %
                                </span>
                              </div>
                            </td>

                            <td>
                              <strong className="line-amount">
                                {formatCurrency(
                                  line.lineAmount,
                                )}
                              </strong>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="remove-item-btn"
                                onClick={() =>
                                  removeItem(
                                    index,
                                  )
                                }
                                disabled={
                                  submitting ||
                                  items.length ===
                                    1
                                }
                                title="Remove item"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}

              <div className="quotation-summary">
                <div className="summary-row">
                  <span>
                    Subtotal
                  </span>

                  <strong>
                    {formatCurrency(
                      totals.subtotal,
                    )}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>
                    Discount
                  </span>

                  <strong>
                    -{" "}
                    {formatCurrency(
                      totals.discountAmount,
                    )}
                  </strong>
                </div>

                <div className="summary-row">
                  <span>
                    GST
                  </span>

                  <strong>
                    {formatCurrency(
                      totals.taxAmount,
                    )}
                  </strong>
                </div>

                <div className="summary-total">
                  <span>
                    Grand Total
                  </span>

                  <strong>
                    {formatCurrency(
                      totals.totalAmount,
                    )}
                  </strong>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={
                    closeCreateForm
                  }
                  disabled={
                    submitting
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    submitting
                  }
                >
                  {submitting
                    ? "Saving..."
                    : "Save Draft"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* =================================================
            QUOTATION REGISTER
            ================================================= */}

        <section className="content-card">
          <div className="content-card-header">
            <div>
              <h3>
                Quotation Register
              </h3>

              <p>
                {quotations.length} quotation
                {quotations.length ===
                1
                  ? ""
                  : "s"} in the system
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="loading-spinner" />

              <p>
                Loading quotations...
              </p>
            </div>
          ) : quotations.length ===
            0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                Q
              </div>

              <h3>
                No quotations yet
              </h3>

              <p>
                Create a quotation from
                an existing enquiry.
              </p>

              <button
                className="btn btn-primary"
                onClick={
                  openCreateForm
                }
              >
                + Create Quotation
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      Quotation
                    </th>

                    <th>
                      Enquiry
                    </th>

                    <th>
                      Customer
                    </th>

                    <th>
                      Valid Until
                    </th>

                    <th>
                      Total
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {quotations.map(
                    (
                      quotation,
                    ) => {
                      const busy =
                        actionId ===
                        quotation.id;

                      return (
                        <tr
                          key={
                            quotation.id
                          }
                        >
                          <td>
                            <strong>
                              {
                                quotation.quotationNumber
                              }
                            </strong>

                            {quotation.reference && (
                              <span className="table-secondary-text">
                                {
                                  quotation.reference
                                }
                              </span>
                            )}
                          </td>

                          <td>
                            {quotation
                              .enquiry
                              ?.enquiryNumber ??
                              "-"}
                          </td>

                          <td>
                            {quotation
                              .customer
                              ?.name ??
                              quotation
                                .enquiry
                                ?.customer
                                ?.name ??
                              "-"}
                          </td>

                          <td>
                            {formatDate(
                              quotation.validUntil,
                            )}
                          </td>

                          <td>
                            <strong>
                              {formatCurrency(
                                quotation.totalAmount,
                              )}
                            </strong>
                          </td>

                          <td>
                            <span
                              className={`status-badge status-${quotation.status.toLowerCase()}`}
                            >
                              {
                                quotation.status
                              }
                            </span>
                          </td>

                          <td>
                            <div className="action-group">
                              {quotation.status ===
                                "DRAFT" && (
                                <button
                                  className="btn btn-small btn-secondary"
                                  disabled={
                                    busy
                                  }
                                  onClick={() =>
                                    handleStatusChange(
                                      quotation.id,
                                      "SENT",
                                    )
                                  }
                                >
                                  {busy
                                    ? "..."
                                    : "Send"}
                                </button>
                              )}

                              {quotation.status ===
                                "SENT" && (
                                <>
                                  <button
                                    className="btn btn-small btn-primary"
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      handleStatusChange(
                                        quotation.id,
                                        "ACCEPTED",
                                      )
                                    }
                                  >
                                    {busy
                                      ? "..."
                                      : "Accept"}
                                  </button>

                                  <button
                                    className="btn btn-small btn-danger"
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      handleStatusChange(
                                        quotation.id,
                                        "REJECTED",
                                      )
                                    }
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {quotation.status ===
                                "ACCEPTED" && (
                                <button
                                  className="btn btn-small btn-primary"
                                  disabled={
                                    busy
                                  }
                                  onClick={() =>
                                    handleConvert(
                                      quotation.id,
                                    )
                                  }
                                >
                                  {busy
                                    ? "Converting..."
                                    : "Convert to SO"}
                                </button>
                              )}

                              {quotation.status ===
                                "REJECTED" && (
                                <span className="table-secondary-text">
                                  Closed
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}