import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { Pause, Play, Trash2, Download, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { cn } from '../../utils'
import { functionService, logsService } from '../../services'
import type { Function } from '../../types'

interface LogEntry {
  timestamp: string
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  function_id: string
  function_name: string
  message: string
  request_id?: string
  input?: unknown
  output?: unknown
  error?: string
  duration_ms?: number
}

const levelColors: Record<string, string> = {
  DEBUG: 'text-muted-foreground',
  INFO: 'text-blue-400',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
}

// 生成日志的唯一 key - 避免使用 index
const getLogKey = (log: LogEntry, index: number): string => {
  return `${log.timestamp}|${log.function_id}|${log.request_id || ''}|${index}`
}

// 单条日志组件 - 使用 memo 避免不必要的重渲染
const LogRow = memo(function LogRow({ log }: { log: LogEntry }) {
  return (
    <div className="py-1 hover:bg-card/50 log-line border-b border-border/50">
      <div className="flex items-start">
        <span className="text-muted-foreground flex-shrink-0">
          {new Date(log.timestamp).toLocaleTimeString()}
        </span>
        <span className={cn('ml-2 flex-shrink-0', levelColors[log.level])}>
          [{log.level.padEnd(5)}]
        </span>
        <span className="ml-2 text-accent flex-shrink-0">{log.function_name}</span>
        <span className="ml-2 text-foreground">{log.message}</span>
        {log.duration_ms !== undefined && (
          <span className="ml-2 text-green-400">({log.duration_ms}ms)</span>
        )}
        {log.request_id && (
          <span className="ml-2 text-muted-foreground">[{log.request_id}]</span>
        )}
      </div>
      {log.input != null && (
        <div className="ml-20 mt-1">
          <span className="text-purple-400">输入: </span>
          <span className="text-muted-foreground">{JSON.stringify(log.input)}</span>
        </div>
      )}
      {log.output != null && (
        <div className="ml-20 mt-1">
          <span className="text-green-400">输出: </span>
          <span className="text-muted-foreground">{JSON.stringify(log.output)}</span>
        </div>
      )}
      {log.error && (
        <div className="ml-20 mt-1">
          <span className="text-red-400">错误: </span>
          <span className="text-red-300">{log.error}</span>
        </div>
      )}
    </div>
  )
})

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [paused, setPaused] = useState(false)
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [functionFilter, setFunctionFilter] = useState<string>('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [functions, setFunctions] = useState<Function[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pausedRef = useRef(paused)
  const levelFilterRef = useRef(levelFilter)
  const functionFilterRef = useRef(functionFilter)

  // 加载函数列表用于过滤
  useEffect(() => {
    const loadFunctions = async () => {
      try {
        const data = await functionService.list()
        setFunctions(data.functions || [])
      } catch (error) {
        console.error('Failed to load functions:', error)
      }
    }
    loadFunctions()
  }, [])

  // 加载最近日志（刷新后可回放）
  useEffect(() => {
    const loadRecentLogs = async () => {
      try {
        const resp = await logsService.list({ limit: 200 })
        const history = (resp.data || []).slice().reverse() as unknown as LogEntry[]
        setLogs((prev) => {
          const merged = [...history, ...prev]
          const seen = new Set<string>()
          const deduped: LogEntry[] = []
          for (const log of merged) {
            const key = `${log.timestamp}|${log.level}|${log.function_id}|${log.request_id || ''}|${log.message}`
            if (seen.has(key)) continue
            seen.add(key)
            deduped.push(log)
          }
          if (deduped.length > 1000) {
            return deduped.slice(-1000)
          }
          return deduped
        })
      } catch (error) {
        console.error('Failed to load recent logs:', error)
      }
    }
    loadRecentLogs()
  }, [])

  // 用 ref 避免 WebSocket 回调闭包拿到旧状态
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])
  useEffect(() => {
    levelFilterRef.current = levelFilter
  }, [levelFilter])
  useEffect(() => {
    functionFilterRef.current = functionFilter
  }, [functionFilter])

  // WebSocket 连接
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setConnecting(true)

    // 构建 WebSocket URL
    // 在开发模式下直接连接后端，生产模式使用相对路径
    let wsUrl: string
    if (import.meta.env.DEV) {
      // 开发模式：直接连接后端
      const backendHost = import.meta.env.VITE_API_URL || 'localhost:18080'
      wsUrl = `ws://${backendHost}/api/console/logs/stream`
    } else {
      // 生产模式：使用当前主机
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      wsUrl = `${protocol}//${host}/api/console/logs/stream`
    }

    console.log('Connecting to WebSocket:', wsUrl)
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      setConnected(true)
      setConnecting(false)
    }

    ws.onmessage = (event) => {
      if (pausedRef.current) return

      try {
        const log: LogEntry = JSON.parse(event.data)

        // 应用过滤器
        if (levelFilterRef.current && log.level !== levelFilterRef.current) return
        if (functionFilterRef.current && log.function_name !== functionFilterRef.current) return

        setLogs((prev) => {
          const newLogs = [...prev, log]
          if (newLogs.length > 1000) {
            return newLogs.slice(-1000)
          }
          return newLogs
        })
      } catch (error) {
        console.error('Failed to parse log message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setConnected(false)
      setConnecting(false)
      wsRef.current = null

      // 自动重连
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...')
        connectWebSocket()
      }, 3000)
    }
  }, [])

  // 初始连接
  useEffect(() => {
    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, []) // 只在组件挂载时连接一次

  // 自动滚动
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50)
  }

  const clearLogs = () => setLogs([])

  const exportLogs = () => {
    const content = logs
      .map((log) => `${log.timestamp} [${log.level}] ${log.function_name}: ${log.message}`)
      .join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReconnect = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    connectWebSocket()
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">实时日志</h1>
          <p className="text-muted-foreground mt-1">查看函数执行日志</p>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 连接状态 */}
            <div className="flex items-center">
              {connecting ? (
                <RefreshCw className="w-4 h-4 mr-2 text-yellow-400 animate-spin" />
              ) : connected ? (
                <Wifi className="w-4 h-4 mr-2 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 mr-2 text-red-400" />
              )}
              <span className="text-sm text-muted-foreground">
                {connecting ? '连接中...' : connected ? '已连接' : '已断开'}
              </span>
              {!connected && !connecting && (
                <button
                  onClick={handleReconnect}
                  className="ml-2 text-sm text-accent hover:text-accent/80 transition-colors"
                >
                  重连
                </button>
              )}
            </div>

            {/* 日志级别过滤 */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-1.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            >
              <option value="">所有级别</option>
              <option value="DEBUG">DEBUG</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>

            {/* 函数过滤 */}
            <select
              value={functionFilter}
              onChange={(e) => setFunctionFilter(e.target.value)}
              className="px-3 py-1.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            >
              <option value="">所有函数</option>
              {functions.map((fn) => (
                <option key={fn.id} value={fn.name}>
                  {fn.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaused(!paused)}
              className={cn(
                'flex items-center px-3 py-1.5 text-sm rounded-lg border transition-colors',
                paused
                  ? 'border-green-400/50 text-green-400 hover:bg-green-400/10'
                  : 'border-border text-muted-foreground hover:bg-secondary'
              )}
            >
              {paused ? (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  继续
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  暂停
                </>
              )}
            </button>
            <button
              onClick={clearLogs}
              className="flex items-center px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              清空
            </button>
            <button
              onClick={exportLogs}
              className="flex items-center px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
            >
              <Download className="w-4 h-4 mr-1" />
              导出
            </button>
          </div>
        </div>
      </div>

      {/* 日志内容 */}
      <div className="flex-1 bg-secondary rounded-xl border border-border overflow-hidden relative">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-auto p-4 font-mono text-sm"
        >
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              {connected ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  <span className="mt-2">等待日志...</span>
                  <span className="text-xs mt-1">执行函数后将在此显示日志</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-8 h-8 mb-2" />
                  <span>未连接到日志服务</span>
                  <button
                    onClick={handleReconnect}
                    className="mt-2 text-sm text-accent hover:text-accent/80 transition-colors"
                  >
                    点击重连
                  </button>
                </>
              )}
            </div>
          ) : (
            logs.map((log, index) => (
              <LogRow key={getLogKey(log, index)} log={log} />
            ))
          )}
        </div>

        {/* 滚动到底部按钮 */}
        {!autoScroll && (
          <button
            onClick={() => {
              setAutoScroll(true)
              if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight
              }
            }}
            className="absolute bottom-4 right-4 px-3 py-1.5 bg-accent text-accent-foreground text-sm rounded-lg shadow-lg hover:bg-accent/90 transition-colors"
          >
            ↓ 滚动到底部
          </button>
        )}
      </div>
    </div>
  )
}
