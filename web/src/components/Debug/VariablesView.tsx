/**
 * 变量查看器组件
 * 显示当前作用域的变量及其值
 */

import { useState, useCallback } from 'react'
import { ChevronRight, ChevronDown, RefreshCw } from 'lucide-react'
import type { Variable, Scope } from '../../types/debug'
import { cn } from '../../utils'

interface VariablesViewProps {
  scopes: Scope[]
  onExpandVariable: (variablesReference: number) => Promise<Variable[]>
  onRefresh?: () => void
  loading?: boolean
  className?: string
}

export function VariablesView({
  scopes,
  onExpandVariable,
  onRefresh,
  loading = false,
  className,
}: VariablesViewProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          变量
        </span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            title="刷新"
          >
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
          </button>
        )}
      </div>

      {/* 变量列表 */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {scopes.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground text-center italic">
            暂无变量
          </div>
        ) : (
          scopes.map((scope) => (
            <ScopeSection
              key={scope.name}
              scope={scope}
              onExpandVariable={onExpandVariable}
            />
          ))
        )}
      </div>
    </div>
  )
}

/** 作用域区块 */
interface ScopeSectionProps {
  scope: Scope
  onExpandVariable: (variablesReference: number) => Promise<Variable[]>
}

function ScopeSection({ scope, onExpandVariable }: ScopeSectionProps) {
  const [expanded, setExpanded] = useState(true)
  const [variables, setVariables] = useState<Variable[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadVariables = useCallback(async () => {
    if (loaded || loading || scope.variablesReference === 0) return

    setLoading(true)
    try {
      const vars = await onExpandVariable(scope.variablesReference)
      setVariables(vars)
      setLoaded(true)
    } catch (e) {
      console.error('Failed to load variables:', e)
    } finally {
      setLoading(false)
    }
  }, [scope.variablesReference, loaded, loading, onExpandVariable])

  const toggleExpand = () => {
    const newExpanded = !expanded
    setExpanded(newExpanded)
    if (newExpanded && !loaded) {
      loadVariables()
    }
  }

  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* 作用域标题 */}
      <button
        onClick={toggleExpand}
        className="w-full flex items-center gap-1 px-2 py-1.5 hover:bg-secondary/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        )}
        <span className="text-[11px] font-medium">{scope.name}</span>
        {loading && <RefreshCw className="w-3 h-3 ml-auto animate-spin text-muted-foreground" />}
      </button>

      {/* 变量列表 */}
      {expanded && (
        <div className="pl-4">
          {variables.map((variable) => (
            <VariableItem
              key={variable.name}
              variable={variable}
              onExpandVariable={onExpandVariable}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** 变量项 */
interface VariableItemProps {
  variable: Variable
  onExpandVariable: (variablesReference: number) => Promise<Variable[]>
  depth: number
}

function VariableItem({ variable, onExpandVariable, depth }: VariableItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<Variable[]>([])
  const [loading, setLoading] = useState(false)

  const hasChildren = variable.variablesReference > 0
  const indentStyle = { paddingLeft: `${depth * 12 + 4}px` }

  const toggleExpand = async () => {
    if (!hasChildren) return

    if (!expanded && children.length === 0) {
      setLoading(true)
      try {
        const vars = await onExpandVariable(variable.variablesReference)
        setChildren(vars)
      } catch (e) {
        console.error('Failed to load child variables:', e)
      } finally {
        setLoading(false)
      }
    }

    setExpanded(!expanded)
  }

  return (
    <div>
      <div
        style={indentStyle}
        className={cn(
          'flex items-center gap-1 py-0.5 hover:bg-secondary/30 transition-colors',
          hasChildren && 'cursor-pointer'
        )}
        onClick={toggleExpand}
      >
        {/* 展开图标 */}
        <span className="w-3 h-3 flex items-center justify-center">
          {hasChildren ? (
            loading ? (
              <RefreshCw className="w-2.5 h-2.5 animate-spin text-muted-foreground" />
            ) : expanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )
          ) : null}
        </span>

        {/* 变量名 */}
        <span className="text-[11px] text-blue-400 font-mono">{variable.name}</span>

        {/* 类型 */}
        {variable.type && (
          <span className="text-[10px] text-muted-foreground">({variable.type})</span>
        )}

        {/* 等号 */}
        <span className="text-muted-foreground">=</span>

        {/* 值 */}
        <span className={cn(
          'text-[11px] font-mono truncate flex-1',
          getValueColor(variable.type, variable.value)
        )}>
          {formatValue(variable.value, variable.type)}
        </span>
      </div>

      {/* 子变量 */}
      {expanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <VariableItem
              key={child.name}
              variable={child}
              onExpandVariable={onExpandVariable}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** 获取值的颜色 */
function getValueColor(type?: string, value?: string): string {
  if (!value) return 'text-muted-foreground'

  // 根据类型或值判断颜色
  if (type === 'str' || type === 'string' || value.startsWith("'") || value.startsWith('"')) {
    return 'text-green-400'
  }
  if (type === 'int' || type === 'float' || type === 'number' || /^-?\d+(\.\d+)?$/.test(value)) {
    return 'text-yellow-400'
  }
  if (value === 'True' || value === 'False' || value === 'true' || value === 'false') {
    return 'text-orange-400'
  }
  if (value === 'None' || value === 'null' || value === 'undefined') {
    return 'text-red-400'
  }

  return 'text-foreground'
}

/** 格式化值显示 */
function formatValue(value: string, _type?: string): string {
  // 截断过长的值
  if (value.length > 100) {
    return value.slice(0, 100) + '...'
  }
  return value
}

export default VariablesView
