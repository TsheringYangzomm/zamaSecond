import { handleGuestCheckout } from "../netlify/functions/guest-checkout-core.mjs";
import { runVercelHandler } from "./_jaggle-vercel.mjs";

export default async function handler(req, res) {
  return runVercelHandler(req, res, handleGuestCheckout);
}
