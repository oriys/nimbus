/**
 * Debug Adapter Protocol (DAP) 类型定义
 * 基于 VS Code Debug Protocol 规范
 * @see https://microsoft.github.io/debug-adapter-protocol/specification
 */

// ============================================================================
// 基础消息类型
// ============================================================================

/** DAP 协议消息基类 */
export interface ProtocolMessage {
  /** 序列号，用于关联请求和响应 */
  seq: number
  /** 消息类型 */
  type: 'request' | 'response' | 'event'
}

/** DAP 请求消息 */
export interface Request extends ProtocolMessage {
  type: 'request'
  /** 命令名称 */
  command: string
  /** 命令参数 */
  arguments?: unknown
}

/** DAP 响应消息 */
export interface Response extends ProtocolMessage {
  type: 'response'
  /** 对应请求的序列号 */
  request_seq: number
  /** 是否成功 */
  success: boolean
  /** 命令名称 */
  command: string
  /** 错误消息（失败时） */
  message?: string
  /** 响应体 */
  body?: unknown
}

/** DAP 事件消息 */
export interface Event extends ProtocolMessage {
  type: 'event'
  /** 事件名称 */
  event: string
  /** 事件体 */
  body?: unknown
}

// ============================================================================
// 调试器能力
// ============================================================================

/** 调试器能力 */
export interface Capabilities {
  supportsConfigurationDoneRequest?: boolean
  supportsFunctionBreakpoints?: boolean
  supportsConditionalBreakpoints?: boolean
  supportsHitConditionalBreakpoints?: boolean
  supportsEvaluateForHovers?: boolean
  supportsStepBack?: boolean
  supportsSetVariable?: boolean
  supportsRestartFrame?: boolean
  supportsGotoTargetsRequest?: boolean
  supportsStepInTargetsRequest?: boolean
  supportsCompletionsRequest?: boolean
  supportsModulesRequest?: boolean
  supportsExceptionOptions?: boolean
  supportsValueFormattingOptions?: boolean
  supportsExceptionInfoRequest?: boolean
  supportTerminateDebuggee?: boolean
  supportsDelayedStackTraceLoading?: boolean
  supportsLoadedSourcesRequest?: boolean
  supportsLogPoints?: boolean
  supportsTerminateThreadsRequest?: boolean
  supportsSetExpression?: boolean
  supportsTerminateRequest?: boolean
  supportsDataBreakpoints?: boolean
  supportsReadMemoryRequest?: boolean
  supportsDisassembleRequest?: boolean
  supportsCancelRequest?: boolean
  supportsBreakpointLocationsRequest?: boolean
  supportsClipboardContext?: boolean
  supportsSteppingGranularity?: boolean
  supportsInstructionBreakpoints?: boolean
  supportsExceptionFilterOptions?: boolean
}

// ============================================================================
// 断点相关
// ============================================================================

/** 源码位置 */
export interface Source {
  /** 源码名称 */
  name?: string
  /** 文件路径 */
  path?: string
  /** 源码引用（内存中的源码） */
  sourceReference?: number
  /** 呈现提示 */
  presentationHint?: 'normal' | 'emphasize' | 'deemphasize'
  /** 来源 */
  origin?: string
  /** 源码内容 */
  sources?: Source[]
  /** 适配器数据 */
  adapterData?: unknown
  /** 校验和 */
  checksums?: Checksum[]
}

/** 校验和 */
export interface Checksum {
  algorithm: 'MD5' | 'SHA1' | 'SHA256' | 'timestamp'
  checksum: string
}

/** 源码断点 */
export interface SourceBreakpoint {
  /** 行号 */
  line: number
  /** 列号（可选） */
  column?: number
  /** 条件表达式 */
  condition?: string
  /** 命中条件 */
  hitCondition?: string
  /** 日志消息（log point） */
  logMessage?: string
}

/** 断点 */
export interface Breakpoint {
  /** 断点 ID */
  id?: number
  /** 是否已验证 */
  verified: boolean
  /** 错误消息 */
  message?: string
  /** 源码 */
  source?: Source
  /** 实际行号 */
  line?: number
  /** 实际列号 */
  column?: number
  /** 结束行号 */
  endLine?: number
  /** 结束列号 */
  endColumn?: number
  /** 指令引用 */
  instructionReference?: string
  /** 偏移量 */
  offset?: number
}

/** 函数断点 */
export interface FunctionBreakpoint {
  /** 函数名 */
  name: string
  /** 条件 */
  condition?: string
  /** 命中条件 */
  hitCondition?: string
}

// ============================================================================
// 执行状态相关
// ============================================================================

