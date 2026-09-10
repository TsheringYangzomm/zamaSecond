import { handlePublicSubmission } from "../netlify/functions/public-submission-core.mjs";
import { runVercelHandler } from "./_jaggle-vercel.mjs";

export default async function handler(req, res) {
  return runVercelHandler(req, res, (event) => handlePublicSubmission(event, "partnership"));
}
