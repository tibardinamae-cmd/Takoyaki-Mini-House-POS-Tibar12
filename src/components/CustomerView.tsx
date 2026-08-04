/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShoppingBag, Trash2, CheckCircle2, ChevronRight, X, Sparkles, Filter, 
  Search, Utensils, GlassWater, Layers, PlusSquare, ArrowLeft, Heart, RotateCcw
} from 'lucide-react';
import { Product, Category, Transaction } from '../types.js';

interface CustomerViewProps {
  products: Product[];
  onRefreshProducts: () => void;
  onLogout: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function CustomerView({ products, onRefreshProducts, onLogout }: CustomerViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);

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
      
      // Prevent exceeding stock
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

  const updateCartItemQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          // Check stock
          if (newQty > item.product.quantity) return item;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setCheckoutError('Please enter your name to verify the order.');
      return;
    }
    const payment = Number(paymentAmount);
    if (!paymentAmount || isNaN(payment) || payment < cartTotal) {
      setCheckoutError(`Invalid payment amount. Total is ₱${cartTotal.toFixed(2)}.`);
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError('');

    try {
      const payload = {
        items: cart.map(item => ({ id: item.product.id, quantity: item.quantity })),
        payment: payment,
        operator_name: `Online: ${customerName}`,
        role: 'customer'
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setCompletedTransaction(data);
        setCart([]);
        setCustomerName('');
        setPaymentAmount('');
        onRefreshProducts(); // Refresh active storage values!
      } else {
        setCheckoutError(data.message || 'Checkout failed.');
      }
    } catch (err) {
      setCheckoutError('Network error on checkout processing. Try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const closeReceipt = () => {
    setCompletedTransaction(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      {/* Dynamic Visual Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden border-b border-slate-850 shadow-sm">
        {/* Abstract Wave Gradient Accent */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-slate-900 to-black"></div>
        
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold tracking-wider uppercase text-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Takoyaki Mini House</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Hot, Savory & Fresh <span className="text-indigo-400 block md:inline">Japanese Takoyaki!</span>
            </h1>
            <p className="text-slate-350 max-w-lg text-sm md:text-base leading-relaxed font-medium">
              Order your favorite classic octopus balls, specialty combo platters, premium sauces, and ice-cold matcha bubble teas. Quick pickup and ready in minutes!
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              id="header-logout-btn"
              onClick={onLogout}
              className="px-6 py-3.5 bg-indigo-650 hover:bg-indigo-750 text-white font-bold rounded-2xl text-xs transition duration-200 border border-indigo-500 shadow-md shadow-indigo-600/10"
            >
              Sign In to POS Panel
            </button>
          </div>
        </div>
      </div>

      {/* Main Container Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Products Storefront (Col Span 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Filter Toolbar */}
          <div className="bg-white border border-slate-250 p-4.5 rounded-3xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              
              {/* Category selector */}
              <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
                {(['All', 'Takoyaki', 'Drinks', 'Combos', 'Add-ons'] as const).map(cat => (
                  <button
                    id={`filter-category-${cat.toLowerCase()}`}
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4.5 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                      selectedCategory === cat 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cat === 'All' && <Layers className="w-3.5 h-3.5" />}
                    {cat === 'Takoyaki' && <Utensils className="w-3.5 h-3.5" />}
                    {cat === 'Drinks' && <GlassWater className="w-3.5 h-3.5" />}
                    {cat === 'Combos' && <PlusSquare className="w-3.5 h-3.5" />}
                    {cat === 'Add-ons' && <Sparkles className="w-3.5 h-3.5" />}
                    <span>{cat}</span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-72">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  id="customer-product-search"
                  type="text"
                  placeholder="Search yummy items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium focus:border-indigo-500 focus:bg-white outline-none transition"
                />
              </div>

            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-slate-200 py-16 px-6 text-center rounded-3xl">
              <p className="text-slate-400 text-sm font-medium">No items found matching the current filters.</p>
              <button 
                onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
                className="mt-3.5 text-xs font-bold text-indigo-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredProducts.map(product => {
                const isSoldOut = product.quantity <= 0;
                const isLowStock = product.quantity <= 15 && product.quantity > 0;
                
                return (
                  <div 
                    key={product.id}
                    className="group bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg hover:border-indigo-500 transition-all duration-300 flex flex-col h-full"
                  >
                    {/* Image Area */}
                    <div className="relative h-44 bg-slate-50 overflow-hidden">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          // Fallback
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      
                      {/* Floating Category Badge */}
                      <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 text-[9px] font-bold text-indigo-200 uppercase tracking-widest rounded-lg">
                        {product.category}
                      </span>

                      {/* Stock Badges */}
                      {isSoldOut ? (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center">
                          <span className="bg-slate-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                            Sold Out
                          </span>
                        </div>
                      ) : isLowStock ? (
                        <span className="absolute top-3 right-3 bg-amber-500 text-slate-950 font-bold text-[9px] px-2 py-0.5 rounded-lg shadow-sm">
                          Only {product.quantity} Left
                        </span>
                      ) : null}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-grow justify-between gap-4">
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-slate-900 text-sm tracking-tight leading-snug group-hover:text-indigo-650 transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-1 text-[11px] text-slate-450 font-medium">
                          <span>Fresh Exp:</span>
                          <span className="font-semibold text-slate-500">{product.expiration_date}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <span className="font-bold text-indigo-600 text-base">
                          ₱{product.price.toFixed(2)}
                        </span>
                        
                        <button
                          id={`add-cart-btn-${product.id}`}
                          onClick={() => addToCart(product)}
                          disabled={isSoldOut}
                          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center gap-1 ${
                            isSoldOut
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 cursor-pointer shadow-xs'
                          }`}
                        >
                          <span>Add</span>
                          <PlusSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Virtual Interactive Cart Drawer (Col Span 4) */}
        <div className="lg:col-span-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-6 space-y-6 flex flex-col">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-650" />
                <span>Your Order Cart</span>
              </h2>
              <span className="bg-indigo-50 text-indigo-600 font-bold text-xs px-2.5 py-0.5 rounded-full">
                {cart.length} item{cart.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Cart list */}
            {cart.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-400 font-medium">Your checkout cart is completely empty.</p>
                <p className="text-[11px] text-slate-400">Add any item to build your plate!</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div 
                      key={item.product.id}
                      className="flex items-center justify-between gap-3 text-xs bg-slate-50 border border-slate-150 p-3 rounded-2xl"
                    >
                      <div className="space-y-1 flex-grow">
                        <p className="font-bold text-slate-900 leading-tight pr-1">
                          {item.product.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-semibold">
                          ₱{item.product.price.toFixed(2)} each
                        </p>
                      </div>

                      {/* Quantity Toggles */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1 py-0.5">
                        <button
                          id={`cart-decrease-${item.product.id}`}
                          onClick={() => updateCartItemQuantity(item.product.id, -1)}
                          className="w-5.5 h-5.5 text-slate-505 hover:text-indigo-600 font-bold hover:bg-slate-50 rounded-lg flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          id={`cart-increase-${item.product.id}`}
                          onClick={() => updateCartItemQuantity(item.product.id, 1)}
                          disabled={item.quantity >= item.product.quantity}
                          className="w-5.5 h-5.5 text-slate-505 hover:text-indigo-600 font-bold hover:bg-slate-50 rounded-lg flex items-center justify-center disabled:opacity-30 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Action */}
                      <button
                        id={`cart-remove-${item.product.id}`}
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Pricing summary */}
                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500 font-medium font-sans">
                    <span>Subtotal</span>
                    <span className="font-mono">₱{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-medium font-sans">
                    <span>Tax (0% Service Fee)</span>
                    <span className="font-mono">₱0.00</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-150 font-sans">
                    <span>Grand Total</span>
                    <span className="text-indigo-600 font-mono">₱{cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Checkout Fields Panel */}
                <form onSubmit={handleCheckout} className="space-y-4 pt-4 border-t border-slate-100" id="customer-checkout-form">
                  {checkoutError && (
                    <div className="p-3 bg-red-50 text-red-650 rounded-xl text-[11px] font-semibold leading-relaxed border border-red-100">
                      {checkoutError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Your Name
                    </label>
                    <input
                      id="input-customer-name"
                      type="text"
                      placeholder="e.g. John Doe"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:border-indigo-500 outline-none transition text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex justify-between">
                      <span>Enter Cash Payment Amount</span>
                      <span className="text-slate-400 font-mono font-normal">Min: ₱{cartTotal.toFixed(2)}</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-405 font-bold text-xs pointer-events-none">
                        ₱
                      </span>
                      <input
                        id="input-customer-cash"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-205 rounded-xl pl-6 pr-3 py-2 text-xs font-mono font-semibold focus:border-indigo-500 outline-none transition text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  {paymentAmount && Number(paymentAmount) >= cartTotal && (
                    <div className="flex justify-between items-center bg-emerald-50 text-emerald-800 p-2.5 rounded-xl text-xs font-semibold border border-emerald-100">
                      <span>Simulated Change Due:</span>
                      <span className="font-mono text-emerald-700 text-sm">
                        ₱{(Number(paymentAmount) - cartTotal).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <button
                    id="customer-checkout-submit"
                    type="submit"
                    disabled={isCheckingOut}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition duration-200 shadow-md shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isCheckingOut ? (
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Place Order & Save Transaction</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

          </div>
        </div>

      </div>

      {/* Checkout Success simulated receipt modal */}
      {completedTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 border border-slate-200 shadow-2xl relative space-y-6">
            
            {/* Success visual banner */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">Order Placed Successfully!</h3>
              <p className="text-xs text-slate-550">Your order has been recorded into the Takoyaki POS database.</p>
            </div>

            {/* Simulated Receipt paper */}
            <div className="bg-slate-50/50 border border-slate-200 p-5 rounded-2xl font-mono text-xs text-slate-700 space-y-4 shadow-sm">
              
              {/* Header */}
              <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-1">
                <p className="font-bold text-slate-900 tracking-wide text-sm">TAKOYAKI MINI HOUSE</p>
                <p className="text-[10px] text-slate-400">Order ID: {completedTransaction.id}</p>
                <p className="text-[10px] text-slate-400">Date: {new Date(completedTransaction.created_at).toLocaleString()}</p>
              </div>

              {/* Items List */}
              <div className="space-y-2 font-sans">
                {completedTransaction.items.map(it => {
                  const matchedProduct = products.find(p => p.id === it.product_id);
                  const imageUrl = matchedProduct?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                  return (
                    <div key={it.id} className="flex items-center gap-2 text-xs bg-white p-2 rounded-xl border border-slate-200">
                      <img 
                        src={imageUrl} 
                        alt={it.product_name} 
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'; }}
                      />
                      <div className="flex-grow min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{it.product_name}</p>
                        <p className="text-slate-400 text-[10px]">{it.quantity} x ₱{it.price.toFixed(2)}</p>
                      </div>
                      <span className="font-bold text-slate-800 text-[11px] whitespace-nowrap">₱{it.subtotal.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Summary Calculations */}
              <div className="border-t border-dashed border-slate-350 pt-3 space-y-1 text-[11px] font-bold text-slate-800 font-sans">
                <div className="flex justify-between">
                  <span>Grand Total:</span>
                  <span className="font-mono">₱{completedTransaction.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-normal text-slate-500">
                  <span>Payment Tendered:</span>
                  <span className="font-mono">₱{completedTransaction.payment.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-850 bg-emerald-50/50 px-1 py-0.5 rounded">
                  <span>Change Given:</span>
                  <span className="font-mono">₱{completedTransaction.change.toFixed(2)}</span>
                </div>
              </div>

              {/* Decorative bottom lines */}
              <div className="text-center border-t border-dashed border-slate-300 pt-3 text-[10px] text-slate-400 space-y-0.5">
                <p>Status: PAID - Thank you!</p>
                <p>Enjoy your hot freshly rolled Takoyaki!</p>
              </div>

            </div>

            {/* Accept / close Button */}
            <button
              id="close-receipt-modal"
              onClick={closeReceipt}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition duration-200 shadow-md shadow-indigo-100"
            >
              Order Again
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
