import { handlePublicSubmission } from "./public-submission-core.mjs";

export const handler = (event) => handlePublicSubmission(event, "partnership");
