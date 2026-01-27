export * from './function'
export * from './invocation'
export * from './metrics'
export * from './template'

/** Log entry from the log stream */
export interface LogEntry {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  message: string
  request_id?: string
  function_id?: string
}
