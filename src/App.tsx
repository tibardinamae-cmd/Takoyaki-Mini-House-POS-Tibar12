/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Login from './components/Login.js';
import CustomerView from './components/CustomerView.js';
import CashierView from './components/CashierView.js';
import AdminView from './components/AdminView.js';
import { User, Product } from './types.js';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'login' | 'customer' | 'dashboard'>('login');
  const [products, setProducts] = useState<Product[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load products from API
  const refreshProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to load products list from API', err);
    } finally {
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    refreshProducts();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'customer') {
      setView('customer');
    } else {
      setView('dashboard');
    }
  };

  const handleEnterAsGuest = () => {
    setCurrentUser({ id: 'guest', name: 'Online Guest Client', username: 'guest', role: 'customer' });
    setView('customer');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('login');
  };

  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-red-650 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Takoyaki POS Starting up...</p>
      </div>
    );
  }

  // Orchestrate Views
  switch (view) {
    case 'customer':
      return (
        <CustomerView 
          products={products} 
          onRefreshProducts={refreshProducts} 
          onLogout={handleLogout} 
        />
      );
    case 'dashboard':
      if (currentUser?.role === 'admin') {
        return (
          <AdminView 
            currentUser={currentUser} 
            products={products} 
            onRefreshProducts={refreshProducts} 
            onLogout={handleLogout} 
          />
        );
      } else if (currentUser?.role === 'cashier') {
        return (
          <CashierView 
            currentUser={currentUser} 
            products={products} 
            onRefreshProducts={refreshProducts} 
            onLogout={handleLogout} 
          />
        );
      }
      return <Login onLoginSuccess={handleLoginSuccess} onEnterAsGuest={handleEnterAsGuest} />;
    case 'login':
    default:
      return <Login onLoginSuccess={handleLoginSuccess} onEnterAsGuest={handleEnterAsGuest} />;
  }
}
