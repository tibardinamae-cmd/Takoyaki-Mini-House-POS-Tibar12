/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogIn, User as UserIcon, Lock, Users, Receipt, ShoppingCart } from 'lucide-react';
import { User } from '../types.js';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onEnterAsGuest: () => void;
}

export default function Login({ onLoginSuccess, onEnterAsGuest }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in both username and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Invalid username or password.');
      }
    } catch (err) {
      setError('Connection to server failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden">
      {/* Decorative Professional Spark Element */}
      <div className="absolute -top-12 -left-12 w-64 h-64 bg-indigo-650/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-12 -right-12 w-80 h-80 bg-indigo-650/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-900/5 p-8 relative z-10">
        <div className="text-center mb-8">
          {/* Logo Circle */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 text-white rounded-2xl font-bold text-2xl tracking-tighter shadow-md shadow-indigo-600/20 mb-4 animate-[bounce_1.5s_infinite]">
            T
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Takoyaki <span className="text-indigo-600">Mini House</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">
            POS, Inventory & Ordering Gateway
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl font-medium leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5 pl-1">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <UserIcon className="w-4 h-4" />
              </span>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-950 rounded-2xl text-sm font-medium transition duration-200 outline-none"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5 pl-1">
              Secret Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-950 rounded-2xl text-sm font-medium transition duration-200 outline-none"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            id="login-btn-submit"
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm tracking-wide transition-all duration-200 shadow-md shadow-indigo-600/10 active:scale-[0.98] disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <LogIn className="w-4.5 h-4.5" />
                <span>Enter System Control</span>
              </>
            )}
          </button>
        </form>

        <div className="relative my-7 text-center">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-250"></span>
          </div>
          <span className="relative bg-white px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
            or order food online
          </span>
        </div>

        <button
          id="btn-customer-guest"
          type="button"
          onClick={onEnterAsGuest}
          className="w-full py-4 px-6 bg-slate-900 hover:bg-indigo-650 text-white font-bold rounded-2xl text-sm tracking-wide transition-all duration-200 shadow-sm shadow-indigo-500/10 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-4.5 h-4.5" />
          <span>Browse Menu & Order Online</span>
        </button>

        {/* Quick Credentials Info Utility Box */}
        <div className="mt-8 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
          <h3 className="text-xs font-bold text-slate-800 tracking-wider mb-2 flex items-center gap-1">
            <span>🔑</span> Quick Access Credentials
          </h3>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span className="flex items-center gap-1 font-sans font-semibold text-slate-700">
                <Users className="w-3 h-3 text-indigo-500" /> Admin Access:
              </span>
              <span>admin / admin</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span className="flex items-center gap-1 font-sans font-semibold text-slate-700">
                <Receipt className="w-3 h-3 text-emerald-600" /> Cashier POS:
              </span>
              <span>cashier / cashier</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