/** 线程 */
export interface Thread {
  /** 线程 ID */
  id: number
  /** 线程名称 */
  name: string
}

/** 栈帧 */
export interface StackFrame {
  /** 帧 ID */
  id: number
  /** 函数名 */
  name: string
  /** 源码 */
  source?: Source
  /** 行号 */
  line: number
  /** 列号 */
  column: number
  /** 结束行号 */
  endLine?: number
  /** 结束列号 */
  endColumn?: number
  /** 指令指针引用 */
  instructionPointerReference?: string
  /** 模块 ID */
  moduleId?: number | string
  /** 呈现提示 */
  presentationHint?: 'normal' | 'label' | 'subtle'
}

/** 作用域 */
export interface Scope {
  /** 作用域名称 */
  name: string
  /** 呈现提示 */
  presentationHint?: 'arguments' | 'locals' | 'registers' | string
  /** 变量引用 */
  variablesReference: number
  /** 命名变量数量 */
  namedVariables?: number
  /** 索引变量数量 */
  indexedVariables?: number
  /** 是否昂贵（需要时才加载） */
  expensive: boolean
  /** 源码 */
  source?: Source
  /** 起始行 */
  line?: number
  /** 起始列 */
  column?: number
  /** 结束行 */
  endLine?: number
  /** 结束列 */
  endColumn?: number
}

/** 变量 */
export interface Variable {
  /** 变量名 */
  name: string
  /** 值 */
  value: string
  /** 类型 */
  type?: string
  /** 呈现提示 */
  presentationHint?: VariablePresentationHint
  /** 求值名称 */
  evaluateName?: string
  /** 子变量引用 */
  variablesReference: number
  /** 命名变量数量 */
  namedVariables?: number
  /** 索引变量数量 */
  indexedVariables?: number
  /** 内存引用 */
  memoryReference?: string
}

/** 变量呈现提示 */
export interface VariablePresentationHint {
  kind?: 'property' | 'method' | 'class' | 'data' | 'event' | 'baseClass' | 'innerClass' | 'interface' | 'mostDerivedClass' | 'virtual' | 'dataBreakpoint' | string
  attributes?: ('static' | 'constant' | 'readOnly' | 'rawString' | 'hasObjectId' | 'canHaveObjectId' | 'hasSideEffects' | string)[]
  visibility?: 'public' | 'private' | 'protected' | 'internal' | 'final' | string
}

// ============================================================================
// 事件类型
// ============================================================================

/** 停止原因 */
export type StoppedReason =
  | 'step'
  | 'breakpoint'
  | 'exception'
  | 'pause'
  | 'entry'
  | 'goto'
  | 'function breakpoint'
  | 'data breakpoint'
  | 'instruction breakpoint'

/** 停止事件体 */
export interface StoppedEventBody {
  /** 停止原因 */
  reason: StoppedReason
  /** 描述 */
  description?: string
  /** 线程 ID */
  threadId?: number
  /** 是否保留焦点 */
  preserveFocusHint?: boolean
  /** 文本 */
  text?: string
  /** 是否所有线程都停止 */
  allThreadsStopped?: boolean
  /** 命中的断点 ID */
  hitBreakpointIds?: number[]
}

/** 继续事件体 */
export interface ContinuedEventBody {
  /** 线程 ID */
  threadId: number
  /** 是否所有线程都继续 */
  allThreadsContinued?: boolean
}

/** 输出事件体 */
export interface OutputEventBody {
  /** 输出类别 */
  category?: 'console' | 'stdout' | 'stderr' | 'telemetry' | string
  /** 输出内容 */
  output: string
  /** 输出组 */
  group?: 'start' | 'startCollapsed' | 'end'
  /** 变量引用 */
  variablesReference?: number
  /** 源码 */
  source?: Source
  /** 行号 */
  line?: number
  /** 列号 */
  column?: number
  /** 数据 */
  data?: unknown
}

/** 断点事件体 */
export interface BreakpointEventBody {
  /** 原因 */
  reason: 'changed' | 'new' | 'removed' | string
  /** 断点 */
  breakpoint: Breakpoint
}

/** 线程事件体 */
export interface ThreadEventBody {
  /** 原因 */
  reason: 'started' | 'exited' | string
  /** 线程 ID */
  threadId: number
}

/** 终止事件体 */
export interface TerminatedEventBody {
  /** 是否重启 */
  restart?: boolean | unknown
}

/** 已初始化事件 */
export interface InitializedEvent extends Event {
  event: 'initialized'
}

/** 停止事件 */
export interface StoppedEvent extends Event {
  event: 'stopped'
  body: StoppedEventBody
}

/** 继续事件 */
export interface ContinuedEvent extends Event {
  event: 'continued'
  body: ContinuedEventBody
}

