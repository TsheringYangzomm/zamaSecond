import { useCallback, useMemo, useState, type ReactNode } from "react";
import { CartContext, type Cart } from "./cart-context";

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [authPaneOpen, setAuthPaneOpen] = useState(false);
  const cartQuantity = Object.values(cart).reduce((total, quantity) => total + quantity, 0);

  const addToCart = useCallback((productId: string) => {
    setCart((current) => ({ ...current, [productId]: (current[productId] ?? 0) + 1 }));
  }, []);

  const changeCartQuantity = useCallback((productId: string, difference: number) => {
    setCart((current) => {
      const nextQuantity = Math.max(0, (current[productId] ?? 0) + difference);
      if (nextQuantity === 0) {
        const remaining = { ...current };
        delete remaining[productId];
        return remaining;
      }
      return { ...current, [productId]: nextQuantity };
    });
  }, []);

  const setCartQuantity = useCallback((productId: string, quantity: number) => {
    setCart((current) => {
      const nextQuantity = Math.max(0, Math.floor(quantity));
      if (nextQuantity === 0) {
        const remaining = { ...current };
        delete remaining[productId];
        return remaining;
      }
      return { ...current, [productId]: nextQuantity };
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((current) => {
      const remaining = { ...current };
      delete remaining[productId];
      return remaining;
    });
  }, []);

  const clearCart = useCallback(() => setCart({}), []);

  const openCart = useCallback(() => {
    setAuthPaneOpen(false);
    setIsCartOpen(true);
  }, []);
  const closeCart = useCallback(() => {
    setAuthPaneOpen(false);
    setIsCartOpen(false);
  }, []);
  const openAuth = useCallback(() => {
    setAuthPaneOpen(true);
    setIsCartOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      cart,
      cartQuantity,
      isCartOpen,
      authPaneOpen,
      addToCart,
      changeCartQuantity,
      setCartQuantity,
      removeFromCart,
      clearCart,
      openCart,
      closeCart,
      openAuth,
    }),
    [addToCart, authPaneOpen, cart, cartQuantity, changeCartQuantity, clearCart, closeCart, isCartOpen, openAuth, openCart, removeFromCart, setCartQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
