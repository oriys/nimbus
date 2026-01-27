/**
 * 调试服务 - WebSocket DAP 客户端
 * 提供与后端调试代理的通信接口
 */

import type {
  ProtocolMessage,
  Request,
  Response,
  Event,
  Capabilities,
  Breakpoint,
  SourceBreakpoint,
  Source,
  Thread,
  StackFrame,
  Scope,
  Variable,
  DebugSessionState,
  StoppedEventBody,
  OutputEventBody,
  SetBreakpointsResponseBody,
  StackTraceResponseBody,
  ScopesResponseBody,
  VariablesResponseBody,
  ThreadsResponseBody,
  ContinueResponseBody,
} from '../types/debug'

/** 事件处理器类型 */
type EventHandler<T = unknown> = (body: T) => void

/** WebSocket 消息 */
interface WSMessage {
  type: 'session' | 'dap' | 'control' | 'error'
  payload?: unknown
  session_id?: string
  state?: DebugSessionState
  event?: string
  error?: string
}

/**
 * 调试服务类
 * 封装 WebSocket 连接和 DAP 协议通信
 */
export class DebugService {
  private ws: WebSocket | null = null
  private seqNum = 0
  private pendingRequests = new Map<number, {
    resolve: (response: Response) => void
    reject: (error: Error) => void
    timeout: ReturnType<typeof setTimeout>
  }>()

  private eventHandlers = new Map<string, Set<EventHandler>>()
  private sessionId: string | null = null
  private state: DebugSessionState = 'stopped'
  private capabilities: Capabilities | null = null

  // 连接状态回调
  public onStateChange?: (state: DebugSessionState) => void
  public onError?: (error: string) => void

  /**
   * 连接到调试服务器
   * @param functionId 函数 ID
   */
  async connect(functionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const url = `${protocol}//${host}/api/debug/ws/${functionId}`

      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log('[DebugService] WebSocket connected')
        this.state = 'connected'
        this.onStateChange?.(this.state)
        resolve()
      }

      this.ws.onclose = (event) => {
        console.log('[DebugService] WebSocket closed:', event.code, event.reason)
        this.cleanup()
      }

      this.ws.onerror = (error) => {
        console.error('[DebugService] WebSocket error:', error)
        reject(new Error('WebSocket connection failed'))
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data)
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.cleanup()
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const msg: WSMessage = JSON.parse(data)

