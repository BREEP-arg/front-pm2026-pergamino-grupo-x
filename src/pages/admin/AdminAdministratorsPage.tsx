import { useState, type FormEvent } from 'react'
import { createAdministrator, getAdministrators } from '../../api/administrators'
import { FieldError, FormError } from '../../components/FieldError'
import { ErrorState, LoadingState } from '../../components/States'
import { useToast } from '../../components/useToast'
import { fullName } from '../../utils/labels'
import {
  EMPTY_PERSON_FORM,
  PERSON_FIELDS,
  validatePersonForm,
  type PersonField,
  type PersonForm,
} from '../../utils/personForm'
import { useApiResource } from '../../utils/useApiResource'
import { useFormErrors } from '../../utils/useFormErrors'

export function AdminAdministratorsPage() {
  const { showToast } = useToast()
  const [form, setForm] = useState<PersonForm>(EMPTY_PERSON_FORM)
  const [busy, setBusy] = useState(false)
  const errors = useFormErrors('new-administrator', PERSON_FIELDS)
  const { fieldErrors, fieldId, inputProps } = errors

  const resource = useApiResource(() => getAdministrators(), [])

  const updateField = (field: PersonField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    errors.clearField(field)
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (errors.showValidation(validatePersonForm(form))) {
      return
    }

    setBusy(true)
    errors.reset()
    try {
      await createAdministrator({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      showToast('Administrador creado.')
      setForm(EMPTY_PERSON_FORM)
      resource.reload()
    } catch (cause) {
      errors.showApiError(cause, 'No se pudo crear el administrador.')
    } finally {
      setBusy(false)
    }
  }

  if (resource.loading) {
    return <LoadingState message="Cargando administradores…" />
  }

  if (resource.error) {
    return <ErrorState message={resource.error} onRetry={resource.reload} />
  }

  const administrators = resource.data ?? []

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Administradores</h1>
          <p className="muted">Alta de otros administradores de la plataforma.</p>
        </div>
      </header>

      <form className="panel form" onSubmit={handleCreate} noValidate>
        <h2>Dar de alta un administrador</h2>
        <div className="form-row">
          <label className="field">
            <span className="field__label">Nombre</span>
            <input
              {...inputProps('firstName')}
              value={form.firstName}
              onChange={(event) => updateField('firstName', event.target.value)}
              required
            />
            <FieldError fieldId={fieldId('firstName')} message={fieldErrors.firstName} />
          </label>
          <label className="field">
            <span className="field__label">Apellido</span>
            <input
              {...inputProps('lastName')}
              value={form.lastName}
              onChange={(event) => updateField('lastName', event.target.value)}
              required
            />
            <FieldError fieldId={fieldId('lastName')} message={fieldErrors.lastName} />
          </label>
        </div>
        <div className="form-row">
          <label className="field">
            <span className="field__label">Correo electrónico</span>
            <input
              {...inputProps('email')}
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              required
            />
            <FieldError fieldId={fieldId('email')} message={fieldErrors.email} />
          </label>
          <label className="field">
            <span className="field__label">Contraseña</span>
            <input
              {...inputProps('password')}
              type="password"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              required
              minLength={6}
            />
            <FieldError fieldId={fieldId('password')} message={fieldErrors.password} />
          </label>
        </div>

        <FormError>{errors.summary}</FormError>

        <div className="actions">
          <button type="submit" className="button button--primary" disabled={busy}>
            {busy ? 'Creando…' : 'Crear administrador'}
          </button>
        </div>
      </form>

      <h2>Administradores registrados</h2>
      {administrators.length === 0 ? (
        <p className="muted">No hay administradores registrados.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo electrónico</th>
              </tr>
            </thead>
            <tbody>
              {administrators.map((administrator) => (
                <tr key={administrator.id}>
                  <td>{fullName(administrator)}</td>
                  <td>{administrator.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
