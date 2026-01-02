export async function fetchHandler(
  handler: (req: Request) => Promise<Response>,
  method = 'GET',
  body?: unknown
) {
  const req = new Request('http://localhost/', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const res = await handler(req)
  const text = await res.text()

  let json: Record<string, unknown> | Array<unknown> | undefined = undefined
  const parsed = JSON.parse(text)
  if (typeof parsed === 'object' && parsed !== null) {
    json = parsed as Record<string, unknown> | Array<unknown>
  }

  return { res, text, json }
}
