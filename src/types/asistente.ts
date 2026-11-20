// Contrato de POST /voz del servicio del asistente.

export interface TurnoHistorial {
  rol: 'usuario' | 'asistente'
  texto: string
}

export type TipoAccion = 'lectura' | 'escritura' | 'borrado'

export interface AccionAsistente {
  herramienta: string
  ok: boolean
  tipo: TipoAccion
}

export interface DatosAsistente {
  filas: Record<string, unknown>[]
  total: number
}

/** Cómo revertir la última escritura. `ruta` es relativa a /api y se manda con apiFetch. */
export interface AccionDeshacer {
  metodo: 'DELETE'
  ruta: string
  descripcion: string
}

export interface PendienteAsistente {
  id: string
  descripcion: string
}

export interface SecretoAsistente {
  etiqueta: string
  valor: string
}

export interface RespuestaVoz {
  transcripcion: string | null
  respuesta: string
  acciones: AccionAsistente[]
  datos: DatosAsistente | null
  deshacer: AccionDeshacer | null
  pendiente: PendienteAsistente | null
  secreto: SecretoAsistente | null
}
