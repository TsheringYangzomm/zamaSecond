import { createContext, useContext } from "react";

export type Cart = Record<string, number>;

export type CartContextValue = {
  cart: Cart;
  cartQuantity: number;
  isCartOpen: boolean;
  addToCart: (productId: string) => void;
  changeCartQuantity: (productId: string, difference: number) => void;
  removeFromCart: (productId: string) => void;
  openCart: () => void;
  closeCart: () => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider.");
  return context;
}
