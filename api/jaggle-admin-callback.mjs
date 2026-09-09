import { handleJaggleCallback } from "../netlify/functions/jaggle-sso.mjs";
import { runVercelHandler } from "./_jaggle-vercel.mjs";

export default async function handler(req, res) {
  return runVercelHandler(req, res, (event) => handleJaggleCallback(event, "admin"));
}

