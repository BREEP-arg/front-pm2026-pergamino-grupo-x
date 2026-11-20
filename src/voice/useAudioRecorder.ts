import { useCallback, useEffect, useRef, useState } from 'react'

export type EstadoGrabador = 'inactivo' | 'grabando' | 'error'

/** Corte automático para no mandar audios que el servicio rechazaría (máx. 10 MB). */
const DURACION_MAXIMA_MS = 60_000

const MIMES_CANDIDATOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

function elegirMime(): string {
  if (typeof MediaRecorder === 'undefined') {
    return ''
  }
  return MIMES_CANDIDATOS.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? ''
}

function mensajeDeError(err: unknown): string {
  const nombre = err instanceof DOMException || err instanceof Error ? err.name : ''
  if (nombre === 'NotAllowedError' || nombre === 'PermissionDeniedError') {
    return 'El micrófono está bloqueado. Habilitá el permiso desde el candado de la barra de direcciones y volvé a intentar.'
  }
  if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') {
    return 'No se encontró ningún micrófono conectado.'
  }
  return 'No se pudo acceder al micrófono.'
}

/**
 * Graba audio con MediaRecorder. `terminar()` devuelve el audio grabado, o null si no había
 * una grabación. A los 60 segundos corta solo y el audio queda disponible para `terminar()`.
 */
export function useAudioRecorder() {
  const [estado, setEstado] = useState<EstadoGrabador>('inactivo')
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chunksRef = useRef<Blob[]>([])
  // Se resuelve cuando el grabador termina de armar el audio (por terminar() o por el corte).
  const resultadoRef = useRef<Promise<Blob | null> | null>(null)
  const resolverRef = useRef<((blob: Blob | null) => void) | null>(null)

  const liberar = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  /** Suelta todo sin entregar audio. Se desenganchan los handlers antes de parar los tracks. */
  const descartar = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder) {
      recorder.onstop = null
      recorder.ondataavailable = null
      recorder.onerror = null
      if (recorder.state === 'recording') {
        try {
          recorder.stop()
        } catch {
          // Ya estaba detenido.
        }
      }
    }
    recorderRef.current = null
    liberar()
    chunksRef.current = []
    resolverRef.current?.(null)
    resolverRef.current = null
    resultadoRef.current = null
  }, [liberar])

  useEffect(() => descartar, [descartar])

  const empezar = useCallback(async () => {
    if (recorderRef.current) {
      return
    }
    setError(null)

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Tu navegador no soporta grabación de audio.')
      setEstado('error')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream

      const mime = elegirMime()
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []

      resultadoRef.current = new Promise<Blob | null>((resolve) => {
        resolverRef.current = resolve
      })

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime || 'audio/webm' })
        chunksRef.current = []
        recorderRef.current = null
        liberar()
        setEstado('inactivo')
        resolverRef.current?.(blob)
        resolverRef.current = null
      }

      recorder.onerror = () => {
        descartar()
        setError('Error grabando audio. Probá de nuevo.')
        setEstado('error')
      }

      recorder.start()
      setEstado('grabando')

      timeoutRef.current = setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop()
        }
      }, DURACION_MAXIMA_MS)
    } catch (err) {
      descartar()
      setError(mensajeDeError(err))
      setEstado('error')
    }
  }, [descartar, liberar])

  const terminar = useCallback(async (): Promise<Blob | null> => {
    const resultado = resultadoRef.current
    if (!resultado) {
      return null
    }
    const recorder = recorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
    const blob = await resultado
    resultadoRef.current = null
    return blob
  }, [])

  return { estado, error, empezar, terminar }
}
