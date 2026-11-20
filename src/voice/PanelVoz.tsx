import { useToast } from '../components/useToast'
import type { RespuestaVoz } from '../types/asistente'

interface Props {
  respuesta: RespuestaVoz | null
  error: string | null
  pensando: boolean
  deshacerVisible: boolean
  deshaciendo: boolean
  alCerrar(): void
  alConfirmar(confirmado: boolean): void
  alDeshacer(): void
}

function celda(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return ''
  }
  if (typeof valor === 'object') {
    const obj = valor as Record<string, unknown>
    if (typeof obj.nombre === 'string') {
      return obj.nombre
    }
    if (typeof obj.name === 'string') {
      return obj.name
    }
    return JSON.stringify(valor)
  }
  return String(valor)
}

export function PanelVoz({
  respuesta,
  error,
  pensando,
  deshacerVisible,
  deshaciendo,
  alCerrar,
  alConfirmar,
  alDeshacer,
}: Props) {
  const { showToast } = useToast()

  const copiar = async (valor: string) => {
    try {
      await navigator.clipboard.writeText(valor)
      showToast('Copiado al portapapeles.')
    } catch {
      showToast('No se pudo copiar. Seleccionalo y copialo a mano.', 'error')
    }
  }

  const filas = respuesta?.datos?.filas ?? []
  const columnas = filas.length > 0 ? Object.keys(filas[0]) : []
  const restantes = respuesta?.datos ? respuesta.datos.total - filas.length : 0

  return (
    <section className="voz-panel panel" aria-label="Asistente de voz">
      <div className="panel__header">
        <h2>Asistente</h2>
        <button type="button" className="button button--quiet button--small" onClick={alCerrar}>
          Cerrar
        </button>
      </div>

      <div className="voz-panel__body" aria-live="polite">
        {pensando && <p className="muted">Pensando...</p>}
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}
        {respuesta && !pensando && (
          <>
            {respuesta.transcripcion && <p className="voz-panel__dijiste muted">Dijiste: {respuesta.transcripcion}</p>}
            <p>{respuesta.respuesta}</p>

            {filas.length > 0 && (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      {columnas.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila, i) => (
                      <tr key={i}>
                        {columnas.map((c) => (
                          <td key={c}>{celda(fila[c])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {restantes > 0 && <p className="muted">y {restantes} más</p>}

            {respuesta.secreto && (
              <div className="voz-panel__secreto">
                <strong>{respuesta.secreto.etiqueta}</strong>
                <code>{respuesta.secreto.valor}</code>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => void copiar(respuesta.secreto!.valor)}
                >
                  Copiar
                </button>
                <small className="muted">Se muestra una sola vez.</small>
              </div>
            )}

            {respuesta.pendiente && (
              <div className="voz-panel__acciones">
                <p>{respuesta.pendiente.descripcion}</p>
                <button type="button" className="button button--danger button--small" onClick={() => alConfirmar(true)}>
                  Sí
                </button>
                <button type="button" className="button button--ghost button--small" onClick={() => alConfirmar(false)}>
                  No
                </button>
              </div>
            )}

            {respuesta.deshacer && deshacerVisible && (
              <div className="voz-panel__acciones">
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={alDeshacer}
                  disabled={deshaciendo}
                >
                  Deshacer
                </button>
                <small className="muted">{respuesta.deshacer.descripcion}</small>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
