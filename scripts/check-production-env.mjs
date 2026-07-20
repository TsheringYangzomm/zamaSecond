const endpoint = process.env.VITE_LAUNCH_INTEREST_ENDPOINT?.trim();

if (!endpoint) {
  console.error("VITE_LAUNCH_INTEREST_ENDPOINT is required for a production release.");
  process.exit(1);
}

let endpointUrl;

try {
  endpointUrl = new URL(endpoint);
} catch {
  console.error("VITE_LAUNCH_INTEREST_ENDPOINT must be a valid absolute URL.");
  process.exit(1);
}

if (endpointUrl.protocol !== "https:") {
  console.error("VITE_LAUNCH_INTEREST_ENDPOINT must use HTTPS in production.");
  process.exit(1);
}

console.log(`Production launch-interest endpoint configured for ${endpointUrl.origin}.`);
