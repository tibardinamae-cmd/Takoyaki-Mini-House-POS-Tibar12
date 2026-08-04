/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import mysql from 'mysql2/promise';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.join(process.cwd(), 'database.json');

app.use(express.json());

// Fallback JSON-file database default payload (if database.json is empty or deleted)
const getInitialDB = () => {
  return {
    users: [
      { id: '1', name: 'Takoyaki Admin', username: 'admin', role: 'admin', password: 'admin' },
      { id: '2', name: 'Sasha Cashier', username: 'cashier', role: 'cashier', password: 'cashier' },
      { id: '3', name: 'Guest Customer', username: 'customer', role: 'customer', password: 'guest' }
    ],
    products: [],
    transactions: []
  };
};

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDB();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return getInitialDB();
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing database:', error);
  }
}

// -------------------------------------------------------------
// MySQL Database Connectivity & Schema Setup
// -------------------------------------------------------------
let pool = null;
let useMySQL = false;

if (process.env.MYSQL_HOST) {
  try {
    const poolConfig = {
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
    
    if (process.env.MYSQL_SSL === 'true') {
      poolConfig.ssl = { rejectUnauthorized: false };
    }
    
    pool = mysql.createPool(poolConfig);
    console.log('MySQL host provided. Connection pool configured.');
    useMySQL = true;
  } catch (err) {
    console.error('Failed to configure MySQL Pool. Falling back to JSON DB:', err.message);
    useMySQL = false;
  }
} else {
  console.log('No MYSQL_HOST provided. Defaulting to local file-based storage (database.json).');
}

// Self-Bootstrapped Table Creator on launch when MySQL is chosen
async function bootstrapMySQL() {
  if (!useMySQL || !pool) return;
  
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to MySQL. Verifying / creating system tables...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'cashier'
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        category VARCHAR(50) NOT NULL,
        expiration_date VARCHAR(20) NOT NULL,
        image VARCHAR(512) NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment DECIMAL(10, 2) NOT NULL,
        \`change\` DECIMAL(10, 2) NOT NULL,
        created_at VARCHAR(50) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'cashier',
        operator_name VARCHAR(100) NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS transaction_items (
        id VARCHAR(50) PRIMARY KEY,
        transaction_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
      )
    `);

    // Verify if users table is empty; populate baseline accounts
    const [userRows] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0) {
      console.log('Bootstrapping default MySQL credentials (admin, cashier)...');
      await connection.query(`
        INSERT INTO users (id, name, username, password, role) VALUES
        ('1', 'Takoyaki Admin', 'admin', 'admin', 'admin'),
        ('2', 'Sasha Cashier', 'cashier', 'cashier', 'cashier'),
        ('3', 'Guest Customer', 'customer', 'guest', 'customer')
      `);
    }

    // Note: products and transactions tables are left completely empty by default, allowing a fresh start populated purely from user interactions!

    console.log('MySQL self-bootstrapping and table audits done. Database ready!');
    connection.release();
  } catch (err) {
    console.error('MySQL database query failed on initialization. Check credentials. Technical error:', err.message);
    useMySQL = false; // Fall back to json file
  }
}

// Unified Database CRUD API Layer

