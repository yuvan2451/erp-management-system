export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface Product {
  id: string;
  productCode: string;
  name: string;
  category: string;
  unit: string;
  basePrice: string;
}

export interface EnquiryItemInput {
  productId: string;
  quantity: number;
}

export interface CreateEnquiryInput {
  customerId: string;
  enquiryDate: string;
  requiredDate: string;
  notes?: string;
  items: EnquiryItemInput[];
}

export interface EnquiryItem {
  id: string;
  productId: string;
  quantity: number;
  product?: Product;
}

export interface Enquiry {
  id: string;
  enquiryNumber: string;
  customerId: string;
  enquiryDate: string;
  requiredDate: string;
  notes?: string | null;
  status: "NEW" | "QUOTED" | "WON" | "LOST";
  customer?: Customer;
  items: EnquiryItem[];
  createdAt: string;
  updatedAt: string;
}