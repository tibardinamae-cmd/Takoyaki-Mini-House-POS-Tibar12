/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = 'Takoyaki' | 'Drinks' | 'Combos' | 'Add-ons';

export interface User {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'cashier' | 'customer';
  password?: string; // Optional when sending to client
}

export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number; // Represents stock quantity
  category: Category;
  expiration_date: string; // VARCHAR style e.g. "2026-12-31" or "N/A"
  image: string; // URL or preset identifier
}

export interface TransactionDetail {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  total_amount: number;
  payment: number;
  change: number;
  created_at: string; // ISO string
  role: 'cashier' | 'customer';
  operator_name: string; // Name of Cashier or Customer
  items: TransactionDetail[];
}

export interface InventoryLog {
  id: string;
  product_id: string;
  product_name: string;
  change: number; // e.g., -5, +10
  reason: 'Sale' | 'Restock' | 'Manual Adjustment' | 'Expired Discard';
  date: string;
}
