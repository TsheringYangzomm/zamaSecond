function requireEndpoint(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    console.error(`${name} is required for a production release.`);
    process.exit(1);
  }

  let url;

  try {
    url = new URL(value);
  } catch {
    console.error(`${name} must be a valid absolute URL.`);
    process.exit(1);
  }

  if (url.protocol !== "https:") {
    console.error(`${name} must use HTTPS in production.`);
    process.exit(1);
  }

  console.log(`Production endpoint configured for ${url.origin}: ${name}.`);
}

function requireValue(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    console.error(`${name} is required for a production release.`);
    process.exit(1);
  }

  console.log(`Production value configured: ${name}.`);
}

requireEndpoint("VITE_LAUNCH_INTEREST_ENDPOINT");
requireValue("VITE_EMAILJS_PUBLIC_KEY");
requireValue("VITE_EMAILJS_SERVICE_ID");
requireValue("VITE_EMAILJS_TEMPLATE_ID");
requireValue("VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID");
