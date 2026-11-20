import type { ReactNode } from 'react'

/** Mensaje de error debajo de un campo. El id lo enlaza al input con aria-describedby. */
export function FieldError({ fieldId, message }: { fieldId: string; message?: string }) {
  if (!message) {
    return null
  }
  return (
    <span className="field__error" id={`${fieldId}-error`}>
      {message}
    </span>
  )
}

/** Error general del formulario (o resumen de campos), anunciado a lectores de pantalla. */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) {
    return null
  }
  return (
    <p className="form-error" role="alert">
      {children}
    </p>
  )
}
