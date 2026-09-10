function toNetlifyEvent(req) {
  return {
    httpMethod: req.method,
    queryStringParameters: req.query ?? {},
    headers: req.headers ?? {},
    clientIp: String(req.headers?.["x-forwarded-for"] ?? "").split(",")[0].trim(),
    body: typeof req.body === "string" ? req.body : req.body ? JSON.stringify(req.body) : "",
  };
}

export async function runVercelHandler(req, res, handler) {
  try {
    const response = await handler(toNetlifyEvent(req));
    for (const [name, value] of Object.entries(response.headers ?? {})) res.setHeader(name, value);
    res.status(response.statusCode ?? 200).send(response.body ?? "");
  } catch {
    res.status(500).json({ ok: false, code: "service_unavailable", error: "This service is temporarily unavailable." });
  }
}
