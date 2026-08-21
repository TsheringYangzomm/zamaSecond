import { createContext, useContext } from "react";

export type Cart = Record<string, number>;

export type CartContextValue = {
  cart: Cart;
  cartQuantity: number;
  isCartOpen: boolean;
  authPaneOpen: boolean;
  addToCart: (productId: string) => void;
  changeCartQuantity: (productId: string, difference: number) => void;
  setCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  openAuth: () => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider.");
  return context;
}
