export async function fetchHandler(handler: (req: Request) => Promise<Response>, method = 'GET', body?: any) {
  const req = new Request('http://localhost/', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const res = await handler(req)
  const text = await res.text()
  let json: any = undefined
  try { json = JSON.parse(text) } catch (e) { /* not json */ }
  return { res, text, json }
}
