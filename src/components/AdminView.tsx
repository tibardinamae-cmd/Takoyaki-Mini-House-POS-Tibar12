/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Table, Users, Receipt, AlertTriangle, Plus, Edit2, 
  Trash2, RefreshCw, BarChart2, Calendar, FileText, Sparkles, CheckCircle, Package, X
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, LineChart, Line, Cell, PieChart, Pie 
} from 'recharts';
import { Product, User, Transaction, Category } from '../types.js';

interface AdminViewProps {
  currentUser: User;
  products: Product[];
  onRefreshProducts: () => void;
  onLogout: () => void;
}

interface DashboardStats {
  totalSales: number;
  todaySales: number;
  totalOrders: number;
  todayOrders: number;
  dailyTrend: Array<{ date: string; sales: number; orders: number }>;
  bestSellers: Array<{ product_id: string; name: string; quantity: number; revenue: number }>;
  lowStockCount: number;
  lowStockProducts: Product[];
  expiringCount: number;
  expiringProducts: Product[];
  categoryDistribution: Array<{ category: string; stock: number }>;
}

export default function AdminView({ currentUser, products, onRefreshProducts, onLogout }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'users' | 'transactions'>('analytics');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Products CRUD State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [prodForm, setProdForm] = useState({
    name: '',
    price: '',
    quantity: '',
    category: 'Takoyaki' as Category,
    expiration_date: '',
    image: ''
  });
  const [prodError, setProdError] = useState('');

  // Users CRUD State
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'cashier' as 'admin' | 'cashier' | 'customer'
  });
  const [userError, setUserError] = useState('');

  // Transactions Ledger State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState<Transaction | null>(null);

  // Load Dashboard statistical reports
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load Users roster
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch user list', err);
    }
  };

  // Load Transactions roster
  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchTransactions();
  }, [products]);

  // Handle product add / editing actions
  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdForm({
      name: prod.name,
      price: String(prod.price),
      quantity: String(prod.quantity),
      category: prod.category,
      expiration_date: prod.expiration_date,
      image: prod.image
    });
    setProdError('');
    setShowAddProductModal(true);
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setProdForm({
      name: '',
      price: '',
      quantity: '',
      category: 'Takoyaki',
      expiration_date: '2026-12-31',
      image: ''
    });
    setProdError('');
    setShowAddProductModal(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdError('');

    const priceNum = Number(prodForm.price);
    const qtyNum = Number(prodForm.quantity);

    if (!prodForm.name.trim() || isNaN(priceNum) || isNaN(qtyNum) || !prodForm.expiration_date) {
      setProdError('Please correct any validation issues in form fields.');
      return;
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      
      const payload = {
        name: prodForm.name,
        price: priceNum,
        quantity: qtyNum,
        category: prodForm.category,
        expiration_date: prodForm.expiration_date,
        image: prodForm.image
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddProductModal(false);
        onRefreshProducts(); // Refresh parent listings
        fetchStats();       // Refresh report stats!
      } else {
        const data = await res.json();
        setProdError(data.message || 'Saving product failed.');
      }
    } catch (err) {
      setProdError('Failed to communicate product updates with database.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to retire this product flavor?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefreshProducts();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to retire product', err);
    }
  };

  // Restock action utility
  const handleRestock = async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: product.quantity + 40 })
      });
      if (res.ok) {
        onRefreshProducts();
      }
    } catch (err) {
      console.error('Restock attempt returned error flag', err);
    }
  };

  // Adjust Expiration date action utility
  const handleExtendExpiration = async (product: Product) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiration_date: '2026-10-31' })
      });
      if (res.ok) {
        onRefreshProducts();
      }
    } catch (err) {
      console.error('Failed to extend product shelf life', err);
    }
  };

  // Handle User CRUD
  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({ name: '', username: '', password: '', role: 'cashier' });
    setUserError('');
    setShowAddUserModal(true);
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      username: user.username,
      password: '', // Leave blank to skip updating
      role: user.role
    });
    setUserError('');
    setShowAddUserModal(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');

    if (!userForm.name.trim() || !userForm.username.trim() || (!editingUser && !userForm.password)) {
      setUserError('All fields including password are required for new users.');
      return;
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const payload: any = {
        name: userForm.name,
        username: userForm.username,
        role: userForm.role
      };
      if (userForm.password) {
        payload.password = userForm.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddUserModal(false);
        fetchUsers();
      } else {
        const data = await res.json();
        setUserError(data.message || 'Operation failed.');
      }
    } catch (err) {
      setUserError('Roster link error.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Permanently delete staff user from database?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.message || 'Unable to complete deletion.');
      }
    } catch (err) {
      console.error('Delete personnel error', err);
    }
  };

  const COLORS_PALETTE = ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#dc2626'];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      
      {/* Admin header */}
      <header className="bg-slate-900 border-b border-slate-850 text-white px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center font-bold text-base text-white shadow-inner">
            HQ
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wider uppercase">TAKOYAKI MINI HOUSE</h1>
            <p className="text-[10px] text-slate-400 font-medium">Administrator Panel</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-indigo-600/10 border border-indigo-500/25 text-indigo-400 font-bold px-3 py-1.5 rounded-lg mr-2">
            Active: Admin ({currentUser.name})
          </span>
          <button
            id="admin-logout-btn"
            onClick={onLogout}
            className="px-4.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg transition duration-200"
          >
            Leave Panel
          </button>
        </div>
      </header>

      {/* Primary Layout Ratios Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Navigation Sidebar Drawer (Col Span 3) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mb-4">
              Dashboard Sections
            </h2>

            <nav className="space-y-1" id="admin-navbar">
              <button
                id="tab-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2.5 cursor-pointer ${
                  activeTab === 'analytics' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                <span>Analytical Insights</span>
              </button>

              <button
                id="tab-products"
                onClick={() => setActiveTab('products')}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2.5 cursor-pointer ${
                  activeTab === 'products' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Product Catalog</span>
              </button>

              <button
                id="tab-users"
                onClick={() => setActiveTab('users')}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2.5 cursor-pointer ${
                  activeTab === 'users' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Staff Rosters</span>
              </button>

              <button
                id="tab-transactions"
                onClick={() => setActiveTab('transactions')}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-2.5 cursor-pointer ${
                  activeTab === 'transactions' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Checkout Ledger</span>
              </button>
            </nav>
          </div>

          {/* Quick Real-Time Action Notifications Board */}
          {stats && (stats.lowStockCount > 0 || stats.expiringCount > 0) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>System Health Warnings</span>
              </h3>
              
              {stats.lowStockCount > 0 && (
                <div className="space-y-2.5 border-b border-slate-100 pb-3">
                  <span className="text-[10px] text-red-655 font-bold flex items-center gap-1 uppercase">
                    ⚠ Low stock alert ({stats.lowStockCount})
                  </span>
                  <div className="space-y-1.5">
                    {stats.lowStockProducts.map(p => (
                      <div key={p.id} className="flex justify-between items-center text-[11px] bg-red-50 p-2 rounded-xl border border-red-100">
                        <span className="font-semibold text-slate-700 truncate max-w-[120px]">{p.name}</span>
                        <button
                          id={`quick-restock-${p.id}`}
                          onClick={() => handleRestock(p)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-[9px] font-bold text-white rounded cursor-pointer transition"
                        >
                          +40 stock
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stats.expiringCount > 0 && (
                <div className="space-y-2.5 pt-1">
                  <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 uppercase">
                    📅 Near Expiration ({stats.expiringCount})
                  </span>
                  <div className="space-y-1.5">
                    {stats.expiringProducts.map(p => (
                      <div key={p.id} className="flex justify-between items-center text-[11px] bg-amber-50 p-2 rounded-xl border border-amber-100">
                        <span className="font-semibold text-slate-700 truncate max-w-[120px]">{p.name}</span>
                        <button
                          id={`quick-extend-${p.id}`}
                          onClick={() => handleExtendExpiration(p)}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-[9px] font-bold text-slate-900 rounded cursor-pointer transition"
                        >
                          Extend
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Main Workdesk Canvas (Col Span 9) */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* 1. Tab Widget: ANALYTICAL REPORT INSIGHTS */}
          {activeTab === 'analytics' && stats && (
            <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
              
              {/* Quick Metrics grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Gross Revenue</p>
                  <p className="text-xl font-bold text-slate-900 font-mono mt-1">₱{stats.totalSales.toFixed(2)}</p>
                  <span className="text-[9px] text-emerald-600 font-bold block mt-1">✓ Live POS ledger</span>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Today Revenue</p>
                  <p className="text-xl font-bold text-indigo-600 font-mono mt-1">₱{stats.todaySales.toFixed(2)}</p>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">Today's walk-in & online</span>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Lifetime Tickets</p>
                  <p className="text-xl font-bold text-slate-900 font-mono mt-1">{stats.totalOrders}</p>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">Recorded checkouts</span>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Interactive Menu</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{products.length} Products</p>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">Active items catalog</span>
                </div>
              </div>

              {/* Chart Rows */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Sales Growth Line graph (Col 8) */}
                <div className="md:col-span-8 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span>Revenue Trend & Checkout Volume</span>
                    <span className="px-2 py-0.5 bg-slate-50 border text-[9px] rounded font-mono text-slate-450">Daily distribution</span>
                  </h3>
                  
                  {stats.dailyTrend.length === 0 ? (
                    <div className="h-56 flex items-center justify-center text-xs text-slate-400">No transactions recorded yet.</div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <Line type="monotone" dataKey="sales" name="Gross Revenue (₱)" stroke="#4f46e5" strokeWidth={2.5} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="orders" name="Ticket Orders" stroke="#10b981" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Leftover distribution share pie (Col 4) */}
                <div className="md:col-span-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Category Stock Share
                  </h3>

                  <div className="h-44 my-2 flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.categoryDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="stock"
                          nameKey="category"
                        >
                          {stats.categoryDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS_PALETTE[index % COLORS_PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Floating counts */}
                    <div className="absolute flex flex-col items-center">
                      <span className="text-xl font-bold text-slate-900">{products.reduce((acc, c) => acc + c.quantity, 0)}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Total units</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    {stats.categoryDistribution.map((cat, index) => (
                      <div key={cat.category} className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full block" style={{ backgroundColor: COLORS_PALETTE[index % COLORS_PALETTE.length] }} />
                          <span>{cat.category}</span>
                        </span>
                        <span className="font-mono text-slate-500">{cat.stock} pcs</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Best Sellers roster and transaction analytics overview */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Best Sellers lists (Col 6) */}
                <div className="md:col-span-6 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-4">
                    Best-Selling Products
                  </h3>
                  
                  {stats.bestSellers.length === 0 ? (
                    <div className="text-slate-400 text-xs py-8 text-center font-medium">No sales details to display.</div>
                  ) : (
                    <div className="space-y-2.5">
                      {stats.bestSellers.map((item, idx) => (
                        <div key={item.product_id} className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-150">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-750 font-bold text-[10px] flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 truncate max-w-[180px]">{item.name}</span>
                          </div>
                          <div className="text-right font-mono text-[11px] space-y-0.5">
                            <p className="font-bold text-slate-900">{item.quantity} rolls sold</p>
                            <p className="text-slate-400 text-[10px]">₱{item.revenue.toFixed(2)} rev</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expiration warning summaries list (Col 6) */}
                <div className="md:col-span-6 bg-white border border-stone-200 p-5 rounded-2xl shadow-xs">
                  <h3 className="font-bold text-stone-850 text-xs uppercase tracking-wider mb-4 text-[#da291c] flex items-center gap-1">
                    <span>Expiration Status Roster</span>
                  </h3>
                  
                  <div className="space-y-3 max-h-[290px] overflow-y-auto">
                    {products.map(prod => {
                      const daysLeft = prod.expiration_date === 'N/A' ? 9999 : Math.round((new Date(prod.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      const isExpired = daysLeft <= 0;
                      const isCritical = daysLeft > 0 && daysLeft <= 10;

                      return (
                        <div key={prod.id} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 border rounded-xl border-slate-150 shadow-2xs">
                          <div>
                            <p className="font-bold text-slate-800">{prod.name}</p>
                            <span className="text-[10px] font-bold text-slate-500">Exp: {prod.expiration_date}</span>
                          </div>
                          
                          <div>
                            {isExpired ? (
                              <span className="bg-rose-500 text-white font-bold text-[9px] px-2 py-0.5 rounded uppercase">
                                Expired
                              </span>
                            ) : isCritical ? (
                              <span className="bg-amber-500 text-slate-950 font-bold text-[9px] px-2 py-0.5 rounded uppercase animate-pulse">
                                {daysLeft} Days left
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded uppercase font-mono">
                                Safe
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 2. Tab Widget: PRODUCT CRUD CATALOG */}
          {activeTab === 'products' && (
            <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
              
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm tracking-tight">Active Menu & Stock Items</h3>
                  <p className="text-xs text-slate-400">Add, edit details, expiration status, or retire products.</p>
                </div>

                <button
                  id="admin-add-product-modal-trigger"
                  onClick={openAddProduct}
                  className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md shadow-indigo-100"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Product Flavor</span>
                </button>
              </div>

              {/* Table ledger card */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                        <th className="py-4 px-6">Flavor / Combo info</th>
                        <th className="py-4 px-3">Category</th>
                        <th className="py-4 px-3">Price</th>
                        <th className="py-4 px-3">Current Stock</th>
                        <th className="py-4 px-3">Expiration</th>
                        <th className="py-4 px-5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {products.map(prod => (
                        <tr key={prod.id} className="hover:bg-indigo-50/20 transition-colors">
                          <td className="py-3 px-6">
                            <div className="flex items-center gap-3">
                              <img 
                                src={prod.image} 
                                alt={prod.name} 
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 object-cover rounded-xl border border-slate-150"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'; }}
                              />
                              <div>
                                <p className="font-bold text-slate-900">{prod.name}</p>
                                <span className="font-mono text-[10px] text-slate-400">ID: {prod.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 font-bold rounded uppercase text-[9px] text-slate-505">
                              {prod.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold font-mono text-indigo-600">₱{prod.price.toFixed(2)}</td>
                          <td className="py-3 px-3 font-mono">
                            {prod.quantity <= 0 ? (
                              <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Sold Out</span>
                            ) : prod.quantity <= 15 ? (
                              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">{prod.quantity} low</span>
                            ) : (
                              <span className="text-emerald-700 font-bold">{prod.quantity} pcs</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">{prod.expiration_date}</td>
                          <td className="py-3 px-5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                id={`edit-prod-btn-${prod.id}`}
                                onClick={() => openEditProduct(prod)}
                                className="p-2 text-slate-400 hover:text-indigo-650 hover:bg-slate-55 rounded-lg transition"
                                title="Edit Product"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                id={`delete-prod-btn-${prod.id}`}
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-55 rounded-lg transition"
                                title="Delete Product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* 3. Tab Widget: USERS CRUD ADMINISTRATIONS */}
          {activeTab === 'users' && (
            <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
              
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm tracking-tight">System Staff & Accounts Registry</h3>
                  <p className="text-xs text-slate-400 font-medium">Control credential parameters, register cashiers, or assign roles.</p>
                </div>

                <button
                  id="admin-add-user-modal-trigger"
                  onClick={openAddUser}
                  className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-100"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Store Worker</span>
                </button>
              </div>

              {/* Users list roster */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                      <th className="py-4 px-6">Staff name</th>
                      <th className="py-4 px-3">Username login</th>
                      <th className="py-4 px-3">Role Authority</th>
                      <th className="py-4 px-6 text-center">Roster Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-indigo-50/10 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900">{u.name}</td>
                        <td className="py-4 px-3 font-mono font-bold text-slate-500">{u.username}</td>
                        <td className="py-4 px-3 font-semibold text-slate-600">
                          <span className={`px-2 py-0.5 font-bold rounded uppercase text-[9px] ${
                            u.role === 'admin' 
                              ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                              : u.role === 'cashier'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              id={`edit-user-btn-${u.id}`}
                              onClick={() => openEditUser(u)}
                              className="px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-bold cursor-pointer"
                            >
                              Edit
                            </button>
                            {u.username !== 'admin' && (
                              <button
                                id={`delete-user-btn-${u.id}`}
                                onClick={() => handleDeleteUser(u.id)}
                                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition font-bold cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* 4. Tab Widget: TRANSACTIONS HISTORIC LEDGER */}
          {activeTab === 'transactions' && (
            <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
              
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm tracking-tight">Active POS Receipts Ledger</h3>
                  <p className="text-xs text-slate-400 font-medium">Click any row to reveal itemized breakdown data.</p>
                </div>

                <span className="text-[11px] font-mono font-bold text-slate-500">
                  Total Recorded: {transactions.length} orders
                </span>
              </div>

              {/* Collapsible Ledger rows */}
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <div className="bg-white py-12 border border-slate-200 p-6 text-center text-slate-400 text-xs">No transactions saved yet.</div>
                ) : (
                  transactions.map(t => {
                    const isExpanded = expandedTransaction === t.id;
                    const isOnline = t.role === 'customer';

                    return (
                      <div 
                        key={t.id}
                        className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition duration-200 hover:border-indigo-100"
                      >
                        <button
                          id={`trans-row-toggle-${t.id}`}
                          onClick={() => setExpandedTransaction(isExpanded ? null : t.id)}
                          className="w-full text-left p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-slate-900">Code: {t.id}</span>
                              <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold ${
                                isOnline 
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' 
                                  : 'bg-slate-905 text-indigo-200 border border-slate-800 bg-slate-900'
                              }`}>
                                {isOnline ? 'Online order' : 'POS walk-in'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-450 font-mono font-bold">
                              Timestamp: {new Date(t.created_at).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-6 sm:text-right w-full sm:w-auto justify-between border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100">
                            <div>
                              <p className="text-[10px] text-slate-400">Operator</p>
                              <p className="text-slate-700 font-bold">{t.operator_name}</p>
                            </div>

                            <div>
                              <p className="text-[10px] text-slate-400">Total Price</p>
                              <p className="font-bold font-mono text-indigo-600 text-sm">
                                ₱{t.total_amount.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Collapsed Items specifications */}
                        {isExpanded && (
                          <div className="bg-slate-50 border-t border-slate-200 p-6 text-slate-700 text-xs font-sans animate-[fadeIn_0.15s_ease-out]">
                            <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                              {/* Left column: Action summary info & item listing */}
                              <div className="space-y-4 flex-1 w-full">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Metadata & Ledger info</h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedReceiptForModal(t);
                                    }}
                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-150 flex items-center gap-1 cursor-pointer border border-indigo-100"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Inspect Whole Receipt</span>
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3 bg-white border border-slate-150 p-4 rounded-xl text-[11px]">
                                  <div>
                                    <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wide">Order ID / Ticket No</span>
                                    <span className="font-bold text-slate-800 font-mono">{t.id}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wide">Order Timestamp</span>
                                    <span className="font-bold text-slate-800">{new Date(t.created_at).toLocaleString()}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wide">Fulfillment Type</span>
                                    <span className="font-bold text-slate-800 uppercase text-[10px]">{isOnline ? 'Online Customer Cart' : 'Counter POS Station'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wide">Cashier / Operator</span>
                                    <span className="font-bold text-slate-800">{t.operator_name}</span>
                                  </div>
                                </div>

                                {/* Items list for quick administrative reference */}
                                <div className="space-y-2">
                                  <p className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Itemized List</p>
                                  <div className="space-y-1.5">
                                    {t.items.map(it => {
                                      const matchedProduct = products.find(p => p.id === it.product_id);
                                      const imageUrl = matchedProduct?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                                      return (
                                        <div key={it.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-150">
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <img 
                                              src={imageUrl} 
                                              alt={it.product_name} 
                                              referrerPolicy="no-referrer"
                                              className="w-8 h-8 object-cover rounded-md border border-slate-200"
                                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'; }}
                                            />
                                            <div className="min-w-0">
                                              <p className="font-bold text-slate-800 truncate text-[11px]">{it.product_name}</p>
                                              <p className="text-slate-450 text-[9px] font-mono">{it.quantity} x ₱{it.price.toFixed(2)}</p>
                                            </div>
                                          </div>
                                          <span className="font-mono text-[11px] font-bold text-slate-700">₱{it.subtotal.toFixed(2)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              {/* Right column: The gorgeous authentic Thermal Paper Receipt slip */}
                              <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col items-center">
                                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-2 self-start lg:self-center">Physical Receipt Preview</span>
                                
                                {/* Realistic Paper Card Container */}
                                <div className="relative w-full max-w-[280px] bg-[#fdfdfb] p-5 shadow-lg border border-slate-200 font-mono text-[10.5px] text-slate-700 space-y-3.5 rounded-xs">
                                  
                                  {/* Paper top cut-torn jagged design */}
                                  <div className="absolute top-0 inset-x-0 h-1 flex justify-center overflow-hidden">
                                    {Array.from({ length: 15 }).map((_, i) => (
                                      <div key={i} className="w-5 h-5 bg-slate-50 rotate-45 transform origin-top-left -translate-y-2.5 flex-shrink-0" />
                                    ))}
                                  </div>

                                  <div className="text-center pt-2.5 border-b border-dashed border-slate-300 pb-3 space-y-1">
                                    <p className="font-bold text-slate-905 tracking-wider text-[11px]">TAKOYAKI HOUSE</p>
                                    <p className="text-[8px] text-slate-400 uppercase">Osakan Street Delicacies</p>
                                    <p className="text-[8px] text-slate-400">Sakura Galleria, Manila</p>
                                    <div className="h-2" />
                                    <p className="text-[8px] text-slate-500">REF: {t.id}</p>
                                    <p className="text-[8px] text-slate-500 font-bold">CASHIER: {t.operator_name}</p>
                                  </div>

                                  {/* Itemized Table */}
                                  <div className="space-y-1.5 pb-2 border-b border-dashed border-slate-200 text-[10px]">
                                    {t.items.map(it => (
                                      <div key={it.id} className="flex justify-between items-start text-[9.5px] leading-tight">
                                        <div className="max-w-[70%]">
                                          <p className="font-bold text-slate-800">{it.product_name}</p>
                                          <p className="text-slate-400 text-[8.5px]">{it.quantity} x ₱{it.price.toFixed(2)}</p>
                                        </div>
                                        <span className="font-bold text-slate-800 font-mono">₱{it.subtotal.toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Summary Cost Details */}
                                  <div className="space-y-1 text-[10px]">
                                    <div className="flex justify-between text-slate-850 font-bold">
                                      <span>TOTAL DUE:</span>
                                      <span className="font-mono">₱{t.total_amount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400 font-normal">
                                      <span>CASH RECEIVED:</span>
                                      <span className="font-mono">₱{t.payment.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-850 bg-emerald-50/70 p-1 rounded font-bold">
                                      <span>CASH CHANGE:</span>
                                      <span className="font-mono">₱{t.change.toFixed(2)}</span>
                                    </div>
                                  </div>

                                  {/* Barcode & Thanks footer */}
                                  <div className="text-center border-t border-dashed border-slate-300 pt-3 space-y-2 text-[8px] text-slate-400">
                                    {/* Mock Barcode */}
                                    <div className="flex flex-col items-center justify-center space-y-0.5">
                                      <div className="flex items-end justify-center h-7 gap-[1px]">
                                        {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 2, 3, 1].map((w, idx) => (
                                          <div key={idx} className="bg-slate-750 animate-pulse" style={{ width: `${w}px`, height: '100%' }} />
                                        ))}
                                      </div>
                                      <span className="font-mono text-[7px] text-slate-450 uppercase tracking-widest">{t.id}</span>
                                    </div>
                                    <p className="font-bold text-slate-500">Thank you for dining with us!</p>
                                    <p className="text-[7.5px] text-slate-400 font-semibold italic">--- Maraming Salamat Po ---</p>
                                  </div>

                                  {/* Paper bottom cut-torn jagged design */}
                                  <div className="absolute bottom-0 inset-x-0 h-1 flex justify-center overflow-hidden rotate-180">
                                    {Array.from({ length: 15 }).map((_, i) => (
                                      <div key={i} className="w-5 h-5 bg-slate-50 rotate-45 transform origin-top-left -translate-y-2.5 flex-shrink-0" />
                                    ))}
                                  </div>

                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* MODAL 1: Products Add / Edit Modal Dialouge */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 border border-slate-200 shadow-2xl space-y-5 animate-[fadeIn_0.15s_ease-out]">
            
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                {editingProduct ? 'Modify Menu Item parameters' : 'Create New Menu Product'}
              </h3>
              <button 
                id="close-prod-modal"
                onClick={() => setShowAddProductModal(false)}
                className="p-1 cursor-pointer text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {prodError && (
              <div className="p-3 bg-rose-55 text-rose-700 rounded-xl text-xs font-semibold leading-relaxed border border-rose-100">
                {prodError}
              </div>
            )}

            <form onSubmit={handleProductSubmit} className="space-y-4" id="admin-product-forms">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Product Display Name</label>
                <input
                  id="prod-input-name"
                  type="text"
                  placeholder="e.g. Classic Octopus Takoyaki (8pcs)"
                  value={prodForm.name}
                  onChange={e => setProdForm({ ...prodForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price (₱)</label>
                  <input
                    id="prod-input-price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={prodForm.price}
                    onChange={e => setProdForm({ ...prodForm, price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity Stock</label>
                  <input
                    id="prod-input-qty"
                    type="number"
                    placeholder="50"
                    value={prodForm.quantity}
                    onChange={e => setProdForm({ ...prodForm, quantity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Menu Category</label>
                  <select
                    id="prod-input-cat"
                    value={prodForm.category}
                    onChange={e => setProdForm({ ...prodForm, category: e.target.value as Category })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  >
                    <option value="Takoyaki">Takoyaki</option>
                    <option value="Drinks">Drinks</option>
                    <option value="Combos">Combos</option>
                    <option value="Add-ons">Add-ons</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Expiration Date</label>
                  <input
                    id="prod-input-exp"
                    type="text"
                    placeholder="YYYY-MM-DD or N/A"
                    value={prodForm.expiration_date}
                    onChange={e => setProdForm({ ...prodForm, expiration_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Illustration Photo URL</label>
                <input
                  id="prod-input-image"
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={prodForm.image}
                  onChange={e => setProdForm({ ...prodForm, image: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                />
              </div>

              <button
                id="prod-submit-form"
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition duration-200 mt-2 cursor-pointer shadow-md shadow-indigo-100"
              >
                {editingProduct ? 'Save Flavor Parameters' : 'Deploy Product to Live POS'}
              </button>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: User Add / Edit Modal Dialogue */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 border border-slate-200 shadow-2xl space-y-5 animate-[fadeIn_0.15s_ease-out]">
            
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                {editingUser ? 'Modify credentials' : 'Register Store Worker'}
              </h3>
              <button 
                id="close-user-modal"
                onClick={() => setShowAddUserModal(false)}
                className="p-1 cursor-pointer text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {userError && (
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100">
                {userError}
              </div>
            )}

            <form onSubmit={handleUserSubmit} className="space-y-4" id="admin-user-forms">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Staff Member Full Name</label>
                <input
                  id="user-input-name"
                  type="text"
                  placeholder="e.g. Sasha Smith"
                  value={userForm.name}
                  onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Username (Login credential)</label>
                <input
                  id="user-input-username"
                  type="text"
                  placeholder="e.g. cashier_smith"
                  value={userForm.username}
                  onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Password {editingUser && <span className="text-slate-405 font-normal font-sans">(leave blank to keep current)</span>}
                </label>
                <input
                  id="user-input-password"
                  type="password"
                  placeholder="Enter secret word"
                  value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Access Role Duty</label>
                <select
                  id="user-input-role"
                  value={userForm.role}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                >
                  <option value="admin">Admin (Full Control Access)</option>
                  <option value="cashier">Cashier (POS Checkout only)</option>
                </select>
              </div>

              <button
                id="user-submit-form"
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition duration-200 mt-2 cursor-pointer shadow-md shadow-indigo-100"
              >
                {editingUser ? 'Save Roster parameters' : 'Register Member Account'}
              </button>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 3: Whole Thermal Receipt Modal Window for Admin inspection */}
      {selectedReceiptForModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-slate-900/20 backdrop-blur-xs absolute inset-0 cursor-pointer" onClick={() => setSelectedReceiptForModal(null)} />
          
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 border border-slate-200 shadow-2xl relative z-10 flex flex-col max-h-[85vh] overflow-hidden">
            
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider font-sans">
                  Receipt No: {selectedReceiptForModal.id}
                </h3>
              </div>
              <button 
                id="close-admin-receipt-modal"
                onClick={() => setSelectedReceiptForModal(null)}
                className="p-1 cursor-pointer text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Receipt Body */}
            <div className="flex-1 overflow-y-auto pr-1 pb-4 scrollbar-thin">
              
              {/* Paper Slip Layout with continuous dropshadow */}
              <div className="relative w-full bg-[#fdfdfb] p-5 shadow-inner border border-slate-200 font-mono text-[10.5px] text-slate-700 space-y-4 rounded-xs mx-auto">
                
                {/* Paper top cut-torn jagged design */}
                <div className="absolute top-0 inset-x-0 h-1 flex justify-center overflow-hidden">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} className="w-4 h-4 bg-white rotate-45 transform origin-top-left -translate-y-2 flex-shrink-0 border border-slate-200" />
                  ))}
                </div>

                <div className="text-center pt-2.5 border-b border-dashed border-slate-300 pb-3.5 space-y-1">
                  <p className="font-extrabold text-slate-905 tracking-wider text-sm">TAKOYAKI HOUSE</p>
                  <p className="text-[8.5px] text-slate-450 uppercase font-bold">Osakan Street Delicacies</p>
                  <p className="text-[8px] text-slate-400">Sakura Galleria, Manila</p>
                  <p className="text-[8px] text-slate-450 font-bold">CONTACT: +63 (2) 8123-4567</p>
                  
                  <div className="h-3" />
                  
                  <div className="text-center border-t border-b border-slate-200 py-1 space-y-0.5 my-2">
                    <p className="text-[8.5px] text-slate-500 font-bold">OFFICIAL TRANSACTION RECORD</p>
                    <p className="text-[8px] text-slate-450 uppercase font-mono bg-slate-100 px-1 py-0.5 rounded inline-block">
                      Ref: {selectedReceiptForModal.id}
                    </p>
                  </div>

                  <div className="text-left text-[8.5px] text-slate-500 space-y-0.5 pt-1">
                    <p><span className="font-bold text-slate-600">DATE:</span> {new Date(selectedReceiptForModal.created_at).toLocaleString()}</p>
                    <p><span className="font-bold text-slate-600">STATION ID:</span> TERM_M_01</p>
                    <p><span className="font-bold text-slate-600">OPERATOR:</span> {selectedReceiptForModal.operator_name}</p>
                    <p><span className="font-bold text-slate-600">ORDER REQ:</span> {selectedReceiptForModal.role === 'customer' ? 'ONLINE PLATFORM' : 'POS MAIN DESK'}</p>
                  </div>
                </div>

                {/* Items details table with image thumbnails */}
                <div className="space-y-2 pb-2.5 border-b border-dashed border-slate-300">
                  <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">Purchased Products</p>
                  {selectedReceiptForModal.items.map(it => {
                    const matchedProduct = products.find(p => p.id === it.product_id);
                    const imageUrl = matchedProduct?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                    return (
                      <div key={it.id} className="flex items-center gap-2.5 text-[9.5px] bg-white p-1.5 rounded-lg border border-slate-200 shadow-3xs">
                        <img 
                          src={imageUrl} 
                          alt={it.product_name} 
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 object-cover rounded-md border border-slate-200 flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'; }}
                        />
                        <div className="flex-grow min-w-0 font-sans">
                          <p className="font-bold text-slate-800 truncate">{it.product_name}</p>
                          <p className="text-slate-400 text-[8px] font-mono">{it.quantity} x ₱{it.price.toFixed(2)}</p>
                        </div>
                        <span className="font-bold text-slate-850 text-[9.5px] flex-shrink-0 font-mono">₱{it.subtotal.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Calculations lines */}
                <div className="space-y-1.5 font-bold pt-1.5 text-[10px]">
                  <div className="flex justify-between text-slate-500 font-normal">
                    <span>Gross Subtotal:</span>
                    <span className="font-mono">₱{selectedReceiptForModal.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 font-normal">
                    <span>Tax (0% Service Rate):</span>
                    <span className="font-mono">₱0.00</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black border-t border-slate-200 pt-1 text-[11px]">
                    <span>GRAND TOTAL DUE:</span>
                    <span className="text-indigo-600 font-mono">₱{selectedReceiptForModal.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-650 pt-1 border-t border-dashed border-slate-200 font-normal">
                    <span>Cash Tendered:</span>
                    <span className="font-mono">₱{selectedReceiptForModal.payment.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-850 bg-emerald-50/70 p-1.5 rounded text-[10px]">
                    <span>Tendered Change:</span>
                    <span className="font-mono">₱{selectedReceiptForModal.change.toFixed(2)}</span>
                  </div>
                </div>

                {/* Barcode & Thanks footer */}
                <div className="text-center border-t border-dashed border-slate-300 pt-3.5 space-y-2 text-[8px] text-slate-400">
                  {/* Mock Barcode */}
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <div className="flex items-end justify-center h-8 gap-[1px]">
                      {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 2, 3, 1, 4, 2].map((w, idx) => (
                        <div key={idx} className="bg-slate-850" style={{ width: `${w}px`, height: '100%' }} />
                      ))}
                    </div>
                    <span className="font-mono text-[7px] text-slate-500 uppercase tracking-widest">{selectedReceiptForModal.id}</span>
                  </div>
                  
                  <p className="font-bold tracking-wide mt-2">Savor the authentic taste of Tokyo!</p>
                  <p className="font-bold text-slate-550 leading-relaxed font-sans">
                    We appreciate your business & patronage.<br />
                    Have a delicious time ahead!
                  </p>
                  <p className="text-[7.5px] font-bold text-slate-400 tracking-wider">
                    🌸 MULTIPLEX SYSTEM SECURED OFFICIAL 🌸
                  </p>
                </div>

                {/* Paper bottom cut-torn jagged design */}
                <div className="absolute bottom-0 inset-x-0 h-1 flex justify-center overflow-hidden rotate-180">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} className="w-4 h-4 bg-white rotate-45 transform origin-top-left -translate-y-2 flex-shrink-0 border border-slate-200" />
                  ))}
                </div>

              </div>
            </div>

            {/* Print & Dismiss Actions */}
            <div className="pt-3 border-t border-slate-100 flex gap-2 flex-shrink-0">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Print Slip</span>
              </button>
              <button
                onClick={() => setSelectedReceiptForModal(null)}
                className="flex-1 py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center shadow-md shadow-indigo-100"
              >
                <span>Close</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