/** 输出事件 */
export interface OutputEvent extends Event {
  event: 'output'
  body: OutputEventBody
}

/** 断点事件 */
export interface BreakpointEvent extends Event {
  event: 'breakpoint'
  body: BreakpointEventBody
}

/** 线程事件 */
export interface ThreadEvent extends Event {
  event: 'thread'
  body: ThreadEventBody
}

/** 终止事件 */
export interface TerminatedEvent extends Event {
  event: 'terminated'
  body?: TerminatedEventBody
}

/** 退出事件 */
export interface ExitedEvent extends Event {
  event: 'exited'
  body: {
    exitCode: number
  }
}

// ============================================================================
// 请求/响应参数
// ============================================================================

/** Initialize 请求参数 */
export interface InitializeRequestArguments {
  clientID?: string
  clientName?: string
  adapterID: string
  locale?: string
  linesStartAt1?: boolean
  columnsStartAt1?: boolean
  pathFormat?: 'path' | 'uri' | string
  supportsVariableType?: boolean
  supportsVariablePaging?: boolean
  supportsRunInTerminalRequest?: boolean
  supportsMemoryReferences?: boolean
  supportsProgressReporting?: boolean
  supportsInvalidatedEvent?: boolean
  supportsMemoryEvent?: boolean
}

/** SetBreakpoints 请求参数 */
export interface SetBreakpointsArguments {
  source: Source
  breakpoints?: SourceBreakpoint[]
  lines?: number[]
  sourceModified?: boolean
}

/** SetBreakpoints 响应体 */
export interface SetBreakpointsResponseBody {
  breakpoints: Breakpoint[]
}

/** StackTrace 请求参数 */
export interface StackTraceArguments {
  threadId: number
  startFrame?: number
  levels?: number
  format?: StackFrameFormat
}

/** 栈帧格式 */
export interface StackFrameFormat {
  parameters?: boolean
  parameterTypes?: boolean
  parameterNames?: boolean
  parameterValues?: boolean
  line?: boolean
  module?: boolean
  includeAll?: boolean
}

/** StackTrace 响应体 */
export interface StackTraceResponseBody {
  stackFrames: StackFrame[]
  totalFrames?: number
}

/** Scopes 请求参数 */
export interface ScopesArguments {
  frameId: number
}

/** Scopes 响应体 */
export interface ScopesResponseBody {
  scopes: Scope[]
}

/** Variables 请求参数 */
export interface VariablesArguments {
  variablesReference: number
  filter?: 'indexed' | 'named'
  start?: number
  count?: number
  format?: ValueFormat
}

/** 值格式 */
export interface ValueFormat {
  hex?: boolean
}

/** Variables 响应体 */
export interface VariablesResponseBody {
  variables: Variable[]
}

/** Evaluate 请求参数 */
export interface EvaluateArguments {
  expression: string
  frameId?: number
  context?: 'watch' | 'repl' | 'hover' | 'clipboard' | string
  format?: ValueFormat
}

/** Evaluate 响应体 */
export interface EvaluateResponseBody {
  result: string
  type?: string
  presentationHint?: VariablePresentationHint
  variablesReference: number
  namedVariables?: number
  indexedVariables?: number
  memoryReference?: string
}

/** Continue 请求参数 */
export interface ContinueArguments {
  threadId: number
  singleThread?: boolean
}

/** Continue 响应体 */
export interface ContinueResponseBody {
  allThreadsContinued?: boolean
}

/** Next/StepIn/StepOut 请求参数 */
export interface StepArguments {
  threadId: number
  singleThread?: boolean
  granularity?: 'statement' | 'line' | 'instruction'
}

/** Threads 响应体 */
export interface ThreadsResponseBody {
  threads: Thread[]
}

// ============================================================================
// 调试会话状态
// ============================================================================

/** 调试会话状态 */
export type DebugSessionState =
  | 'initializing'
  | 'connected'
  | 'running'
  | 'paused'
  | 'stopped'

/** 调试会话信息 */
export interface DebugSession {
  id: string
  functionId: string
  state: DebugSessionState
  createdAt: string
  lastActivity: string
}

/** 前端断点状态 */
export interface BreakpointState {
  /** 断点 ID（前端生成） */
  id: string
  /** 文件路径 */
  path: string
  /** 行号 */
  line: number
  /** 是否启用 */
  enabled: boolean
  /** 条件表达式 */
  condition?: string
  /** 命中条件 */
  hitCondition?: string
  /** 日志消息 */
  logMessage?: string
  /** 后端返回的断点信息 */
  verified?: boolean
  /** 后端断点 ID */
  backendId?: number
}
