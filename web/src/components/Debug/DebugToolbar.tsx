/**
 * 调试工具栏组件
 * 提供继续、暂停、单步执行等调试控制按钮
 */

import {
  Play,
  Pause,
  Square,
  RotateCcw,
} from 'lucide-react'
import type { DebugSessionState } from '../../types/debug'
import { cn } from '../../utils'

interface DebugToolbarProps {
  state: DebugSessionState
  onContinue: () => void
  onPause: () => void
  onStepOver: () => void
  onStepInto: () => void
  onStepOut: () => void
  onStop: () => void
  onRestart: () => void
  disabled?: boolean
  className?: string
}

export function DebugToolbar({
  state,
  onContinue,
  onPause,
  onStepOver,
  onStepInto,
  onStepOut,
  onStop,
  onRestart,
  disabled = false,
  className,
}: DebugToolbarProps) {
  const isPaused = state === 'paused'
  const isRunning = state === 'running'
  const isDebugging = state !== 'stopped' && state !== 'initializing'
  const isConnected = state !== 'stopped'

  return (
    <div className={cn('flex items-center gap-1 bg-orange-500/10 p-1 rounded-md border border-orange-500/30', className)}>
      {/* 继续/暂停 */}
      {isPaused ? (
        <ToolbarButton
          icon={Play}
          title="继续 (F5)"
          onClick={onContinue}
          disabled={disabled || !isPaused}
          highlight
        />
      ) : (
        <ToolbarButton
          icon={Pause}
          title="暂停 (F6)"
          onClick={onPause}
          disabled={disabled || !isRunning}
        />
      )}

      {/* 单步跳过 */}
      <ToolbarButton
        icon={StepOver}
        title="单步跳过 (F10)"
        onClick={onStepOver}
        disabled={disabled || !isPaused}
      />

      {/* 单步进入 */}
      <ToolbarButton
        icon={StepInto}
        title="单步进入 (F11)"
        onClick={onStepInto}
        disabled={disabled || !isPaused}
      />

      {/* 单步跳出 */}
      <ToolbarButton
        icon={StepOut}
        title="单步跳出 (Shift+F11)"
        onClick={onStepOut}
        disabled={disabled || !isPaused}
      />

      <div className="w-px h-4 bg-orange-500/30 mx-1" />

      {/* 重启 */}
      <ToolbarButton
        icon={RotateCcw}
        title="重启调试 (Ctrl+Shift+F5)"
        onClick={onRestart}
        disabled={disabled || !isConnected}
      />

      {/* 停止 */}
      <ToolbarButton
        icon={Square}
        title="停止调试 (Shift+F5)"
        onClick={onStop}
        disabled={disabled || !isDebugging}
        danger
      />

      {/* 状态指示 */}
      <div className="ml-2 flex items-center gap-1.5">
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            state === 'running' && 'bg-green-500 animate-pulse',
            state === 'paused' && 'bg-yellow-500',
            state === 'connected' && 'bg-blue-500',
            state === 'initializing' && 'bg-gray-500 animate-pulse',
            state === 'stopped' && 'bg-gray-500'
          )}
        />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {state === 'running' && '运行中'}
          {state === 'paused' && '已暂停'}
          {state === 'connected' && '已连接'}
          {state === 'initializing' && '初始化'}
          {state === 'stopped' && '已停止'}
        </span>
      </div>
    </div>
  )
}

/** 工具栏按钮 */
interface ToolbarButtonProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  onClick: () => void
  disabled?: boolean
  highlight?: boolean
  danger?: boolean
}

function ToolbarButton({
  icon: Icon,
  title,
  onClick,
  disabled = false,
  highlight = false,
  danger = false,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        disabled
          ? 'text-muted-foreground/40 cursor-not-allowed'
          : highlight
          ? 'text-green-500 hover:bg-green-500/20'
          : danger
          ? 'text-red-500 hover:bg-red-500/20'
          : 'text-orange-500 hover:bg-orange-500/20'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}

// Step 图标组件（lucide-react 没有内置，自定义）
function StepOver({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
      <circle cx="5" cy="12" r="2" fill="currentColor" />
    </svg>
  )
}

function StepInto({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12l7 7 7-7" />
      <circle cx="12" cy="5" r="2" fill="currentColor" />
    </svg>
  )
}

function StepOut({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
      <circle cx="12" cy="19" r="2" fill="currentColor" />
    </svg>
  )
}

export default DebugToolbar
