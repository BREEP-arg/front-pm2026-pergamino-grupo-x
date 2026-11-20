import type { AuthSession } from '../types/domain'
import { decodeJwtPayload, isTokenExpired, roleFromBackend } from './jwt'

// v2: las sesiones anteriores eran del modo demo (tokens falsos) y ya no sirven.
export const SESSION_STORAGE_KEY = 'elearning.session.v2'

// Marca que la sesión se cerró porque venció, para que el login lo explique.
const SESSION_EXPIRED_KEY = 'elearning.session.expired'

export function markSessionExpired(): void {
  try {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, '1')
  } catch {
    // Sin sessionStorage el login no muestra el aviso, pero la sesión se cierra igual.
  }
}

export function wasSessionExpired(): boolean {
  try {
    return sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1'
  } catch {
    return false
  }
}

export function clearSessionExpired(): void {
  try {
    sessionStorage.removeItem(SESSION_EXPIRED_KEY)
  } catch {
    // Nada que limpiar.
  }
}

export function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.token || !parsed?.user?.id || !parsed.user.role) {
      return null
    }

    // El token debe ser un JWT vigente y coincidir con el rol guardado.
    const payload = decodeJwtPayload(parsed.token)
    if (!payload || isTokenExpired(payload) || roleFromBackend(payload.rol) !== parsed.user.role) {
      if (payload && isTokenExpired(payload)) {
        markSessionExpired()
      }
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function persistSession(session: AuthSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  clearSessionExpired()
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY)
}
