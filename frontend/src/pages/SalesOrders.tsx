import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import {
  confirmSalesOrder,
  createDispatch,
  getInventory,
  getSalesOrderById,
  getSalesOrders,
} from "../api/sales-orders.api";

import type {
  CreateDispatchInput,
  Inventory,
  SalesOrder,
} from "../types/sales-order";

import "./SalesOrders.css";

function formatCurrency(
  value: number | string,
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(
  value: string,
): string {
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

export default function SalesOrders() {
  const { user, logout } = useAuth();

  const [salesOrders, setSalesOrders] =
    useState<SalesOrder[]>([]);

  const [inventory, setInventory] =
    useState<Inventory[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedOrder, setSelectedOrder] =
    useState<SalesOrder | null>(null);

  const [showDetails, setShowDetails] =
    useState(false);

  const [showDispatchForm, setShowDispatchForm] =
    useState(false);

  const [vehicleNumber, setVehicleNumber] =
    useState("");

  const [driverName, setDriverName] =
    useState("");

  const [dispatchNotes, setDispatchNotes] =
    useState("");

  const [actionId, setActionId] =
    useState<string | null>(null);

  const [submittingDispatch, setSubmittingDispatch] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const isAdmin =
    user?.role === "ADMIN";

  async function loadData() {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        orderData,
        inventoryData,
      ] = await Promise.all([
        getSalesOrders(),
        getInventory(),
      ]);

      setSalesOrders(
        Array.isArray(orderData)
          ? orderData
          : [],
      );

      setInventory(
        Array.isArray(inventoryData)
          ? inventoryData
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

  const pendingCount = useMemo(
    () =>
      salesOrders.filter(
        (order) =>
          order.status === "PENDING",
      ).length,
    [salesOrders],
  );

  const confirmedCount = useMemo(
    () =>
      salesOrders.filter(
        (order) =>
          order.status === "CONFIRMED",
      ).length,
    [salesOrders],
  );

  const dispatchedCount = useMemo(
    () =>
      salesOrders.filter(
        (order) =>
          order.status === "DISPATCHED",
      ).length,
    [salesOrders],
  );

  async function handleViewOrder(
    orderId: string,
  ) {
    try {
      setErrorMessage("");

      const order =
        await getSalesOrderById(
          orderId,
        );

      setSelectedOrder(order);
      setShowDetails(true);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error),
      );
    }
  }

  function closeDetails() {
    if (submittingDispatch) {
      return;
    }

    setShowDetails(false);
    setShowDispatchForm(false);
    setSelectedOrder(null);
    resetDispatchForm();
  }

  function resetDispatchForm() {
    setVehicleNumber("");
    setDriverName("");
    setDispatchNotes("");
  }

  function openDispatchForm(
    order: SalesOrder,
  ) {
    setSelectedOrder(order);
    setShowDetails(true);
    setShowDispatchForm(true);
    setErrorMessage("");
    setSuccessMessage("");
    resetDispatchForm();
  }

  async function handleConfirm(
    orderId: string,
  ) {
    try {
      setActionId(orderId);
      setErrorMessage("");
      setSuccessMessage("");

      const updatedOrder =
        await confirmSalesOrder(
          orderId,
        );

      setSuccessMessage(
        `${updatedOrder.orderNumber} confirmed and inventory reserved successfully.`,
      );

      if (
        selectedOrder?.id ===
        updatedOrder.id
      ) {
        setSelectedOrder(
          updatedOrder,
        );
      }

      await loadData();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error),
      );
    } finally {
      setActionId(null);
    }
  }

  function validateDispatch(): string | null {
    if (!selectedOrder) {
      return "No Sales Order selected.";
    }

    if (
      selectedOrder.status !==
      "CONFIRMED"
    ) {
      return "Only CONFIRMED Sales Orders can be dispatched.";
    }

    if (!vehicleNumber.trim()) {
      return "Vehicle number is required.";
    }

    if (!driverName.trim()) {
      return "Driver name is required.";
    }

    return null;
  }

  async function handleDispatch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const validationError =
      validateDispatch();

    if (validationError) {
      setErrorMessage(
        validationError,
      );
      return;
    }

    const input:
      CreateDispatchInput = {
      vehicleNumber:
        vehicleNumber.trim(),
      driverName:
        driverName.trim(),
      notes:
        dispatchNotes.trim() ||
        undefined,
    };

    if (!selectedOrder) {
      return;
    }

    try {
      setSubmittingDispatch(true);

      const response =
        await createDispatch(
          selectedOrder.id,
          input,
        );

      setSuccessMessage(
        response.message ??
          "Sales Order dispatched successfully.",
      );

      setShowDispatchForm(false);
      resetDispatchForm();

      await loadData();

      const updatedOrder =
        await getSalesOrderById(
          selectedOrder.id,
        );

      setSelectedOrder(
        updatedOrder,
      );
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error),
      );
    } finally {
      setSubmittingDispatch(false);
    }
  }

  function getInventoryForProduct(
    productId: string,
  ) {
    return inventory.find(
      (record) =>
        record.productId ===
        productId,
    );
  }

  function getAvailableQuantity(
    record?: Inventory,
  ): number {
    if (!record) {
      return 0;
    }

    if (
      record.availableQuantity !==
      undefined
    ) {
      return Number(
        record.availableQuantity,
      );
    }

    return (
      Number(
        record.physicalQuantity,
      ) -
      Number(
        record.reservedQuantity,
      )
    );
  }

  return (
    <div className="app-shell sales-orders-page">
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

          <Link to="/quotations">
            Quotations
          </Link>

          <Link
            to="/sales-orders"
            className="active"
          >
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
          MAIN
          ================================================= */}

      <main className="page-container">
        <section className="page-header">
          <div>
            <p className="eyebrow">
              ORDER MANAGEMENT
            </p>

            <h2>
              Sales Orders
            </h2>

            <p className="page-description">
              Confirm orders, manage inventory
              reservations and process dispatch.
            </p>
          </div>
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
            SUMMARY CARDS
            ================================================= */}

        <section className="order-summary-grid">
          <div className="order-summary-card">
            <span>
              Total Orders
            </span>

            <strong>
              {salesOrders.length}
            </strong>
          </div>

          <div className="order-summary-card">
            <span>
              Pending
            </span>

            <strong>
              {pendingCount}
            </strong>
          </div>

          <div className="order-summary-card">
            <span>
              Confirmed
            </span>

            <strong>
              {confirmedCount}
            </strong>
          </div>

          <div className="order-summary-card">
            <span>
              Dispatched
            </span>

            <strong>
              {dispatchedCount}
            </strong>
          </div>
        </section>

        {/* =================================================
            SALES ORDER REGISTER
            ================================================= */}

        <section className="content-card">
          <div className="content-card-header">
            <div>
              <h3>
                Sales Order Register
              </h3>

              <p>
                View and process customer sales
                orders.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="loading-spinner" />

              <p>
                Loading sales orders...
              </p>
            </div>
          ) : salesOrders.length ===
            0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                SO
              </div>

              <h3>
                No sales orders yet
              </h3>

              <p>
                Accepted quotations will appear
                here after conversion.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      Sales Order
                    </th>

                    <th>
                      Quotation
                    </th>

                    <th>
                      Customer
                    </th>

                    <th>
                      Order Date
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
                  {salesOrders.map(
                    (order) => {
                      const busy =
                        actionId ===
                        order.id;

                      return (
                        <tr
                          key={
                            order.id
                          }
                        >
                          <td>
                            <strong>
                              {
                                order.orderNumber
                              }
                            </strong>
                          </td>

                          <td>
                            {order.quotation
                              ?.quotationNumber ??
                              "-"}
                          </td>

                          <td>
                            {order.customer
                              ?.name ??
                              "-"}
                          </td>

                          <td>
                            {formatDate(
                              order.orderDate,
                            )}
                          </td>

                          <td>
                            <strong>
                              {formatCurrency(
                                order.totalAmount,
                              )}
                            </strong>
                          </td>

                          <td>
                            <span
                              className={`status-badge status-${order.status.toLowerCase()}`}
                            >
                              {
                                order.status
                              }
                            </span>
                          </td>

                          <td>
                            <div className="action-group">
                              <button
                                className="btn btn-small btn-secondary"
                                onClick={() =>
                                  handleViewOrder(
                                    order.id,
                                  )
                                }
                              >
                                View
                              </button>

                              {isAdmin &&
                                order.status ===
                                  "PENDING" && (
                                  <button
                                    className="btn btn-small btn-primary"
                                    disabled={
                                      busy
                                    }
                                    onClick={() =>
                                      handleConfirm(
                                        order.id,
                                      )
                                    }
                                  >
                                    {busy
                                      ? "Confirming..."
                                      : "Confirm"}
                                  </button>
                                )}

                              {isAdmin &&
                                order.status ===
                                  "CONFIRMED" && (
                                  <button
                                    className="btn btn-small btn-primary"
                                    onClick={() =>
                                      openDispatchForm(
                                        order,
                                      )
                                    }
                                  >
                                    Dispatch
                                  </button>
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

        {/* =================================================
            ORDER DETAILS
            ================================================= */}

        {showDetails &&
          selectedOrder && (
            <div className="modal-overlay">
              <section className="order-modal">
                <div className="order-modal-header">
                  <div>
                    <p className="eyebrow">
                      SALES ORDER
                    </p>

                    <h3>
                      {
                        selectedOrder.orderNumber
                      }
                    </h3>

                    <p>
                      {selectedOrder.customer
                        ?.name ??
                        "Customer"}
                    </p>
                  </div>

                  <button
                    className="modal-close"
                    onClick={
                      closeDetails
                    }
                    disabled={
                      submittingDispatch
                    }
                  >
                    ×
                  </button>
                </div>

                <div className="order-details-grid">
                  <div>
                    <span>
                      Sales Order
                    </span>

                    <strong>
                      {
                        selectedOrder.orderNumber
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Quotation
                    </span>

                    <strong>
                      {selectedOrder
                        .quotation
                        ?.quotationNumber ??
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Customer
                    </span>

                    <strong>
                      {selectedOrder
                        .customer
                        ?.name ??
                        "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Order Date
                    </span>

                    <strong>
                      {formatDate(
                        selectedOrder.orderDate,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Status
                    </span>

                    <strong>
                      <span
                        className={`status-badge status-${selectedOrder.status.toLowerCase()}`}
                      >
                        {
                          selectedOrder.status
                        }
                      </span>
                    </strong>
                  </div>

                  <div>
                    <span>
                      Total
                    </span>

                    <strong>
                      {formatCurrency(
                        selectedOrder.totalAmount,
                      )}
                    </strong>
                  </div>
                </div>

                {/* Products */}

                <div className="modal-section">
                  <div className="section-heading">
                    <div>
                      <h4>
                        Order Items
                      </h4>

                      <p>
                        Products included in this
                        Sales Order.
                      </p>
                    </div>
                  </div>

                  <div className="quotation-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>
                            Product
                          </th>

                          <th>
                            Quantity
                          </th>

                          <th>
                            Unit Price
                          </th>

                          <th>
                            Line Amount
                          </th>

                          <th>
                            Available
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedOrder.items.map(
                          (item) => {
                            const stock =
                              getInventoryForProduct(
                                item.productId,
                              );

                            return (
                              <tr
                                key={
                                  item.id
                                }
                              >
                                <td>
                                  <strong>
                                    {item
                                      .product
                                      ?.productCode ??
                                      "-"}

                                  </strong>

                                  <span className="table-secondary-text">
                                    {item
                                      .product
                                      ?.name ??
                                      "Product"}
                                  </span>
                                </td>

                                <td>
                                  {
                                    item.quantity
                                  }
                                </td>

                                <td>
                                  {formatCurrency(
                                    item.unitPrice,
                                  )}
                                </td>

                                <td>
                                  <strong>
                                    {formatCurrency(
                                      item.lineAmount,
                                    )}
                                  </strong>
                                </td>

                                <td>
                                  <span
                                    className={
                                      getAvailableQuantity(
                                        stock,
                                      ) >=
                                      item.quantity
                                        ? "stock-ok"
                                        : "stock-low"
                                    }
                                  >
                                    {
                                      getAvailableQuantity(
                                        stock,
                                      )
                                    }
                                  </span>
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Inventory */}

                <div className="modal-section">
                  <div className="section-heading">
                    <div>
                      <h4>
                        Inventory
                      </h4>

                      <p>
                        Current physical, reserved and
                        available stock.
                      </p>
                    </div>
                  </div>

                  <div className="inventory-grid">
                    {selectedOrder.items.map(
                      (item) => {
                        const stock =
                          getInventoryForProduct(
                            item.productId,
                          );

                        return (
                          <div
                            className="inventory-card"
                            key={
                              item.productId
                            }
                          >
                            <div className="inventory-card-header">
                              <strong>
                                {item.product
                                  ?.productCode ??
                                  "-"}
                              </strong>

                              <span>
                                {item
                                  .product
                                  ?.name ??
                                  "Product"}
                              </span>
                            </div>

                            <div className="inventory-values">
                              <div>
                                <span>
                                  Physical
                                </span>

                                <strong>
                                  {
                                    stock
                                      ?.physicalQuantity ??
                                    0
                                  }
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Reserved
                                </span>

                                <strong>
                                  {
                                    stock
                                      ?.reservedQuantity ??
                                    0
                                  }
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Available
                                </span>

                                <strong>
                                  {
                                    getAvailableQuantity(
                                      stock,
                                    )
                                  }
                                </strong>
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                {/* Dispatch */}

                {showDispatchForm &&
                  selectedOrder.status ===
                    "CONFIRMED" && (
                    <div className="dispatch-panel">
                      <div className="section-heading">
                        <div>
                          <h4>
                            Process Dispatch
                          </h4>

                          <p>
                            Enter vehicle and driver
                            information.
                          </p>
                        </div>
                      </div>

                      <form
                        className="erp-form"
                        onSubmit={
                          handleDispatch
                        }
                      >
                        <div className="form-grid">
                          <div className="form-group">
                            <label>
                              Vehicle Number *
                            </label>

                            <input
                              value={
                                vehicleNumber
                              }
                              onChange={(
                                event,
                              ) =>
                                setVehicleNumber(
                                  event.target
                                    .value,
                                )
                              }
                              placeholder="KA01AB1234"
                              disabled={
                                submittingDispatch
                              }
                            />
                          </div>

                          <div className="form-group">
                            <label>
                              Driver Name *
                            </label>

                            <input
                              value={
                                driverName
                              }
                              onChange={(
                                event,
                              ) =>
                                setDriverName(
                                  event.target
                                    .value,
                                )
                              }
                              placeholder="Driver name"
                              disabled={
                                submittingDispatch
                              }
                            />
                          </div>

                          <div className="form-group full-width">
                            <label>
                              Notes
                            </label>

                            <textarea
                              value={
                                dispatchNotes
                              }
                              onChange={(
                                event,
                              ) =>
                                setDispatchNotes(
                                  event.target
                                    .value,
                                )
                              }
                              placeholder="Optional dispatch notes"
                              rows={3}
                              disabled={
                                submittingDispatch
                              }
                            />
                          </div>
                        </div>

                        <div className="dispatch-warning">
                          Dispatching this order will
                          decrease both physical and
                          reserved inventory.
                        </div>

                        <div className="form-actions">
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => {
                              setShowDispatchForm(
                                false,
                              );
                              resetDispatchForm();
                            }}
                            disabled={
                              submittingDispatch
                            }
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={
                              submittingDispatch
                            }
                          >
                            {submittingDispatch
                              ? "Processing..."
                              : "Confirm Dispatch"}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                {/* Existing dispatch */}

                {selectedOrder.dispatches &&
                  selectedOrder.dispatches
                    .length > 0 && (
                    <div className="modal-section">
                      <div className="section-heading">
                        <div>
                          <h4>
                            Dispatch
                          </h4>

                          <p>
                            Dispatch information for this
                            Sales Order.
                          </p>
                        </div>
                      </div>

                      {selectedOrder.dispatches.map(
                        (dispatch) => (
                          <div
                            className="dispatch-record"
                            key={
                              dispatch.id
                            }
                          >
                            <div>
                              <span>
                                Dispatch Number
                              </span>

                              <strong>
                                {
                                  dispatch.dispatchNumber
                                }
                              </strong>
                            </div>

                            <div>
                              <span>
                                Date
                              </span>

                              <strong>
                                {formatDate(
                                  dispatch.dispatchDate,
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Vehicle
                              </span>

                              <strong>
                                {
                                  dispatch.vehicleNumber
                                }
                              </strong>
                            </div>

                            <div>
                              <span>
                                Driver
                              </span>

                              <strong>
                                {
                                  dispatch.driverName
                                }
                              </strong>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}

                <div className="modal-footer">
                  {isAdmin &&
                    selectedOrder.status ===
                      "CONFIRMED" &&
                    !showDispatchForm && (
                      <button
                        className="btn btn-primary"
                        onClick={() =>
                          openDispatchForm(
                            selectedOrder,
                          )
                        }
                      >
                        Process Dispatch
                      </button>
                    )}

                  <button
                    className="btn btn-outline"
                    onClick={
                      closeDetails
                    }
                    disabled={
                      submittingDispatch
                    }
                  >
                    Close
                  </button>
                </div>
              </section>
            </div>
          )}
      </main>
    </div>
  );
}