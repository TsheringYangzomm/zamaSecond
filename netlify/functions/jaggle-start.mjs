import { handleJaggleStart } from "./jaggle-sso.mjs";

export async function handler(event) {
  return handleJaggleStart(event);
}
