import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

const CART_KEY = 'pcp_cart';

const isLoggedIn = () => !!localStorage.getItem('accessToken');

const loadCart = () => {
  try {
    if (isLoggedIn()) {
      // Authenticated: read from localStorage
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    // Guest: only use sessionStorage (dies with the tab/browser)
    // Also clear any leftover localStorage cart from a previous session
    localStorage.removeItem(CART_KEY);
    const stored = sessionStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveCart = (items) => {
  if (isLoggedIn()) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    sessionStorage.removeItem(CART_KEY);
  } else {
    // Guest: sessionStorage only — cleared when tab/browser closes
    sessionStorage.setItem(CART_KEY, JSON.stringify(items));
    localStorage.removeItem(CART_KEY);
  }
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const prevUser = useRef(user);
  const [items, setItems] = useState(loadCart);

  // React to login / logout
  useEffect(() => {
    const wasLoggedIn = !!prevUser.current;
    const nowLoggedIn = !!user;
    prevUser.current = user;

    if (wasLoggedIn === nowLoggedIn) return;

    if (nowLoggedIn) {
      // Just logged in — migrate guest cart to localStorage
      saveCart(items);
    } else {
      // Just logged out — wipe cart everywhere
      localStorage.removeItem(CART_KEY);
      sessionStorage.removeItem(CART_KEY);
      setItems([]);
    }
  }, [user, items]);

  const updateItems = useCallback((newItems) => {
    setItems(newItems);
    saveCart(newItems);
  }, []);

  const addItem = useCallback((product, variant = null, quantity = 1, addons = [], notes = '') => {
    setItems((prev) => {
      // Build a key that includes addons so different addon combos are separate line items
      const addonKey = (addons || []).map((a) => a.id || a.addonId || a).sort().join(',');
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.variant?.id === variant?.id &&
          ((item.addons || []).map((a) => a.id || a.addonId || a).sort().join(',') === addonKey)
      );

      let newItems;
      if (existingIndex >= 0) {
        newItems = [...prev];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + quantity,
        };
      } else {
        // Calculate addon cost per unit
        const addonTotal = (addons || []).reduce((sum, a) => sum + (Number(a.price) || 0), 0);
        newItems = [...prev, {
          id: `${product.id}-${variant?.id || 'base'}-${Date.now()}`,
          product,
          variant,
          quantity,
          addons,
          notes,
          unitPrice: (variant ? Number(variant.price) : Number(product.basePrice)) + addonTotal,
          addonTotal,
        }];
      }

      saveCart(newItems);
      return newItems;
    });
  }, []);

  const updateQuantity = useCallback((itemId, quantity) => {
    setItems((prev) => {
      if (quantity <= 0) {
        const newItems = prev.filter((item) => item.id !== itemId);
        saveCart(newItems);
        return newItems;
      }
      const newItems = prev.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      );
      saveCart(newItems);
      return newItems;
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setItems((prev) => {
      const newItems = prev.filter((item) => item.id !== itemId);
      saveCart(newItems);
      return newItems;
    });
  }, []);

  const clearCart = useCallback(() => {
    updateItems([]);
  }, [updateItems]);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const subtotal = useMemo(() =>
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      itemCount,
      subtotal,
    }}>
      {children}
    </CartContext.Provider>
  );
};
