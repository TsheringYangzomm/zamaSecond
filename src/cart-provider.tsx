import { useCallback, useMemo, useState, type ReactNode } from "react";
import { CartContext, type Cart } from "./cart-context";

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
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

  const removeFromCart = useCallback((productId: string) => {
    setCart((current) => {
      const remaining = { ...current };
      delete remaining[productId];
      return remaining;
    });
  }, []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const value = useMemo(
    () => ({
      cart,
      cartQuantity,
      isCartOpen,
      addToCart,
      changeCartQuantity,
      removeFromCart,
      openCart,
      closeCart,
    }),
    [addToCart, cart, cartQuantity, changeCartQuantity, closeCart, isCartOpen, openCart, removeFromCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