      switch (msg.type) {
        case 'session':
          this.sessionId = msg.session_id ?? null
          if (msg.state) {
            this.state = msg.state
            this.onStateChange?.(this.state)
          }
          break

        case 'dap':
          this.handleDAPMessage(msg.payload as ProtocolMessage)
          break

        case 'control':
          if (msg.event === 'stopped') {
            this.state = 'stopped'
            this.onStateChange?.(this.state)
          } else if (msg.event === 'started' || msg.event === 'launched') {
            this.state = 'connected'
            this.onStateChange?.(this.state)
          }
          break

        case 'error':
          console.error('[DebugService] Server error:', msg.error)
          this.onError?.(msg.error ?? 'Unknown error')
          break
      }
    } catch (e) {
      console.error('[DebugService] Failed to parse message:', e)
    }
  }

  /**
   * 处理 DAP 消息
   */
  private handleDAPMessage(msg: ProtocolMessage): void {
    if (msg.type === 'response') {
      const response = msg as Response
      const pending = this.pendingRequests.get(response.request_seq)
      if (pending) {
        clearTimeout(pending.timeout)
        this.pendingRequests.delete(response.request_seq)
        if (response.success) {
          pending.resolve(response)
        } else {
          pending.reject(new Error(response.message ?? 'Request failed'))
        }
      }
    } else if (msg.type === 'event') {
      const event = msg as Event
      this.handleEvent(event)
    }
  }

  /**
   * 处理 DAP 事件
   */
  private handleEvent(event: Event): void {
    console.log('[DebugService] Event:', event.event, event.body)

    // 更新状态
    switch (event.event) {
      case 'initialized':
        this.emit('initialized', event.body)
        break

      case 'stopped':
        this.state = 'paused'
        this.onStateChange?.(this.state)
        this.emit('stopped', event.body as StoppedEventBody)
        break

      case 'continued':
        this.state = 'running'
        this.onStateChange?.(this.state)
        this.emit('continued', event.body)
        break

      case 'terminated':
        this.state = 'stopped'
        this.onStateChange?.(this.state)
        this.emit('terminated', event.body)
        break

      case 'exited':
        this.emit('exited', event.body)
        break

      case 'output':
        this.emit('output', event.body as OutputEventBody)
        break

      case 'breakpoint':
        this.emit('breakpoint', event.body)
        break

      case 'thread':
        this.emit('thread', event.body)
        break

      default:
        this.emit(event.event, event.body)
    }
  }

  /**
   * 发送 DAP 请求
   */
  private sendRequest<T = unknown>(command: string, args?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'))
        return
      }

      const seq = ++this.seqNum
      const request: Request = {
        seq,
        type: 'request',
        command,
        arguments: args,
      }

      // 设置超时
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(seq)
        reject(new Error(`Request timeout: ${command}`))
      }, 10000)

      this.pendingRequests.set(seq, {
        resolve: (response) => resolve(response.body as T),
        reject,
        timeout,
      })

      const msg = {
        type: 'dap',
        payload: request,
      }

      this.ws.send(JSON.stringify(msg))
    })
  }

  /**
   * 发送控制消息
   */
  private sendControl(action: string, config?: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    const msg = {
      type: 'control',
      payload: { action, ...config },
    }

    this.ws.send(JSON.stringify(msg))
  }

  // ===========================================================================
  // 公共 API
  // ===========================================================================

  /**
   * 启动调试会话
   * @param config 可选配置，包含 debugpy 的 host 和 port
   */
  async startDebug(config?: { host?: string; port?: number }): Promise<void> {
    this.sendControl('start', config)
  }

  /**
   * Launch 模式：启动带 debugpy 的容器并连接
   */
  async launchDebug(payload?: unknown, stopOnEntry?: boolean): Promise<void> {
    this.sendControl('launch', {
      payload: payload ? JSON.stringify(payload) : '{}',
      stopOnEntry: stopOnEntry ?? true,
    })
  }

  /**
   * 停止调试会话
   */
  async stopDebug(): Promise<void> {
    this.sendControl('stop')
  }

  /**
   * 初始化调试器
   */
  async initialize(): Promise<Capabilities> {
    const caps = await this.sendRequest<Capabilities>('initialize', {
      clientID: 'nimbus-ide',
      clientName: 'Nimbus IDE',
      adapterID: 'python',
      linesStartAt1: true,
      columnsStartAt1: true,
      pathFormat: 'path',
      supportsVariableType: true,
      supportsVariablePaging: true,
      supportsRunInTerminalRequest: false,
      supportsMemoryReferences: false,
    })

    this.capabilities = caps
    return caps
  }

  /**
   * 配置完成
   */
  async configurationDone(): Promise<void> {
    await this.sendRequest('configurationDone')
  }

  /**
   * 设置断点
   * @param path 文件路径
   * @param breakpoints 断点列表
   */
  async setBreakpoints(path: string, breakpoints: SourceBreakpoint[]): Promise<Breakpoint[]> {
    const source: Source = { path }
    const response = await this.sendRequest<SetBreakpointsResponseBody>('setBreakpoints', {
      source,
      breakpoints,
    })
    return response.breakpoints
  }

  /**
   * 继续执行
   * @param threadId 线程 ID（默认为 1）
   */
  async continue(threadId = 1): Promise<boolean> {
    const response = await this.sendRequest<ContinueResponseBody>('continue', { threadId })
    this.state = 'running'
    this.onStateChange?.(this.state)
    return response.allThreadsContinued ?? false
  }

  /**
   * 单步跳过
   */
  async stepOver(threadId = 1): Promise<void> {
    await this.sendRequest('next', { threadId })
    this.state = 'running'
    this.onStateChange?.(this.state)
  }

  /**
   * 单步进入
   */
  async stepInto(threadId = 1): Promise<void> {
    await this.sendRequest('stepIn', { threadId })
    this.state = 'running'
    this.onStateChange?.(this.state)
  }

  /**
   * 单步跳出
   */
  async stepOut(threadId = 1): Promise<void> {
    await this.sendRequest('stepOut', { threadId })
    this.state = 'running'
    this.onStateChange?.(this.state)
  }

  /**
   * 暂停执行
   */
  async pause(threadId = 1): Promise<void> {
    await this.sendRequest('pause', { threadId })
  }

  /**
   * 获取线程列表
   */
  async threads(): Promise<Thread[]> {
    const response = await this.sendRequest<ThreadsResponseBody>('threads')
    return response.threads
  }

  /**
   * 获取调用栈
   */
  async stackTrace(threadId = 1, startFrame = 0, levels = 20): Promise<StackFrame[]> {
    const response = await this.sendRequest<StackTraceResponseBody>('stackTrace', {
      threadId,
      startFrame,
      levels,
    })
    return response.stackFrames
  }

  /**
   * 获取作用域
   */
  async scopes(frameId: number): Promise<Scope[]> {
    const response = await this.sendRequest<ScopesResponseBody>('scopes', { frameId })
    return response.scopes
  }

  /**
   * 获取变量
   */
  async variables(variablesReference: number, start?: number, count?: number): Promise<Variable[]> {
    const response = await this.sendRequest<VariablesResponseBody>('variables', {
      variablesReference,
      start,
      count,
    })
    return response.variables
  }

  /**
   * 求值表达式
   */
  async evaluate(expression: string, frameId?: number, context: 'watch' | 'repl' | 'hover' = 'repl'): Promise<{ result: string; variablesReference: number }> {
    return this.sendRequest('evaluate', {
      expression,
      frameId,
      context,
    })
  }

  /**
   * 断开调试器（保持程序运行）
   */
  async disconnectDebugger(restart = false): Promise<void> {
    await this.sendRequest('disconnect', { restart })
    this.state = 'stopped'
    this.onStateChange?.(this.state)
  }

  /**
   * 终止调试目标
   */
  async terminate(): Promise<void> {
    await this.sendRequest('terminate')
    this.state = 'stopped'
    this.onStateChange?.(this.state)
  }

  // ===========================================================================
  // 事件处理
  // ===========================================================================

  /**
   * 注册事件监听器
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler as EventHandler)

    // 返回取消订阅函数
    return () => {
      this.eventHandlers.get(event)?.delete(handler as EventHandler)
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, body?: unknown): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach((handler) => handler(body))
    }
  }

  // ===========================================================================
  // 状态获取
  // ===========================================================================

  /** 获取当前状态 */
  getState(): DebugSessionState {
    return this.state
  }

  /** 获取会话 ID */
  getSessionId(): string | null {
    return this.sessionId
  }

  /** 获取调试器能力 */
  getCapabilities(): Capabilities | null {
    return this.capabilities
  }

  /** 是否已连接 */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /** 是否正在调试 */
  isDebugging(): boolean {
    return this.state !== 'stopped' && this.state !== 'initializing'
  }

  /** 是否已暂停 */
  isPaused(): boolean {
    return this.state === 'paused'
  }

  // ===========================================================================
  // 内部方法
  // ===========================================================================

  /**
   * 清理资源
   */
  private cleanup(): void {
    this.state = 'stopped'
    this.onStateChange?.(this.state)
    this.sessionId = null
    this.capabilities = null

    // 拒绝所有待处理的请求
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timeout)
      pending.reject(new Error('Connection closed'))
    })
    this.pendingRequests.clear()
  }
}

// 创建单例实例
export const debugService = new DebugService()
