import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../api/client'

export type FieldErrors<K extends string> = Partial<Record<K, string>>

/**
 * Estado de errores de un formulario: un mensaje por campo (de la validación del front o de
 * `errors[]` del backend) y un error general para lo que no es de un campo.
 *
 * `fields` va en el orden en que aparecen en pantalla: el foco va al primero con error.
 * Los nombres tienen que coincidir con los del Request del backend para mapear `errors[]`.
 */
export function useFormErrors<K extends string>(formId: string, fields: readonly K[]) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<K>>({})
  const [formError, setFormError] = useState<ReactNode>(null)

  const fieldId = useCallback((field: K) => `${formId}-${field}`, [formId])

  const focusFirst = useCallback(
    (errors: FieldErrors<K>) => {
      const first = fields.find((field) => errors[field])
      if (first) {
        document.getElementById(fieldId(first))?.focus()
      }
    },
    [fields, fieldId],
  )

  /** Muestra los errores de la validación del front. Devuelve true si había alguno. */
  const showValidation = useCallback(
    (errors: FieldErrors<K>): boolean => {
      setFieldErrors(errors)
      setFormError(null)
      const hasErrors = fields.some((field) => errors[field])
      if (hasErrors) {
        focusFirst(errors)
      }
      return hasErrors
    },
    [fields, focusFirst],
  )

  /**
   * Muestra un error del backend: si trae `errors[]` de campos de este formulario, los marca;
   * si no, muestra el mensaje general.
   */
  const showApiError = useCallback(
    (cause: unknown, fallback: string) => {
      const fromBackend: FieldErrors<K> = {}
      if (cause instanceof ApiError) {
        for (const field of fields) {
          const message = cause.fieldErrors[field]
          if (message) {
            fromBackend[field] = message
          }
        }
      }

      if (fields.some((field) => fromBackend[field])) {
        setFieldErrors(fromBackend)
        setFormError(null)
        focusFirst(fromBackend)
        return
      }

      setFieldErrors({})
      setFormError(cause instanceof Error ? cause.message : fallback)
    },
    [fields, focusFirst],
  )

  /** Al editar un campo se borra su error y el general, como hacía el formulario antes. */
  const clearField = useCallback((field: K) => {
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
    setFormError(null)
  }, [])

  const reset = useCallback(() => {
    setFieldErrors({})
    setFormError(null)
  }, [])

  const invalidCount = fields.filter((field) => fieldErrors[field]).length

  /** Resumen para leer de un vistazo: el error general o cuántos campos revisar. */
  const summary: ReactNode = useMemo(() => {
    if (formError) {
      return formError
    }
    return invalidCount > 1 ? `Revisá los ${invalidCount} campos marcados.` : null
  }, [formError, invalidCount])

  /** Props para el input de un campo: id estable y estado accesible de error. */
  const inputProps = useCallback(
    (field: K) => {
      const id = fieldId(field)
      return fieldErrors[field]
        ? { id, 'aria-invalid': true, 'aria-describedby': `${id}-error` }
        : { id }
    },
    [fieldErrors, fieldId],
  )

  return {
    fieldErrors,
    summary,
    fieldId,
    inputProps,
    showValidation,
    showApiError,
    setFormError,
    clearField,
    reset,
  }
}
