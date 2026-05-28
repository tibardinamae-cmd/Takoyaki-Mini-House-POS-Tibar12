/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShoppingBag, Trash2, ArrowLeft, Heart, Receipt, AlertTriangle, 
  Layers, Search, Utensils, GlassWater, PlusSquare, Sparkles, CheckCircle2 
} from 'lucide-react';
import { Product, Category, Transaction, User } from '../types.js';

interface CashierViewProps {
  currentUser: User;
  products: Product[];
  onRefreshProducts: () => void;
  onLogout: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function CashierView({ currentUser, products, onRefreshProducts, onLogout }: CashierViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cashAmount, setCashAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      
      // Stock limit checks
      if (currentQty >= product.quantity) return prev;

      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.product.quantity) return item;
          return { ...item, quantity: nextQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCashAmount('');
    setErrorMsg('');
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Quick cash triggers helper
  const addQuickCash = (amount: number) => {
    const current = Number(cashAmount) || 0;
    setCashAmount((current + amount).toFixed(2));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    const cash = Number(cashAmount);
    
    if (cart.length === 0) {
      setErrorMsg('The POS checkout cart is empty.');
      return;
    }
    if (!cashAmount || isNaN(cash) || cash < cartTotal) {
      setErrorMsg(`Insufficient cash amount. Total price due is ₱${cartTotal.toFixed(2)}.`);
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const payload = {
        items: cart.map(item => ({ id: item.product.id, quantity: item.quantity })),
        payment: cash,
        operator_name: currentUser.name,
        role: 'cashier'
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setReceipt(data);
        clearCart();
        onRefreshProducts(); // Refresh stocks list on main parent state
      } else {
        setErrorMsg(data.message || 'Checkout failed.');
      }
    } catch (err) {
      setErrorMsg('Failed to process transaction. Please verify connectivity.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Find products that are low in stock globally to alert the cashier
  const lowStockAlerts = products.filter(p => p.quantity <= 15);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* POS Top Navigation Bar */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg text-white">
            T
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white">Takoyaki Mini House</h1>
            <p className="text-[9px] uppercase tracking-wider text-indigo-400 font-medium">POS Terminal • Station Operator</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-100">{currentUser.name}</p>
            <p className="text-[9px] text-indigo-400 font-medium uppercase tracking-wider">{currentUser.role} Active</p>
          </div>
          {lowStockAlerts.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-[11px] font-semibold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{lowStockAlerts.length} Products Low in Stock</span>
            </div>
          )}
          <button
            id="cashier-quit-term"
            onClick={onLogout}
            className="px-4.5 py-2 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 rounded-xl transition duration-200"
          >
            Leave Terminal
          </button>
        </div>
      </header>

      {/* Main Grid View */}
      <div className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Cashier Products Board (Col Span 7) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          
          {/* Quick Filter Shelf */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-1.5 sm:pb-0 scrollbar-none">
                {(['All', 'Takoyaki', 'Drinks', 'Combos', 'Add-ons'] as const).map(cat => (
                  <button
                    id={`cashier-cat-${cat.toLowerCase()}`}
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all duration-250 flex items-center gap-1.5 ${
                      selectedCategory === cat 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-650'
                    }`}
                  >
                    {cat === 'All' && <Layers className="w-3 h-3" />}
                    {cat === 'Takoyaki' && <Utensils className="w-3 h-3" />}
                    {cat === 'Drinks' && <GlassWater className="w-3 h-3" />}
                    {cat === 'Combos' && <PlusSquare className="w-3 h-3" />}
                    {cat === 'Add-ons' && <Sparkles className="w-3 h-3" />}
                    <span>{cat}</span>
                  </button>
                ))}
              </div>

              {/* Search Field */}
              <div className="relative w-full sm:w-60">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input
                  id="cashier-search-field"
                  type="text"
                  placeholder="POS Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8.5 pr-3 py-2 text-xs font-semibold focus:border-indigo-505 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Grid list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-[600px] pr-1">
            {filteredProducts.map(prod => {
              const remainsVal = prod.quantity;
              const isOut = remainsVal <= 0;
              const isLow = remainsVal <= 15 && remainsVal > 0;

              return (
                <button
                  id={`pos-add-item-${prod.id}`}
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  disabled={isOut}
                  className={`bg-white border text-left p-3 rounded-2xl shadow-xs transition duration-200 flex gap-3 h-28 border-slate-200 hover:border-indigo-500 hover:shadow-md cursor-pointer ${
                    isOut ? 'opacity-40 bg-slate-50 border-dashed cursor-not-allowed' : ''
                  }`}
                >
                  {/* Thumbnail Image */}
                  <div className="w-16 h-full bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 relative border border-slate-100">
                    <img 
                      src={prod.image} 
                      alt={prod.name} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'; }}
                    />
                    {isOut && (
                      <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                        <span className="text-[7px] text-white font-extrabold tracking-wider uppercase bg-rose-600 px-1 py-0.5 rounded">OUT</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-col justify-between flex-grow min-w-0">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-500 uppercase tracking-wider rounded truncate max-w-[50px]">
                          {prod.category}
                        </span>
                        {isOut ? (
                          <span className="text-[8px] text-rose-600 font-extrabold uppercase font-mono">Out</span>
                        ) : isLow ? (
                          <span className="text-[8px] text-amber-650 font-bold uppercase font-mono">Stock: {remainsVal}</span>
                        ) : (
                          <span className="text-[8px] text-emerald-600 font-bold uppercase font-mono">Qty: {remainsVal}</span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-[10.5px] tracking-tight line-clamp-2 leading-tight">
                        {prod.name}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between w-full border-t border-slate-50 pt-1 mt-1">
                      <span className="text-[9px] font-mono text-slate-400">Exp: {prod.expiration_date}</span>
                      <span className="font-extrabold text-indigo-600 text-xs">₱{prod.price.toFixed(2)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

        </div>

        {/* Right Side: Cashier Active POS Receipt Generator (Col Span 5) */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm sticky top-6 space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-xs text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <span>Ticket Cart</span>
              </h2>
              <button 
                id="pos-clear-cart"
                onClick={clearCart} 
                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition cursor-pointer"
                disabled={cart.length === 0}
              >
                Clear Cart
              </button>
            </div>

            {/* Cart Listing */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-2">
                <p>No items added to current transaction.</p>
                <p className="text-[10px] text-slate-300">Click any product card on the left to add it.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div 
                      key={item.product.id}
                      className="flex items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-150 p-2.5 rounded-xl"
                    >
                      {/* Product Thumbnail inside ticket list */}
                      <img 
                        src={item.product.image} 
                        alt={item.product.name} 
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'; }}
                      />

                      <div className="space-y-0.5 flex-grow min-w-0">
                        <p className="font-bold text-slate-800 truncate text-[11px]">{item.product.name}</p>
                        <p className="text-[10px] text-slate-450 font-mono">₱{item.product.price.toFixed(2)}</p>
                      </div>

                      {/* Quantity buttons */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1 py-0.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-4 h-4 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 font-bold rounded flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-4 text-center font-bold text-slate-850 text-[10px]">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          disabled={item.quantity >= item.product.quantity}
                          className="w-4 h-4 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 font-bold rounded flex items-center justify-center disabled:opacity-20 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Subtotal */}
                      <span className="font-mono text-slate-700 font-semibold text-[10.5px] whitespace-nowrap">
                        ₱{(item.product.price * item.quantity).toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="text-slate-350 hover:text-rose-600 p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Subtotals Area */}
                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600 font-medium font-sans">
                  <div className="flex justify-between">
                    <span>Menu Price</span>
                    <span className="font-mono">₱{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-slate-900 border-t border-slate-100 pt-2">
                    <span>Total Amount Due</span>
                    <span className="font-mono text-indigo-600 text-sm">₱{cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Checkout & Cash Change Section */}
                <form onSubmit={handleCheckout} className="space-y-4 pt-3 border-t border-slate-100" id="pos-billing-form">
                  {errorMsg && (
                    <div className="p-3 bg-red-50 text-red-650 rounded-xl text-[10px] font-bold border border-red-100">
                      {errorMsg}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 pl-1 flex justify-between">
                      <span>Cash Received</span>
                      <span className="text-slate-400 font-mono font-normal">Min: ₱{cartTotal.toFixed(2)}</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400 text-xs">
                        ₱
                      </span>
                      <input
                        id="pos-payment-field"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-6 pr-3 py-2.5 text-xs font-mono font-bold focus:border-indigo-500 outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Cash helper buttons */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[50, 100, 200, 500].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => addQuickCash(val)}
                        className="py-1.5 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 rounded-lg transition cursor-pointer"
                      >
                        +₱{val}
                      </button>
                    ))}
                  </div>

                  {cashAmount && Number(cashAmount) >= cartTotal && (
                    <div className="flex justify-between items-center bg-emerald-50 text-emerald-850 p-2.5 rounded-xl text-xs font-semibold border border-emerald-100">
                      <span>Change Calculation:</span>
                      <span className="font-mono text-emerald-700 text-sm">
                        ₱{(Number(cashAmount) - cartTotal).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <button
                    id="pos-submit-transaction"
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-105 cursor-pointer"
                  >
                    {isProcessing ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Receipt className="w-4 h-4" />
                        <span>Process Receipt</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

          </div>
        </div>

      </div>

      {/* POS Receipt Modal Window */}
      {receipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 border border-slate-200 shadow-xl space-y-4">
            
            <div className="text-center font-semibold text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>IN-STORE RECEIPT GENERATED</span>
            </div>

            {/* Paper Slip Layout */}
            <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl font-mono text-[10.5px] text-slate-700 space-y-3.5 shadow-sm">
              
              <div className="text-center border-b border-dashed border-slate-300 pb-2.5 space-y-1">
                <p className="font-bold text-slate-900 tracking-wider text-xs">TAKOYAKI MINI HOUSE</p>
                <p className="text-[9px] text-slate-400">POS TERMINAL ID: {receipt.id}</p>
                <p className="text-[9px] text-slate-400">Date: {new Date(receipt.created_at).toLocaleString()}</p>
                <p className="text-[9px] text-slate-400">Cashier: {receipt.operator_name}</p>
              </div>

              {/* Items details table with image thumbnails for mistake-free cashier checking */}
              <div className="space-y-2">
                {receipt.items.map(it => {
                  const matchedProduct = products.find(p => p.id === it.product_id);
                  const imageUrl = matchedProduct?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                  return (
                    <div key={it.id} className="flex items-center gap-2.5 text-[10.5px] bg-white p-1.5 rounded-lg border border-slate-200 shadow-3xs">
                      <img 
                        src={imageUrl} 
                        alt={it.product_name} 
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 object-cover rounded-md border border-slate-200 flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'; }}
                      />
                      <div className="flex-grow min-w-0 font-sans">
                        <p className="font-bold text-slate-800 truncate">{it.product_name}</p>
                        <p className="text-slate-400 text-[9px]">{it.quantity} x ₱{it.price.toFixed(2)}</p>
                      </div>
                      <span className="font-bold text-slate-850 text-[10.5px] flex-shrink-0">₱{it.subtotal.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Cost Calculations lines */}
              <div className="border-t border-dashed border-slate-300 pt-2.5 space-y-1 font-bold">
                <div className="flex justify-between text-slate-855 font-bold">
                  <span>Grand Total Due:</span>
                  <span>₱{receipt.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400 font-normal">
                  <span>Amount Tendered:</span>
                  <span>₱{receipt.payment.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-850 bg-emerald-50/50 px-1 py-0.5 rounded">
                  <span>Tendered Change:</span>
                  <span>₱{receipt.change.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center border-t border-dashed border-slate-300 pt-2.5 text-[9px] text-slate-400">
                <p>Register State Updated</p>
                <p>Thank you for dining with us!</p>
              </div>

            </div>

            {/* Accept / Done Control */}
            <button
              id="pos-close-receipt-btn"
              onClick={() => setReceipt(null)}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs tracking-wider shadow-md shadow-indigo-100 cursor-pointer"
            >
              Done / Ready for Next Order
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