const dbController = {
  // --- Products Controller ---
  async getProducts() {
    if (useMySQL) {
      const [rows] = await pool.query('SELECT * FROM products');
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        price: Number(r.price),
        quantity: Number(r.quantity),
        category: r.category,
        expiration_date: r.expiration_date,
        image: r.image
      }));
    }
    return readDB().products;
  },

  async getProductById(id) {
    if (useMySQL) {
      const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
      if (!rows.length) return null;
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        price: Number(r.price),
        quantity: Number(r.quantity),
        category: r.category,
        expiration_date: r.expiration_date,
        image: r.image
      };
    }
    return readDB().products.find(p => p.id === id);
  },

  async createProduct(p) {
    if (useMySQL) {
      await pool.query(
        'INSERT INTO products (id, name, price, quantity, category, expiration_date, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [p.id, p.name, p.price, p.quantity, p.category, p.expiration_date, p.image]
      );
      return p;
    }
    const db = readDB();
    db.products.push(p);
    writeDB(db);
    return p;
  },

  async updateProduct(id, updates) {
    if (useMySQL) {
      const orig = await this.getProductById(id);
      if (!orig) return null;
      const merged = { ...orig, ...updates };
      await pool.query(
        'UPDATE products SET name = ?, price = ?, quantity = ?, category = ?, expiration_date = ?, image = ? WHERE id = ?',
        [merged.name, merged.price, merged.quantity, merged.category, merged.expiration_date, merged.image, id]
      );
      return merged;
    }
    const db = readDB();
    const idx = db.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    db.products[idx] = { ...db.products[idx], ...updates };
    writeDB(db);
    return db.products[idx];
  },

  async deleteProduct(id) {
    if (useMySQL) {
      await pool.query('DELETE FROM products WHERE id = ?', [id]);
      return true;
    }
    const db = readDB();
    const len = db.products.length;
    db.products = db.products.filter(p => p.id !== id);
    if (db.products.length === len) return false;
    writeDB(db);
    return true;
  },

  // --- Users Controller ---
  async getUsers() {
    if (useMySQL) {
      const [rows] = await pool.query('SELECT id, name, username, role FROM users');
      return rows;
    }
    return readDB().users.map(({ password: _, ...safe }) => safe);
  },

  async getUserById(id) {
    if (useMySQL) {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      return rows[0] || null;
    }
    return readDB().users.find(u => u.id === id);
  },

  async checkUserExists(username) {
    if (useMySQL) {
      const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
      return rows.length > 0;
    }
    return readDB().users.some(u => u.username === username);
  },

  async authenticateUser(username, password) {
    if (useMySQL) {
      const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
      return rows[0] || null;
    }
    return readDB().users.find(u => u.username === username && u.password === password);
  },

  async createUser(u) {
    if (useMySQL) {
      await pool.query(
        'INSERT INTO users (id, name, username, password, role) VALUES (?, ?, ?, ?, ?)',
        [u.id, u.name, u.username, u.password, u.role]
      );
      return u;
    }
    const db = readDB();
    db.users.push(u);
    writeDB(db);
    return u;
  },

  async updateUser(id, updates) {
    if (useMySQL) {
      const orig = await this.getUserById(id);
      if (!orig) return null;
      const merged = { ...orig, ...updates };
      await pool.query(
        'UPDATE users SET name = ?, username = ?, role = ?, password = ? WHERE id = ?',
        [merged.name, merged.username, merged.role, merged.password, id]
      );
      return merged;
    }
    const db = readDB();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx], ...updates };
    writeDB(db);
    return db.users[idx];
  },

  async deleteUser(id) {
    if (useMySQL) {
      await pool.query('DELETE FROM users WHERE id = ?', [id]);
      return true;
    }
    const db = readDB();
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    db.users = db.users.filter(u => u.id !== id);
    writeDB(db);
    return true;
  },

  // --- Transactions & Sales Controller ---
  async getTransactions() {
    if (useMySQL) {
      const [trans] = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC');
      const [items] = await pool.query('SELECT * FROM transaction_items');
      
      return trans.map(t => {
        const transItems = items
          .filter(item => item.transaction_id === t.id)
          .map(item => ({
            id: item.id,
            transaction_id: item.transaction_id,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: Number(item.quantity),
            price: Number(item.price),
            subtotal: Number(item.subtotal)
          }));
        return {
          id: t.id,
          total_amount: Number(t.total_amount),
          payment: Number(t.payment),
          change: Number(t.change),
          created_at: t.created_at,
          role: t.role,
          operator_name: t.operator_name,
          items: transItems
        };
      });
    }
    return readDB().transactions;
  },

  async createTransaction(t, rawItems) {
    if (useMySQL) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Check and decrement stock for each item
        for (const item of rawItems) {
          const [pRows] = await connection.query('SELECT quantity, name FROM products WHERE id = ?', [item.id]);
          if (!pRows.length) {
            throw new Error(`Product ${item.name} not found`);
          }
          const currentQty = Number(pRows[0].quantity);
          if (currentQty < item.quantity) {
            throw new Error(`Insufficient stock for ${pRows[0].name}. Available: ${currentQty}`);
          }
          await connection.query('UPDATE products SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.id]);
        }

        // Insert Header Record
        await connection.query(
          'INSERT INTO transactions (id, total_amount, payment, `change`, created_at, role, operator_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [t.id, t.total_amount, t.payment, t.change, t.created_at, t.role, t.operator_name]
        );

        // Insert Detail Records
        for (const itemRecord of t.items) {
          await connection.query(
            'INSERT INTO transaction_items (id, transaction_id, product_id, product_name, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [itemRecord.id, itemRecord.transaction_id, itemRecord.product_id, itemRecord.product_name, itemRecord.quantity, itemRecord.price, itemRecord.subtotal]
          );
        }

        await connection.commit();
        connection.release();
        return t;
      } catch (err) {
        await connection.rollback();
        connection.release();
        throw err;
      }
    } else {
      const db = readDB();
      // Apply deductions
      for (const item of rawItems) {
        const prod = db.products.find(p => p.id === item.id);
        if (!prod) throw new Error(`Product ${item.name} not found`);
        if (prod.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${prod.name}. Available: ${prod.quantity}`);
        }
        prod.quantity -= item.quantity;
      }
      db.transactions.unshift(t);
      writeDB(db);
      return t;
    }
  }
};

// -------------------------------------------------------------
// REST API App Endpoints - Interfacing Controller Logic
// -------------------------------------------------------------

// Active Driver Flag
app.get('/api/db-status', (req, res) => {
  res.json({
    active: useMySQL ? 'MySQL (Aiven / Workspace)' : 'Local JSON File (database.json)',
    host: process.env.MYSQL_HOST || 'local-fallback',
    configured: !!process.env.MYSQL_HOST
  });
});

// 1. Auth Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await dbController.authenticateUser(username, password);
    if (user) {
      const safeUser = { id: user.id, name: user.name, username: user.username, role: user.role };
      return res.json({ success: true, user: safeUser });
    }
    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Products CRUD Endpoints
app.get('/api/products', async (req, res) => {
  try {
    const products = await dbController.getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, price, quantity, category, expiration_date, image } = req.body;

    if (!name || price === undefined || quantity === undefined || !category || !expiration_date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newProduct = {
      id: 'p-' + Math.random().toString(36).substr(2, 9),
      name,
      price: Number(price),
      quantity: Number(quantity),
      category,
      expiration_date,
      image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
    };

    const created = await dbController.createProduct(newProduct);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, quantity, category, expiration_date, image } = req.body;

    const updated = await dbController.updateProduct(id, {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price: Number(price) }),
      ...(quantity !== undefined && { quantity: Number(quantity) }),
      ...(category !== undefined && { category }),
      ...(expiration_date !== undefined && { expiration_date }),
      ...(image !== undefined && { image })
    });

    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await dbController.deleteProduct(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Transactions & Checkout Endpoint
app.get('/api/transactions', async (req, res) => {
  try {
    const list = await dbController.getTransactions();
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { items, payment, operator_name, role } = req.body;

    if (!items || !items.length || payment === undefined) {
      return res.status(400).json({ message: 'Invalid transaction inputs' });
    }

    const availableProducts = await dbController.getProducts();

    // Verify inventory level first
    let total = 0;
    const itemsList = [];
    const transId = 't-' + Math.random().toString(36).substr(2, 9);

    for (const cartItem of items) {
      const match = availableProducts.find(p => p.id === cartItem.id);
      if (!match) {
        return res.status(404).json({ message: `Product ${cartItem.name} not found` });
      }
      if (match.quantity < cartItem.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${match.name}. Available: ${match.quantity}` });
      }
      
      const subtotal = Number(match.price) * Number(cartItem.quantity);
      total += subtotal;

      itemsList.push({
        id: 'td-' + Math.random().toString(36).substr(2, 9),
        transaction_id: transId,
        product_id: match.id,
        product_name: match.name,
        quantity: cartItem.quantity,
        price: match.price,
        subtotal
      });
    }

    const roundedTotal = Number(total.toFixed(2));
    const change = Number(payment) - roundedTotal;

    if (change < 0) {
      return res.status(400).json({ message: 'Payment cash was insufficient' });
    }

    const transactionRecord = {
      id: transId,
      total_amount: roundedTotal,
      payment: Number(payment),
      change: Number(change.toFixed(2)),
      created_at: new Date().toISOString(),
      role: role || 'cashier',
      operator_name: operator_name || 'System Operator',
      items: itemsList
    };

    const finalResult = await dbController.createTransaction(transactionRecord, items);
    res.status(201).json(finalResult);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 4. Admin Managing Users Endpoint
