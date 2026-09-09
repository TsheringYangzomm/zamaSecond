import { handleJaggleCallback } from "./jaggle-sso.mjs";

export async function handler(event) {
  return handleJaggleCallback(event, "customer");
}
