import { clearSession, loadSession } from '../auth/session'
import type { ApiEnvelope } from '../types'

export class ApiError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

const GENERIC_ERROR = 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'

let unauthorizedHandler: (() => void) | null = null

// App đăng ký để quay về màn đăng nhập khi token bị từ chối (mã 80)
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
  // false cho U0: không gắn Bearer và mã 80 không có nghĩa là hết phiên
  auth?: boolean
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options
  const headers: Record<string, string> = {}
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (auth) {
    const session = loadSession()
    if (session) {
      headers.Authorization = `Bearer ${session.token}`
    }
  }

  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('99', 'Không kết nối được máy chủ. Vui lòng thử lại.')
  }

  // 404 của URL lạ trả body rỗng (SRS mục 7), nên body không phải JSON là trường hợp bình thường
  let envelope: ApiEnvelope<T> | null = null
  try {
    envelope = (await response.json()) as ApiEnvelope<T>
  } catch {
    envelope = null
  }
  if (!envelope || typeof envelope.code !== 'string') {
    throw new ApiError('99', GENERIC_ERROR)
  }
  if (envelope.code === '00') {
    return envelope.data as T
  }
  if (envelope.code === '80' && auth) {
    clearSession()
    unauthorizedHandler?.()
  }
  throw new ApiError(envelope.code, envelope.message)
}