app.get('/api/users', async (req, res) => {
  try {
    const list = await dbController.getUsers();
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const exists = await dbController.checkUserExists(username);
    if (exists) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const newUser = {
      id: 'u-' + Math.random().toString(36).substr(2, 9),
      name,
      username,
      role,
      password
    };

    const created = await dbController.createUser(newUser);
    const { password: _, ...safeUser } = created;
    res.status(201).json(safeUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, password, role } = req.body;

    const dbUser = await dbController.getUserById(id);
    if (!dbUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username && username !== dbUser.username) {
      const exists = await dbController.checkUserExists(username);
      if (exists) {
        return res.status(400).json({ message: 'Username already exists' });
      }
    }

    const updated = await dbController.updateUser(id, {
      ...(name !== undefined && { name }),
      ...(username !== undefined && { username }),
      ...(role !== undefined && { role }),
      ...(password && { password })
    });

    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await dbController.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent delete main root account
    if (user.username === 'admin') {
      return res.status(400).json({ message: 'Cannot delete primary system administrator' });
    }

    await dbController.deleteUser(id);
    res.json({ success: true, message: 'User account removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. Consolidated Reports & Dashboard Metrics API
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const transactions = await dbController.getTransactions();
    const products = await dbController.getProducts();

    const totalSales = transactions.reduce((acc, curr) => acc + curr.total_amount, 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => t.created_at.startsWith(todayStr));
    const todaySales = todayTransactions.reduce((acc, curr) => acc + curr.total_amount, 0);

    const salesByDate = {};
    const ordersCountByDate = {};

    transactions.forEach(t => {
      const dStr = t.created_at.split('T')[0];
      salesByDate[dStr] = (salesByDate[dStr] || 0) + Number(t.total_amount);
      ordersCountByDate[dStr] = (ordersCountByDate[dStr] || 0) + 1;
    });

    const dailyTrend = Object.keys(salesByDate).map(date => ({
      date,
      sales: Number(salesByDate[date].toFixed(2)),
      orders: ordersCountByDate[date]
    })).sort((a, b) => a.date.localeCompare(b.date));

    const itemSalesCounts = {};
    transactions.forEach(t => {
      t.items.forEach(item => {
        const pId = item.product_id;
        if (!itemSalesCounts[pId]) {
          itemSalesCounts[pId] = { name: item.product_name, quantity: 0, revenue: 0 };
        }
        itemSalesCounts[pId].quantity += Number(item.quantity);
        itemSalesCounts[pId].revenue += Number(item.subtotal);
      });
    });

    const bestSellers = Object.keys(itemSalesCounts).map(pid => ({
      product_id: pid,
      name: itemSalesCounts[pid].name,
      quantity: itemSalesCounts[pid].quantity,
      revenue: Number(itemSalesCounts[pid].revenue.toFixed(2))
    })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    const lowStockProducts = products.filter(p => Number(p.quantity) <= 15);

    const expiringProducts = products.filter(p => {
      if (!p.expiration_date || p.expiration_date === 'N/A') return false;
      const expTime = new Date(p.expiration_date).getTime();
      const currTime = new Date().getTime();
      const diffDays = (expTime - currTime) / (1000 * 60 * 60 * 24);
      return diffDays < 15;
    });

    res.json({
      totalSales: Number(totalSales.toFixed(2)),
      todaySales: Number(todaySales.toFixed(2)),
      totalOrders: transactions.length,
      todayOrders: todayTransactions.length,
      dailyTrend,
      bestSellers,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      expiringCount: expiringProducts.length,
      expiringProducts,
      categoryDistribution: Object.values(products.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + Number(p.quantity);
        return acc;
      }, {})).map((val, idx) => ({
        category: Object.keys(products.reduce((acc, p) => {
          acc[p.category] = (acc[p.category] || 0) + Number(p.quantity);
          return acc;
        }, {}))[idx],
        stock: val
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Configure Vite middleware for development or fallback static files for production
async function startServer() {
  // Bootstrap tables
  await bootstrapMySQL();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Takoyaki Mini House System running on http://localhost:${PORT}`);
  });
}

startServer();
