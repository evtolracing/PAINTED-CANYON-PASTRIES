import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

const CART_KEY = 'pcp_cart';

const loadCart = () => {
  try {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveCart = (items) => {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(loadCart);

  const updateItems = useCallback((newItems) => {
    setItems(newItems);
    saveCart(newItems);
  }, []);

  const addItem = useCallback((product, variant = null, quantity = 1, addons = [], notes = '') => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.variant?.id === variant?.id
      );

      let newItems;
      if (existingIndex >= 0) {
        newItems = [...prev];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + quantity,
        };
      } else {
        newItems = [...prev, {
          id: `${product.id}-${variant?.id || 'base'}-${Date.now()}`,
          product,
          variant,
          quantity,
          addons,
          notes,
          unitPrice: variant ? Number(variant.price) : Number(product.basePrice),
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
