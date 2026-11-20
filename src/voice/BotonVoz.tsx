import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { asistenteDisponible } from '../api/asistente'
import { PanelVoz } from './PanelVoz'
import { useAsistente } from './useAsistente'

interface Props {
  alCambiar(): void
}

const ETIQUETAS = {
  listo: 'Mantené apretado para hablar',
  escuchando: 'Escuchando... soltá para enviar',
  pensando: 'Pensando...',
} as const

export function BotonVoz({ alCambiar }: Props) {
  if (!asistenteDisponible()) {
    return null
  }
  return <BotonVozActivo alCambiar={alCambiar} />
}

function BotonVozActivo({ alCambiar }: Props) {
  const a = useAsistente({ alCambiar })
  // Evita que pointerleave dispare un segundo "terminar" después de pointerup.
  const punteroActivo = useRef(false)

  const alBajar = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || punteroActivo.current) {
      return
    }
    punteroActivo.current = true
    void a.empezar()
  }

  const alSoltar = () => {
    if (!punteroActivo.current) {
      return
    }
    punteroActivo.current = false
    void a.terminar()
  }

  const alTeclear = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== ' ' && e.key !== 'Enter') {
      return
    }
    // El click nativo no se usa: el teclado alterna empezar/terminar acá.
    e.preventDefault()
    if (e.repeat) {
      return
    }
    if (a.estado === 'escuchando') {
      void a.terminar()
    } else if (a.estado === 'listo') {
      void a.empezar()
    }
  }

  const escuchando = a.estado === 'escuchando'

  return (
    <>
      {a.panelAbierto && (
        <PanelVoz
          respuesta={a.respuesta}
          error={a.error}
          pensando={a.estado === 'pensando'}
          deshacerVisible={a.deshacerVisible}
          deshaciendo={a.deshaciendo}
          alCerrar={a.cerrarPanel}
          alConfirmar={(c) => void a.confirmar(c)}
          alDeshacer={() => void a.deshacer()}
        />
      )}
      <button
        type="button"
        className={`voz-boton button button--primary${escuchando ? ' voz-boton--activo' : ''}`}
        aria-pressed={escuchando}
        disabled={a.estado === 'pensando'}
        onPointerDown={alBajar}
        onPointerUp={alSoltar}
        onPointerLeave={alSoltar}
        onPointerCancel={alSoltar}
        onKeyDown={alTeclear}
        onClick={(e) => e.preventDefault()}
      >
        {ETIQUETAS[a.estado]}
      </button>
    </>
  )
}
