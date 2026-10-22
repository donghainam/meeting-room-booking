function base64Url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// JWT giả (không có chữ ký thật) đủ để session.ts đọc sub và role
export function fakeToken(sub: string, role: string): string {
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({ sub, role })}.signature`
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
