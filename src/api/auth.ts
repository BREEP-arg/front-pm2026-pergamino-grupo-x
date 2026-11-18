import type { Administrator, Instructor, Role, SessionUser } from '../types/domain'
import { decodeJwtPayload, isTokenExpired, roleFromBackend, stripBearer } from '../auth/jwt'
import { ApiError, apiFetch } from './client'

interface TokenResponse {
  token: string
}

/** Respuesta de POST /api/auth/token (#27). */
interface UnifiedTokenResponse {
  accessToken?: string
  tokenType?: string
  expiresIn?: number
  role?: string
}

export interface LoginResponse {
  token: string
  user: SessionUser
}

const INVALID_CREDENTIALS = 'Email o contraseña incorrectos.'

/**
 * Logins viejos: viven fuera de /api y son uno por tipo de usuario. Como la respuesta
 * solo trae el token (el rol viaja en el JWT), se prueban en orden hasta que uno
 * acepte las credenciales. Se usan solo si el backend todavía no tiene /api/auth/token.
 */
const AUTH_ENDPOINTS = ['/student/auth', '/instructor/auth', '/administrator/auth'] as const

/**
 * Queda en true cuando el backend respondió que POST /api/auth/token no existe, para no
 * volver a probarlo en cada login hasta que se recargue la página.
 */
let unifiedLoginUnavailable = false

/**
 * Login único (#27): un solo pedido para los tres roles. Devuelve null si el backend
 * todavía no tiene el endpoint (404/405), y entonces se usan los logins viejos.
 */
async function requestUnifiedToken(
  email: string,
  password: string,
): Promise<{ token: string; role?: string } | null> {
  if (unifiedLoginUnavailable) {
    return null
  }

  try {
    const response = await apiFetch<UnifiedTokenResponse>('/auth/token', {
      method: 'POST',
      body: { email, password },
      authToken: null,
      skipUnauthorized: true,
    })
    if (typeof response.accessToken !== 'string' || !response.accessToken.trim()) {
      throw new ApiError(500, 'El servidor no devolvió un token de sesión.')
    }
    return { token: stripBearer(response.accessToken), role: response.role }
  } catch (cause) {
    if (cause instanceof ApiError && (cause.status === 404 || cause.status === 405)) {
      unifiedLoginUnavailable = true
      return null
    }
    if (cause instanceof ApiError && cause.status === 401) {
      throw new ApiError(401, INVALID_CREDENTIALS, { code: cause.code })
    }
    throw cause
  }
}

async function requestToken(path: string, email: string, password: string): Promise<string> {
  const { token } = await apiFetch<TokenResponse>(path, {
    method: 'POST',
    body: { email, password },
    base: 'root',
    authToken: null,
    skipUnauthorized: true,
  })

  if (typeof token !== 'string' || !token.trim()) {
    throw new ApiError(500, 'El servidor no devolvió un token de sesión.')
  }

  return stripBearer(token)
}

async function findToken(email: string, password: string): Promise<string> {
  for (const path of AUTH_ENDPOINTS) {
    try {
      return await requestToken(path, email, password)
    } catch (cause) {
      // Credenciales inválidas para este tipo de usuario: probamos con el siguiente.
      if (cause instanceof ApiError && cause.status === 401) {
        continue
      }
      throw cause
    }
  }

  throw new ApiError(401, INVALID_CREDENTIALS)
}

function emptyProfile(user: Omit<SessionUser, 'firstName' | 'lastName'>): SessionUser {
  return { ...user, firstName: '', lastName: '' }
}

/**
 * El token solo identifica al usuario (email, rol e id). El nombre se pide al
 * endpoint correspondiente. El alumno no tiene endpoint propio (GET /students/{id}
 * es solo para administradores), así que la UI muestra su email.
 */
async function loadProfile(
  role: Role,
  id: number,
  email: string,
  token: string,
): Promise<SessionUser> {
  const base = { id, role, email }

  if (role === 'INSTRUCTOR') {
    try {
      const instructor = await apiFetch<Instructor>(`/instructors/${id}`)
      return { ...base, firstName: instructor.firstName, lastName: instructor.lastName }
    } catch {
      return emptyProfile(base)
    }
  }

  if (role === 'ADMIN') {
    try {
      const administrator = await apiFetch<Administrator>(`/administrators/${id}`, { authToken: token })
      return { ...base, firstName: administrator.firstName, lastName: administrator.lastName }
    } catch {
      return emptyProfile(base)
    }
  }

  return emptyProfile(base)
}

/**
 * Inicia sesión con email y contraseña.
 *
 * Usa POST /api/auth/token y, si el backend todavía no lo tiene, prueba los tres logins
 * viejos. Después decodifica el JWT para obtener el rol y completa el perfil.
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const trimmedEmail = email.trim()
  if (!trimmedEmail || !password) {
    throw new ApiError(400, 'Ingresá tu email y contraseña.')
  }

  const unified = await requestUnifiedToken(trimmedEmail, password)
  const token = unified?.token ?? (await findToken(trimmedEmail, password))
  const payload = decodeJwtPayload(token)

  if (!payload) {
    throw new ApiError(500, 'El servidor devolvió un token inválido.')
  }

  if (isTokenExpired(payload)) {
    throw new ApiError(401, 'Tu sesión expiró. Volvé a iniciar sesión.')
  }

  const role = roleFromBackend(payload.rol) ?? roleFromBackend(unified?.role)
  const id = typeof payload.userId === 'number' ? payload.userId : Number(payload.userId)

  if (!role || !Number.isInteger(id)) {
    throw new ApiError(500, 'El token no contiene el rol o el identificador del usuario.')
  }

  const user = await loadProfile(role, id, payload.sub ?? trimmedEmail, token)
  return { token, user }
}
