import { handleGuestCheckout } from "./guest-checkout-core.mjs";

export async function handler(event) {
  return handleGuestCheckout(event);
}
