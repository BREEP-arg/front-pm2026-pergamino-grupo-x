import { validateEmail } from './labels'
import type { FieldErrors } from './useFormErrors'

/** Alta de instructor o administrador: mismos campos que CreateInstructorRequest y AdministratorRequest. */
export interface PersonForm {
  firstName: string
  lastName: string
  email: string
  password: string
}

export type PersonField = keyof PersonForm

export const EMPTY_PERSON_FORM: PersonForm = { firstName: '', lastName: '', email: '', password: '' }

// Mismo orden que en pantalla.
export const PERSON_FIELDS: readonly PersonField[] = ['firstName', 'lastName', 'email', 'password']

export function validatePersonForm(form: PersonForm): FieldErrors<PersonField> {
  const errors: FieldErrors<PersonField> = {}
  if (!form.firstName.trim()) {
    errors.firstName = 'Ingresá el nombre.'
  }
  if (!form.lastName.trim()) {
    errors.lastName = 'Ingresá el apellido.'
  }
  if (!validateEmail(form.email.trim())) {
    errors.email = 'Ingresá un email válido, por ejemplo nombre@dominio.com.'
  }
  if (form.password.length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres.'
  }
  return errors
}
