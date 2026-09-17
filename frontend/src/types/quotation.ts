import type { Customer, Product } from "./enquiry";

export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED";

export interface QuotationItem {
  id?: string;
  productId: string;
  quantity: number;
  unitPrice: string | number;
  discountPercent: string | number;
  gstPercent: string | number;
  lineAmount?: string | number;
  product?: Product;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  enquiryId: string;
  customerId: string;
  quotationDate: string;
  validUntil: string;
  reference?: string | null;

  subtotal: string | number;
  discountAmount: string | number;
  taxAmount: string | number;
  totalAmount: string | number;

  status: QuotationStatus;

  customer?: Customer;

  enquiry?: {
    id: string;
    enquiryNumber: string;
    enquiryDate: string;
    requiredDate: string;
    status: string;
    customer?: Customer;
  };

  items: QuotationItem[];

  createdAt: string;
  updatedAt: string;
}

export interface QuotationItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  gstPercent: number;
}

export interface CreateQuotationInput {
  enquiryId: string;
  validUntil: string;
  reference?: string;
  items: QuotationItemInput[];
}