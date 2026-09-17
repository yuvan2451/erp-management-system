import type {
  Customer,
  Product,
} from "./enquiry";

export type SalesOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "DISPATCHED"
  | "CANCELLED";

export interface Inventory {
  id: string;
  productId: string;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity?: number;
  product?: Product;
}

export interface SalesOrderItem {
  id: string;
  salesOrderId: string;
  productId: string;
  quantity: number;
  unitPrice: string | number;
  lineAmount: string | number;
  product?: Product;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  quotationId: string;
  customerId: string;
  orderDate: string;
  totalAmount: string | number;
  status: SalesOrderStatus;

  customer?: Customer;

  quotation?: {
    id: string;
    quotationNumber: string;
    enquiry?: {
      id: string;
      enquiryNumber: string;
    };
  };

  items: SalesOrderItem[];

  dispatches?: Dispatch[];

  createdAt: string;
  updatedAt: string;
}

export interface Dispatch {
  id: string;
  dispatchNumber: string;
  salesOrderId: string;
  dispatchDate: string;
  vehicleNumber: string;
  driverName: string;
  notes?: string | null;
}

export interface CreateDispatchInput {
  vehicleNumber: string;
  driverName: string;
  notes?: string;
}