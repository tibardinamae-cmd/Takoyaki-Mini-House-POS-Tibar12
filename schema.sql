-- Takoyaki Mini House System - MySQL Database Schema
-- Perfect for Aiven MySQL & MySQL Workbench

CREATE DATABASE IF NOT EXISTS takoyaki_db;
USE takoyaki_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'cashier'
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  category VARCHAR(50) NOT NULL,
  expiration_date VARCHAR(20) NOT NULL,
  image VARCHAR(512) NULL
);

-- 3. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(50) PRIMARY KEY,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment DECIMAL(10, 2) NOT NULL,
  `change` DECIMAL(10, 2) NOT NULL,
  created_at VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'cashier',
  operator_name VARCHAR(100) NOT NULL
);

-- 4. Transaction Items Table
CREATE TABLE IF NOT EXISTS transaction_items (
  id VARCHAR(50) PRIMARY KEY,
  transaction_id VARCHAR(50) NOT NULL,
  product_id VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Insert Default Users (Admin, Cashier, Customer)
INSERT IGNORE INTO users (id, name, username, password, role) VALUES
('1', 'Takoyaki Admin', 'admin', 'admin', 'admin'),
('2', 'Sasha Cashier', 'cashier', 'cashier', 'cashier'),
('3', 'Guest Customer', 'customer', 'guest', 'customer');


