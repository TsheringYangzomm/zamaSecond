function toNetlifyEvent(req) {
  return {
    httpMethod: req.method,
    queryStringParameters: req.query ?? {},
  };
}

export async function runVercelHandler(req, res, handler) {
  try {
    const response = await handler(toNetlifyEvent(req));
    for (const [name, value] of Object.entries(response.headers ?? {})) res.setHeader(name, value);
    res.status(response.statusCode ?? 200).send(response.body ?? "");
  } catch {
    res.status(500).json({ ok: false, error: "The Jaggle sign-in service is temporarily unavailable." });
  }
}

