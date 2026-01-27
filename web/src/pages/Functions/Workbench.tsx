import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Play,
  Bug,
  Terminal,
  Settings,
  List,
  Activity,
  Code2,
  X,
  RefreshCw,
  CheckCircle2,
  GripVertical,
  GripHorizontal,
  Circle,
} from 'lucide-react'
import Editor, { Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { functionService } from '../../services'
import { debugService } from '../../services/debugService'
import type { Function, Runtime, InvokeResponse } from '../../types'
import type { DebugSessionState, StackFrame, Scope, Variable, Thread, BreakpointState } from '../../types/debug'
import { RUNTIME_LABELS } from '../../types'
import { formatJson, cn } from '../../utils'
import LogStreamViewer from '../../components/LogViewer/LogStreamViewer'
import {
  DebugToolbar,
  VariablesView,
  CallStackView,
  breakpointManager,
  WatchView,
  DebugConsole,
  BreakpointDialog,
} from '../../components/Debug'
import type { WatchExpression, ConsoleEntry } from '../../components/Debug'

type SidebarTab = 'config' | 'invocations' | 'metrics' | 'debug'
type BottomTab = 'logs' | 'test' | 'output' | 'debug-console'

// 根据运行时获取文件名
const getDebugFilePath = (runtime: string): string => {
  // 这些路径需要匹配 debug_handler.go 中容器内的用户代码文件路径
  if (runtime.includes('python')) return '/tmp/handler.py'
  if (runtime.includes('node')) return '/tmp/handler.js'
  if (runtime.includes('go')) return '/tmp/handler.go'
  return '/tmp/handler.py'
}

export default function FunctionWorkbench() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // 基础数据
  const [fn, setFn] = useState<Function | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 布局状态 (支持拖拽)
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const [bottomHeight, setBottomHeight] = useState(260)
  const [activeSidebar, setActiveSidebar] = useState<SidebarTab>('config')
  const [activeBottom, setActiveBottom] = useState<BottomTab>('logs')

  // 通知状态
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // 编辑器状态
  const [code, setCode] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [configForm, setConfigForm] = useState({
    memory_mb: 128,
    timeout_sec: 30,
    cron_expression: '',
    http_path: '',
    http_methods: [] as string[],
  })

  // Monaco 编辑器引用
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const decorationsRef = useRef<string[]>([])
  const fnRef = useRef<Function | null>(null)

  // 保持 fnRef 同步
  useEffect(() => {
    fnRef.current = fn
  }, [fn])
  // 测试与执行状态
  const [testPayload, setTestPayload] = useState('{}')
  const [testResult, setTestResult] = useState<InvokeResponse | null>(null)
  const [executing, setExecuting] = useState(false)

  // 调试状态
  const [debugState, setDebugState] = useState<DebugSessionState>('stopped')
  const [breakpoints, setBreakpoints] = useState<BreakpointState[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [stackFrames, setStackFrames] = useState<StackFrame[]>([])
  const [scopes, setScopes] = useState<Scope[]>([])
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null)
  const [activeFrameId, setActiveFrameId] = useState<number | null>(null)
  const [currentLine, setCurrentLine] = useState<number | null>(null)

  // Watch 表达式
  const [watchExpressions, setWatchExpressions] = useState<WatchExpression[]>([])
  const watchIdCounter = useRef(0)

  // 调试控制台
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([])
  const consoleIdCounter = useRef(0)

  // 断点编辑对话框
  const [editingBreakpoint, setEditingBreakpoint] = useState<BreakpointState | null>(null)
  const [breakpointDialogPos, setBreakpointDialogPos] = useState<{ x: number; y: number } | undefined>()

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // 加载数据
  const loadData = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await functionService.get(id)
      setFn(data)
      setCode(data.code)
      setConfigForm({
        memory_mb: data.memory_mb,
        timeout_sec: data.timeout_sec,
        cron_expression: data.cron_expression || '',
        http_path: data.http_path || '',
        http_methods: data.http_methods || [],
      })
    } catch (error) {
      showToast('加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (fn) {
      const configChanged =
        configForm.memory_mb !== fn.memory_mb ||
        configForm.timeout_sec !== fn.timeout_sec ||
        configForm.cron_expression !== (fn.cron_expression || '') ||
        configForm.http_path !== (fn.http_path || '')
      setHasChanges(code !== fn.code || configChanged)
    }
  }, [code, configForm, fn])

  // 保存 updateEditorBreakpoints 的最新引用（会在 updateEditorBreakpoints 定义后通过 useEffect 更新）
  const updateEditorBreakpointsRef = useRef<() => void>(() => {})

  // 断点管理监听
  useEffect(() => {
    const unsubscribe = breakpointManager.addListener((bps) => {
      setBreakpoints(bps)
      // 使用 ref 确保调用最新的函数
      updateEditorBreakpointsRef.current()
    })
    return unsubscribe
  }, [])

  // 调试服务事件监听
  useEffect(() => {
    debugService.onStateChange = (state) => {
      setDebugState(state)
      if (state === 'stopped') {
        setThreads([])
        setStackFrames([])
        setScopes([])
        setCurrentLine(null)
      }
    }

    debugService.onError = (error) => {
      showToast(error, 'error')
      addDebugOutput('error', error)
    }

    const unsubStopped = debugService.on('stopped', async (body: any) => {
      addDebugOutput('system', `程序已暂停: ${body.reason}`)
      await refreshDebugState()
    })

    const unsubOutput = debugService.on('output', (body: any) => {
      addDebugOutput(body.category || 'stdout', body.output)
    })

    const unsubTerminated = debugService.on('terminated', () => {
      addDebugOutput('system', '调试会话已结束')
    })

    return () => {
      unsubStopped()
      unsubOutput()
      unsubTerminated()
    }
  }, [])

  // 刷新调试状态
  const refreshDebugState = async () => {
    try {
      const threadList = await debugService.threads()
      setThreads(threadList)

      if (threadList.length > 0) {
        const tid = threadList[0].id
        setActiveThreadId(tid)

        const frames = await debugService.stackTrace(tid)
        setStackFrames(frames)

        if (frames.length > 0) {
          const frameId = frames[0].id
          setActiveFrameId(frameId)
          setCurrentLine(frames[0].line)

          const scopeList = await debugService.scopes(frameId)
          setScopes(scopeList)

          // 刷新 watch 表达式
          for (const expr of watchExpressions) {
            try {
              const result = await debugService.evaluate(expr.expression, frameId, 'watch')
              setWatchExpressions((prev) =>
                prev.map((e) =>
                  e.id === expr.id
                    ? { ...e, result: result.result, variablesReference: result.variablesReference, error: undefined }
                    : e
                )
              )
            } catch (err: any) {
              setWatchExpressions((prev) =>
                prev.map((e) =>
                  e.id === expr.id
                    ? { ...e, result: undefined, error: err.message || 'Error' }
                    : e
                )
              )
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to refresh debug state:', e)
    }
  }

  // 添加调试输出
  const addDebugOutput = (type: string, message: string) => {
    const consoleType = type === 'system' ? 'system' : type === 'error' ? 'error' : type === 'stderr' ? 'stderr' : 'stdout'
    addConsoleEntry(consoleType, message.trim())
  }

  // 更新编辑器断点装饰
  const updateEditorBreakpoints = useCallback(() => {
    if (!editorRef.current || !monacoRef.current || !fn) return

    const monaco = monacoRef.current
    const editor = editorRef.current
    const model = editor.getModel()
    if (!model) return

    // 获取当前文件的断点（根据运行时动态确定路径）
    const filePath = getDebugFilePath(fn.runtime)
    const fileBps = breakpointManager.getBreakpointsByPath(filePath)

    // 构建装饰
    const decorations: editor.IModelDeltaDecoration[] = fileBps.map((bp) => ({
      range: new monaco.Range(bp.line, 1, bp.line, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: bp.enabled
          ? bp.verified
            ? 'debug-breakpoint-verified'
            : 'debug-breakpoint'
          : 'debug-breakpoint-disabled',
        glyphMarginHoverMessage: { value: bp.condition ? `条件: ${bp.condition}` : '断点' },
      },
    }))

    // 添加当前执行行高亮
    if (currentLine !== null) {
      decorations.push({
        range: new monaco.Range(currentLine, 1, currentLine, 1),
        options: {
          isWholeLine: true,
          className: 'debug-current-line',
          glyphMarginClassName: 'debug-current-line-glyph',
        },
      })
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations)
  }, [fn, currentLine])

  // 更新 ref 以保存 updateEditorBreakpoints 的最新引用
  useEffect(() => {
    updateEditorBreakpointsRef.current = updateEditorBreakpoints
  }, [updateEditorBreakpoints])

  // 当 currentLine 变化时更新装饰
  useEffect(() => {
    updateEditorBreakpoints()
  }, [currentLine, updateEditorBreakpoints])

  // Monaco 编辑器挂载
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // 添加断点样式
    const style = document.createElement('style')
    style.textContent = `
      .debug-breakpoint {
        background: #e51400;
        border-radius: 50%;
        width: 10px !important;
        height: 10px !important;
        margin-left: 5px;
        margin-top: 5px;
      }
      .debug-breakpoint-verified {
        background: #e51400;
        border-radius: 50%;
        width: 10px !important;
        height: 10px !important;
        margin-left: 5px;
        margin-top: 5px;
        box-shadow: 0 0 4px #e51400;
      }
      .debug-breakpoint-disabled {
        background: #848484;
        border-radius: 50%;
        width: 10px !important;
        height: 10px !important;
        margin-left: 5px;
        margin-top: 5px;
      }
      .debug-current-line {
        background: rgba(255, 200, 0, 0.2) !important;
      }
      .debug-current-line-glyph {
        background: #ffc800;
        width: 0;
        height: 0;
        border-left: 8px solid #ffc800;
        border-top: 5px solid transparent;
        border-bottom: 5px solid transparent;
        margin-left: 3px;
        margin-top: 5px;
      }
    `
    document.head.appendChild(style)

    // 点击 glyph margin 设置断点
    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const line = e.target.position?.lineNumber
        if (line && fnRef.current) {
          const filePath = getDebugFilePath(fnRef.current.runtime)
          breakpointManager.toggleBreakpoint(filePath, line)
        }
      }
    })

    // 初始更新断点
    updateEditorBreakpoints()
  }

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (!saving) handleSave()
      }
      if (e.key === 'F5') {
        e.preventDefault()
        if (debugState === 'paused') {
          handleDebugContinue()
        } else if (debugState === 'stopped') {
          handleDebug()
        }
      }
      if (e.key === 'F10' && debugState === 'paused') {
        e.preventDefault()
        handleDebugStepOver()
      }
      if (e.key === 'F11' && debugState === 'paused') {
        e.preventDefault()
        if (e.shiftKey) {
          handleDebugStepOut()
        } else {
          handleDebugStepInto()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasChanges, saving, executing, code, configForm, debugState])

  const handleSave = async () => {
    if (!id || !fn) return
    try {
      setSaving(true)
      await functionService.update(id, { code, ...configForm })
      await loadData()
      setHasChanges(false)
      showToast('保存成功')
    } catch (error) {
      showToast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRun = async () => {
    if (!id) return
    try {
      setExecuting(true)
      setActiveBottom('test')
      let payload = {}
      try { payload = JSON.parse(testPayload) } catch(e) {}
      const result = await functionService.invoke(id, payload)
      setTestResult(result)
      setActiveBottom('output')
      showToast('执行完成')
    } catch (error) {
      showToast('执行失败', 'error')
    } finally {
      setExecuting(false)
    }
  }

  // 调试操作
  const handleDebug = async () => {
    if (!id || !fn) return
    try {
      setConsoleEntries([])
      addDebugOutput('system', '正在连接调试服务...')
      setActiveBottom('debug-console')
      setActiveSidebar('debug')

      await debugService.connect(fn.id)
      addDebugOutput('system', '已连接，正在启动调试容器...')

      // 解析调试参数
      let payload = {}
      try {
        payload = JSON.parse(testPayload)
      } catch {
        payload = {}
      }

      // Launch 模式：由后端启动调试容器
      await debugService.launchDebug(payload, true)
      addDebugOutput('system', '调试容器已启动，正在等待 debugpy 就绪...')

      // 等待一小段时间让后端连接到 debugpy
      await new Promise(resolve => setTimeout(resolve, 1000))

      const caps = await debugService.initialize()
      addDebugOutput('system', `调试器已初始化 (支持 ${Object.keys(caps).filter(k => (caps as any)[k]).length} 项能力)`)

      // 发送断点
      const filePath = getDebugFilePath(fn.runtime)
      const bps = breakpointManager.toSourceBreakpoints(filePath)
      if (bps.length > 0) {
        const verified = await debugService.setBreakpoints(filePath, bps)
        breakpointManager.updateVerificationStatus(filePath, verified)
        addDebugOutput('system', `已设置 ${verified.filter(b => b.verified).length}/${bps.length} 个断点`)
      }

      await debugService.configurationDone()
      addDebugOutput('system', '调试会话已就绪，程序正在执行...')
      showToast('调试会话已建立')

    } catch (error: any) {
      showToast('启动调试失败: ' + error.message, 'error')
      addDebugOutput('error', '启动调试失败: ' + error.message)
    }
  }

  const handleDebugStop = async () => {
    try {
      await debugService.terminate()
      debugService.disconnect()
      addDebugOutput('system', '调试会话已停止')
    } catch (e) {
      debugService.disconnect()
    }
  }

  const handleDebugContinue = async () => {
    try {
      await debugService.continue(activeThreadId || 1)
      setCurrentLine(null)
    } catch (e: any) {
      showToast('继续执行失败', 'error')
    }
  }

  const handleDebugPause = async () => {
    try {
      await debugService.pause(activeThreadId || 1)
    } catch (e: any) {
      showToast('暂停失败', 'error')
    }
  }

  const handleDebugStepOver = async () => {
    try {
      await debugService.stepOver(activeThreadId || 1)
      setCurrentLine(null)
    } catch (e: any) {
      showToast('单步跳过失败', 'error')
    }
  }

  const handleDebugStepInto = async () => {
    try {
      await debugService.stepInto(activeThreadId || 1)
      setCurrentLine(null)
    } catch (e: any) {
      showToast('单步进入失败', 'error')
    }
  }

  const handleDebugStepOut = async () => {
    try {
      await debugService.stepOut(activeThreadId || 1)
      setCurrentLine(null)
    } catch (e: any) {
      showToast('单步跳出失败', 'error')
    }
  }

  const handleDebugRestart = async () => {
    await handleDebugStop()
    setTimeout(() => handleDebug(), 500)
  }

  const handleSelectThread = async (threadId: number) => {
    setActiveThreadId(threadId)
    try {
      const frames = await debugService.stackTrace(threadId)
      setStackFrames(frames)
      if (frames.length > 0) {
        handleSelectFrame(frames[0].id)
      }
    } catch (e) {
      console.error('Failed to get stack trace:', e)
    }
  }

  const handleSelectFrame = async (frameId: number) => {
    setActiveFrameId(frameId)
    const frame = stackFrames.find(f => f.id === frameId)
    if (frame) {
      setCurrentLine(frame.line)
      // 跳转到对应行
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(frame.line)
      }
    }
    try {
      const scopeList = await debugService.scopes(frameId)
      setScopes(scopeList)
    } catch (e) {
      console.error('Failed to get scopes:', e)
    }
  }

  const handleExpandVariable = async (variablesReference: number): Promise<Variable[]> => {
    return debugService.variables(variablesReference)
  }

  // Watch 表达式处理
  const handleAddWatch = (expression: string) => {
    const id = `watch-${++watchIdCounter.current}`
    const newExpr: WatchExpression = { id, expression }
    setWatchExpressions((prev) => [...prev, newExpr])
    // 立即求值
    if (debugState === 'paused' && activeFrameId) {
      evaluateWatchExpression(newExpr)
    }
  }

  const handleRemoveWatch = (id: string) => {
    setWatchExpressions((prev) => prev.filter((e) => e.id !== id))
  }

  const handleEditWatch = (id: string, expression: string) => {
    setWatchExpressions((prev) =>
      prev.map((e) => (e.id === id ? { ...e, expression, result: undefined, error: undefined } : e))
    )
    // 重新求值
    const expr = watchExpressions.find((e) => e.id === id)
    if (expr && debugState === 'paused' && activeFrameId) {
      evaluateWatchExpression({ ...expr, expression })
    }
  }

  const evaluateWatchExpression = async (expr: WatchExpression) => {
    try {
      const result = await debugService.evaluate(expr.expression, activeFrameId || undefined, 'watch')
      setWatchExpressions((prev) =>
        prev.map((e) =>
          e.id === expr.id
            ? { ...e, result: result.result, variablesReference: result.variablesReference, error: undefined }
            : e
        )
      )
    } catch (err: any) {
      setWatchExpressions((prev) =>
        prev.map((e) =>
          e.id === expr.id
            ? { ...e, result: undefined, error: err.message || 'Error' }
            : e
        )
      )
    }
  }

  const handleRefreshWatches = async () => {
    if (debugState !== 'paused' || !activeFrameId) return
    for (const expr of watchExpressions) {
      await evaluateWatchExpression(expr)
    }
  }

  // 调试控制台处理
  const addConsoleEntry = (type: ConsoleEntry['type'], content: string) => {
    setConsoleEntries((prev) => [
      ...prev.slice(-199),
      { id: ++consoleIdCounter.current, type, content, timestamp: Date.now() },
    ])
  }

  const handleConsoleEvaluate = async (expression: string) => {
    addConsoleEntry('input', expression)
    if (debugState !== 'paused') {
      addConsoleEntry('error', '调试器未暂停，无法求值')
      return
    }
    try {
      const result = await debugService.evaluate(expression, activeFrameId || undefined, 'repl')
      addConsoleEntry('output', result.result)
    } catch (err: any) {
      addConsoleEntry('error', err.message || '求值失败')
    }
  }

  const handleConsoleClear = () => {
    setConsoleEntries([])
  }

  // 断点编辑
  const openBreakpointDialog = (bp: BreakpointState, event?: React.MouseEvent) => {
    if (event) {
      setBreakpointDialogPos({ x: event.clientX, y: event.clientY })
    } else {
      setBreakpointDialogPos(undefined)
    }
    setEditingBreakpoint(bp)
  }

  const handleBreakpointSave = (id: string, condition?: string, hitCondition?: string, logMessage?: string) => {
    breakpointManager.updateBreakpointCondition(id, condition, hitCondition, logMessage)
    // 如果调试会话已连接，重新设置断点
    if (debugService.isConnected() && fn) {
      const filePath = getDebugFilePath(fn.runtime)
      const bps = breakpointManager.toSourceBreakpoints(filePath)
      debugService.setBreakpoints(filePath, bps).then((verified) => {
        breakpointManager.updateVerificationStatus(filePath, verified)
      })
    }
  }

  // 拖拽逻辑
  const startResizingSidebar = (e: React.MouseEvent) => {
    const startX = e.pageX
    const startWidth = sidebarWidth
    const onMouseMove = (moveEvent: MouseEvent) => {
      setSidebarWidth(Math.max(200, Math.min(600, startWidth + (moveEvent.pageX - startX))))
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const startResizingBottom = (e: React.MouseEvent) => {
    const startY = e.pageY
    const startHeight = bottomHeight
    const onMouseMove = (moveEvent: MouseEvent) => {
      setBottomHeight(Math.max(150, Math.min(600, startHeight - (moveEvent.pageY - startY))))
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const isDebugging = debugState !== 'stopped' && debugState !== 'initializing'

  if (loading) return <div className="flex items-center justify-center h-screen bg-background"><RefreshCw className="w-8 h-8 animate-spin text-accent" /></div>
  if (!fn) return <div className="p-8 text-center">函数不存在</div>

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden text-foreground selection:bg-accent/30">
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-in slide-in-from-top duration-300",
          toast.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/functions')} className="p-1.5 hover:bg-secondary rounded-md transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-accent" />
            <span className="font-bold text-sm tracking-tight">{fn.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase font-mono">v{fn.version}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 调试工具栏 */}
          {isDebugging && (
            <DebugToolbar
              state={debugState}
              onContinue={handleDebugContinue}
              onPause={handleDebugPause}
              onStepOver={handleDebugStepOver}
              onStepInto={handleDebugStepInto}
              onStepOut={handleDebugStepOut}
              onStop={handleDebugStop}
              onRestart={handleDebugRestart}
              className="mr-2"
            />
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-all group relative",
              "bg-accent text-accent-foreground hover:bg-accent/90",
              hasChanges && "shadow-[0_0_15px_rgba(var(--accent),0.3)]"
            )}
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            保存
            {hasChanges && <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />}
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button onClick={handleRun} disabled={executing || isDebugging} className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-all">
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
            运行
          </button>
          <button onClick={handleDebug} disabled={executing || isDebugging} className="flex items-center px-3 py-1.5 bg-orange-600 text-white rounded-md text-xs font-medium hover:bg-orange-700 disabled:opacity-50 transition-all">
            {debugState === 'initializing' ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Bug className="w-3.5 h-3.5 mr-1.5" />}
            调试
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <aside className="w-12 border-r border-border flex flex-col items-center py-4 gap-4 bg-card/30 z-20">
          {[
            { id: 'config', icon: Settings },
            { id: 'invocations', icon: List },
            { id: 'metrics', icon: Activity },
            { id: 'debug', icon: Bug, badge: breakpoints.length > 0 },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveSidebar(item.id as SidebarTab)} className={cn("p-2 rounded-lg transition-colors relative", activeSidebar === item.id ? "text-accent bg-accent/10 shadow-[inset_0_0_10px_rgba(var(--accent),0.1)]" : "text-muted-foreground hover:text-foreground")}>
              <item.icon className="w-5 h-5" />
              {item.badge && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center">
                  {breakpoints.length}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Sidebar Panel */}
        <aside style={{ width: sidebarWidth }} className="border-r border-border bg-card/10 flex flex-col overflow-hidden relative">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {activeSidebar === 'config' ? '函数配置' : activeSidebar === 'invocations' ? '最近调用' : activeSidebar === 'metrics' ? '实时指标' : '调试器'}
            </h3>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            {activeSidebar === 'config' && (
              <div className="p-4 space-y-6">
                <section>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">运行时</label>
                  <div className="mt-1 text-xs font-medium bg-secondary/30 px-2 py-1.5 rounded">{RUNTIME_LABELS[fn.runtime as Runtime]}</div>
                </section>
                <section>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">自定义路径</label>
                  <input className="mt-1 w-full bg-input border border-border rounded px-2 py-1.5 text-xs font-mono focus:ring-1 focus:ring-accent outline-none transition-all" value={configForm.http_path} onChange={e => setConfigForm({...configForm, http_path: e.target.value})} placeholder="/api/route" />
                </section>
                <section>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">内存 (MB)</label>
                  <select className="mt-1 w-full bg-input border border-border rounded px-2 py-1.5 text-xs outline-none" value={configForm.memory_mb} onChange={e => setConfigForm({...configForm, memory_mb: Number(e.target.value)})}>
                    {[128, 256, 512, 1024].map(m => <option key={m} value={m}>{m} MB</option>)}
                  </select>
                </section>
              </div>
            )}
            {activeSidebar === 'debug' && (
              <div className="flex flex-col h-full">
                {/* 调试参数 */}
                <div className="border-b border-border p-2 space-y-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">调试参数 (JSON)</div>
                  <textarea
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    placeholder='{"key": "value"}'
                    className="w-full h-16 px-2 py-1.5 text-xs font-mono bg-secondary border border-border rounded resize-none"
                  />
                </div>

                {/* 断点列表 */}
                <div className="border-b border-border">
                  <div className="px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">断点</span>
                    <span className="text-[10px] text-muted-foreground">{breakpoints.length}</span>
                  </div>
                  <div className="max-h-28 overflow-auto">
                    {breakpoints.length === 0 ? (
                      <div className="px-4 py-2 text-[10px] text-muted-foreground italic">
                        点击行号设置断点
                      </div>
                    ) : (
                      breakpoints.map((bp) => (
                        <div
                          key={bp.id}
                          className="flex items-center gap-2 px-2 py-1 hover:bg-secondary/50 cursor-pointer group"
                          onClick={() => {
                            if (editorRef.current) {
                              editorRef.current.revealLineInCenter(bp.line)
                            }
                          }}
                          onDoubleClick={(e) => openBreakpointDialog(bp, e)}
                        >
                          <Circle className={cn(
                            "w-2.5 h-2.5 flex-shrink-0",
                            bp.logMessage ? "fill-yellow-500 text-yellow-500" : bp.verified ? "fill-red-500 text-red-500" : "fill-gray-500 text-gray-500"
                          )} />
                          <span className="text-[11px] flex-1 truncate">
                            handler.py:{bp.line}
                            {(bp.condition || bp.hitCondition || bp.logMessage) && (
                              <span className="text-muted-foreground ml-1">
                                {bp.condition && `(${bp.condition})`}
                                {bp.hitCondition && `[=${bp.hitCondition}]`}
                                {bp.logMessage && <span className="text-yellow-500"> log</span>}
                              </span>
                            )}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openBreakpointDialog(bp, e)
                            }}
                            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-secondary rounded transition-opacity"
                            title="编辑断点"
                          >
                            <Settings className="w-3 h-3 text-muted-foreground" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              breakpointManager.removeBreakpoint(bp.id)
                            }}
                            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-secondary rounded transition-opacity"
                            title="删除断点"
                          >
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Watch 监视面板 */}
                <div className="h-36 border-b border-border">
                  <WatchView
                    expressions={watchExpressions}
                    onAddExpression={handleAddWatch}
                    onRemoveExpression={handleRemoveWatch}
                    onEditExpression={handleEditWatch}
                    onRefresh={handleRefreshWatches}
                    onExpandVariable={handleExpandVariable}
                    disabled={debugState !== 'paused'}
                  />
                </div>

                {/* 变量面板 */}
                <div className="flex-1 min-h-0">
                  <VariablesView
                    scopes={scopes}
                    onExpandVariable={handleExpandVariable}
                    onRefresh={refreshDebugState}
                    loading={false}
                  />
                </div>

                {/* 调用栈面板 */}
                <div className="h-40 border-t border-border">
                  <CallStackView
                    threads={threads}
                    stackFrames={stackFrames}
                    activeThreadId={activeThreadId}
                    activeFrameId={activeFrameId}
                    onSelectThread={handleSelectThread}
                    onSelectFrame={handleSelectFrame}
                    onRefresh={refreshDebugState}
                  />
                </div>
              </div>
            )}
          </div>
          {/* Resize Handle */}
          <div onMouseDown={startResizingSidebar} className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/50 transition-colors flex items-center justify-center group">
            <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
          </div>
        </aside>

        {/* Main Editor & Bottom Panel */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#1e1e1e] relative">
          <div className="flex-1 relative">
            <Editor
              height="100%"
              theme="vs-dark"
              language={fn.runtime.includes('python') ? 'python' : fn.runtime.includes('node') ? 'javascript' : 'go'}
              value={code}
              onChange={val => setCode(val || '')}
              onMount={handleEditorDidMount}
              options={{
                fontSize: 13,
                fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                glyphMargin: true,
                folding: true,
                wordWrap: 'on',
                smoothScrolling: true,
                cursorSmoothCaretAnimation: "on" as any,
              }}
            />
          </div>

          {/* Bottom Panel */}
          <div style={{ height: bottomHeight }} className="border-t border-border flex flex-col bg-card/50 relative">
            {/* Resize Handle */}
            <div onMouseDown={startResizingBottom} className="absolute -top-0.5 left-0 w-full h-1 cursor-row-resize hover:bg-accent/50 transition-colors flex items-center justify-center group z-30">
              <GripHorizontal className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </div>

            <div className="h-9 border-b border-border flex items-center px-4 gap-6 bg-card/80">
              {[
                { id: 'logs', label: '实时日志', icon: Terminal },
                { id: 'test', label: '执行测试', icon: Play },
                { id: 'output', label: '输出结果', icon: CheckCircle2 },
                { id: 'debug-console', label: '调试控制台', icon: Bug },
              ].map(t => (
                <button key={t.id} onClick={() => setActiveBottom(t.id as BottomTab)} className={cn("flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 h-full px-1", activeBottom === t.id ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground")}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              {activeBottom === 'logs' && <LogStreamViewer functionId={fn.id} className="h-full border-none rounded-none" />}
              {activeBottom === 'test' && (
                <div className="h-full p-2 bg-[#1e1e1e]">
                  <Editor height="100%" theme="vs-dark" language="json" value={testPayload} onChange={val => setTestPayload(val || '')} options={{ minimap: { enabled: false }, lineNumbers: 'off', fontSize: 12 }} />
                </div>
              )}
              {activeBottom === 'output' && (
                <div className="h-full overflow-auto p-4 font-mono text-xs text-foreground bg-slate-950">
                  {testResult ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-muted-foreground pb-2 border-b border-white/5">
                        <span className={cn("px-2 py-0.5 rounded", testResult.status_code < 300 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>HTTP {testResult.status_code}</span>
                        <span>耗时: {testResult.duration_ms}ms</span>
                      </div>
                      <pre className="whitespace-pre-wrap">{testResult.error || formatJson(testResult.body)}</pre>
                    </div>
                  ) : <div className="text-muted-foreground h-full flex items-center justify-center italic">点击上方的"运行"按钮开始</div>}
                </div>
              )}
              {activeBottom === 'debug-console' && (
                <DebugConsole
                  entries={consoleEntries}
                  onEvaluate={handleConsoleEvaluate}
                  onClear={handleConsoleClear}
                  disabled={debugState !== 'paused'}
                  className="h-full"
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* 断点编辑对话框 */}
      {editingBreakpoint && (
        <BreakpointDialog
          breakpoint={editingBreakpoint}
          position={breakpointDialogPos}
          onSave={handleBreakpointSave}
          onClose={() => setEditingBreakpoint(null)}
        />
      )}
    </div>
  )
}
