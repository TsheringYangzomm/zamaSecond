import { handleJaggleHandoff } from "./jaggle-sso.mjs";

export async function handler(event) {
  return handleJaggleHandoff(event);
}
