import { useMemo, useCallback, memo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MarkerType,
  NodeTypes,
  NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Handle, Position } from 'reactflow'
import {
  Code2,
  Play,
  GitBranch,
  Clock,
  Boxes,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import type { WorkflowDefinition, StateExecution, StateExecutionStatus, Breakpoint } from '../../types/workflow'
import { cn } from '../../utils/format'

// Status colors for execution states
const STATUS_BORDER_COLORS: Record<StateExecutionStatus | 'not_executed', string> = {
  pending: 'border-gray-400',
  running: 'border-blue-500',
  succeeded: 'border-green-500',
  failed: 'border-red-500',
  skipped: 'border-gray-300',
  not_executed: 'border-gray-300 opacity-50',
}

const STATUS_BG_COLORS: Record<StateExecutionStatus | 'not_executed', string> = {
  pending: 'bg-gray-100 dark:bg-gray-800',
  running: 'bg-blue-50 dark:bg-blue-900/30',
  succeeded: 'bg-green-50 dark:bg-green-900/30',
  failed: 'bg-red-50 dark:bg-red-900/30',
  skipped: 'bg-gray-50 dark:bg-gray-800/50',
  not_executed: 'bg-gray-50 dark:bg-gray-800/50',
}

// Status icons - memoized
const StatusIcon = memo(function StatusIcon({ status }: { status: StateExecutionStatus | 'not_executed' }) {
  switch (status) {
    case 'succeeded':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />
    case 'running':
      return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
    case 'pending':
      return <Loader2 className="w-4 h-4 text-gray-400" />
    default:
      return null
  }
})

// Node data with execution status
interface ViewerNodeData {
  label: string
  state: {
    function_id?: string
    timeout_sec?: number
    comment?: string
    seconds?: number
    error?: string
    cause?: string
  }
  functionName?: string
  isStart?: boolean
  executionStatus?: StateExecutionStatus | 'not_executed'
  hasBreakpoint?: boolean
  onNodeClick?: (stateName: string) => void
}

// Breakpoint indicator component - memoized
const BreakpointIndicator = memo(function BreakpointIndicator({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-white" />
    </div>
  )
})

// Viewer-specific node components with execution status
const ViewerTaskNode = memo(function ViewerTaskNode({ data }: NodeProps<ViewerNodeData>) {
  const status = data.executionStatus || 'not_executed'
  const handleClick = useCallback(() => data.onNodeClick?.(data.label), [data.onNodeClick, data.label])
  return (
    <div
      onClick={handleClick}
      className={cn(
        'px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px] relative cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all',
        STATUS_BORDER_COLORS[status],
        STATUS_BG_COLORS[status],
        data.isStart && 'ring-2 ring-green-500/50'
      )}
    >
      <BreakpointIndicator active={data.hasBreakpoint || false} />
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-blue-500/10">
          <Code2 className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {data.isStart && (
              <Play className="w-3 h-3 text-green-500 fill-green-500" />
            )}
            <p className="font-semibold text-sm truncate">{data.label}</p>
            <StatusIcon status={status} />
          </div>
          <p className="text-xs text-muted-foreground">任务</p>
        </div>
      </div>
      {data.functionName && (
        <div className="mt-2 px-2 py-1 bg-muted/50 rounded text-xs truncate">
          函数: {data.functionName}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  )
})

const ViewerChoiceNode = memo(function ViewerChoiceNode({ data }: NodeProps<ViewerNodeData>) {
  const status = data.executionStatus || 'not_executed'
  const handleClick = useCallback(() => data.onNodeClick?.(data.label), [data.onNodeClick, data.label])
  return (
    <div
      onClick={handleClick}
      className={cn(
        'px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px] relative cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all',
        STATUS_BORDER_COLORS[status],
        STATUS_BG_COLORS[status],
        data.isStart && 'ring-2 ring-green-500/50'
      )}
    >
      <BreakpointIndicator active={data.hasBreakpoint || false} />
      <Handle type="target" position={Position.Top} className="!bg-yellow-500" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-yellow-500/10">
          <GitBranch className="w-4 h-4 text-yellow-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {data.isStart && (
              <Play className="w-3 h-3 text-green-500 fill-green-500" />
            )}
            <p className="font-semibold text-sm truncate">{data.label}</p>
            <StatusIcon status={status} />
          </div>
          <p className="text-xs text-muted-foreground">条件</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-yellow-500" />
    </div>
  )
})

const ViewerWaitNode = memo(function ViewerWaitNode({ data }: NodeProps<ViewerNodeData>) {
  const status = data.executionStatus || 'not_executed'
  const handleClick = useCallback(() => data.onNodeClick?.(data.label), [data.onNodeClick, data.label])
  return (
    <div
      onClick={handleClick}
      className={cn(
        'px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px] relative cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all',
        STATUS_BORDER_COLORS[status],
        STATUS_BG_COLORS[status],
        data.isStart && 'ring-2 ring-green-500/50'
      )}
    >
      <BreakpointIndicator active={data.hasBreakpoint || false} />
      <Handle type="target" position={Position.Top} className="!bg-purple-500" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-purple-500/10">
          <Clock className="w-4 h-4 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {data.isStart && (
              <Play className="w-3 h-3 text-green-500 fill-green-500" />
            )}
            <p className="font-semibold text-sm truncate">{data.label}</p>
            <StatusIcon status={status} />
          </div>
          <p className="text-xs text-muted-foreground">等待</p>
        </div>
      </div>
      {data.state.seconds && (
        <div className="mt-2 px-2 py-1 bg-muted/50 rounded text-xs">
          {data.state.seconds} 秒
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
    </div>
  )
})

const ViewerParallelNode = memo(function ViewerParallelNode({ data }: NodeProps<ViewerNodeData>) {
  const status = data.executionStatus || 'not_executed'
  const handleClick = useCallback(() => data.onNodeClick?.(data.label), [data.onNodeClick, data.label])
  return (
    <div
      onClick={handleClick}
      className={cn(
        'px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px] relative cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all',
        STATUS_BORDER_COLORS[status],
        STATUS_BG_COLORS[status],
        data.isStart && 'ring-2 ring-green-500/50'
      )}
    >
      <BreakpointIndicator active={data.hasBreakpoint || false} />
      <Handle type="target" position={Position.Top} className="!bg-green-500" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-green-500/10">
          <Boxes className="w-4 h-4 text-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {data.isStart && (
              <Play className="w-3 h-3 text-green-500 fill-green-500" />
            )}
            <p className="font-semibold text-sm truncate">{data.label}</p>
            <StatusIcon status={status} />
          </div>
          <p className="text-xs text-muted-foreground">并行</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  )
})

const ViewerPassNode = memo(function ViewerPassNode({ data }: NodeProps<ViewerNodeData>) {
  const status = data.executionStatus || 'not_executed'
  const handleClick = useCallback(() => data.onNodeClick?.(data.label), [data.onNodeClick, data.label])
  return (
    <div
      onClick={handleClick}
      className={cn(
        'px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px] relative cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all',
        STATUS_BORDER_COLORS[status],
        STATUS_BG_COLORS[status],
        data.isStart && 'ring-2 ring-green-500/50'
      )}
    >
      <BreakpointIndicator active={data.hasBreakpoint || false} />
      <Handle type="target" position={Position.Top} className="!bg-gray-500" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-gray-500/10">
          <ArrowRight className="w-4 h-4 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {data.isStart && (
              <Play className="w-3 h-3 text-green-500 fill-green-500" />
            )}
            <p className="font-semibold text-sm truncate">{data.label}</p>
            <StatusIcon status={status} />
          </div>
          <p className="text-xs text-muted-foreground">透传</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-500" />
    </div>
  )
})

const ViewerFailNode = memo(function ViewerFailNode({ data }: NodeProps<ViewerNodeData>) {
  const status = data.executionStatus || 'not_executed'
  const handleClick = useCallback(() => data.onNodeClick?.(data.label), [data.onNodeClick, data.label])
  return (
    <div
      onClick={handleClick}
      className={cn(
        'px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px] relative cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all',
        STATUS_BORDER_COLORS[status],
        STATUS_BG_COLORS[status],
        data.isStart && 'ring-2 ring-green-500/50'
      )}
    >
      <BreakpointIndicator active={data.hasBreakpoint || false} />
      <Handle type="target" position={Position.Top} className="!bg-red-500" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-red-500/10">
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {data.isStart && (
              <Play className="w-3 h-3 text-green-500 fill-green-500" />
            )}
            <p className="font-semibold text-sm truncate">{data.label}</p>
            <StatusIcon status={status} />
          </div>
          <p className="text-xs text-muted-foreground">失败</p>
        </div>
      </div>
      {data.state.error && (
        <div className="mt-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-600 dark:text-red-400 truncate">
          {data.state.error}
        </div>
      )}
    </div>
  )
})

const ViewerSucceedNode = memo(function ViewerSucceedNode({ data }: NodeProps<ViewerNodeData>) {
  const status = data.executionStatus || 'not_executed'
  const handleClick = useCallback(() => data.onNodeClick?.(data.label), [data.onNodeClick, data.label])
  return (
    <div
      onClick={handleClick}
      className={cn(
        'px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px] relative cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all',
        STATUS_BORDER_COLORS[status],
        STATUS_BG_COLORS[status],
        data.isStart && 'ring-2 ring-green-500/50'
      )}
    >
      <BreakpointIndicator active={data.hasBreakpoint || false} />
      <Handle type="target" position={Position.Top} className="!bg-emerald-500" />
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-emerald-500/10">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {data.isStart && (
              <Play className="w-3 h-3 text-green-500 fill-green-500" />
            )}
            <p className="font-semibold text-sm truncate">{data.label}</p>
            <StatusIcon status={status} />
          </div>
          <p className="text-xs text-muted-foreground">成功</p>
        </div>
      </div>
    </div>
  )
})

// Define node types outside component to prevent recreation
const viewerNodeTypes: NodeTypes = {
  task: ViewerTaskNode,
  choice: ViewerChoiceNode,
  wait: ViewerWaitNode,
  parallel: ViewerParallelNode,
  pass: ViewerPassNode,
  fail: ViewerFailNode,
  succeed: ViewerSucceedNode,
}

interface WorkflowViewerProps {
  definition: WorkflowDefinition
  history?: StateExecution[]
  breakpoints?: Breakpoint[]
  onNodeClick?: (stateName: string) => void
  className?: string
}

function WorkflowViewerInner({ definition, history = [], breakpoints = [], onNodeClick, className }: WorkflowViewerProps) {
  // Build a map of state name -> latest execution status
  const stateStatusMap = useMemo(() => {
    const map: Record<string, StateExecutionStatus> = {}
    history.forEach((exec) => {
      map[exec.state_name] = exec.status
    })
    return map
  }, [history])

  // Build a set of states with breakpoints
  const breakpointStates = useMemo(() => {
    const set = new Set<string>()
    breakpoints.forEach((bp) => {
      if (bp.enabled) {
        set.add(bp.before_state)
      }
    })
    return set
  }, [breakpoints])

  // Memoize the callback to prevent node recreation
  const stableOnNodeClick = useCallback((stateName: string) => {
    onNodeClick?.(stateName)
  }, [onNodeClick])

  // Convert definition to nodes and edges using useMemo instead of useEffect
  const { nodes, edges } = useMemo(() => {
    const stateNames = Object.keys(definition.states)
    if (stateNames.length === 0) return { nodes: [], edges: [] }

    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Calculate positions (simple grid layout)
    const statePositions: Record<string, { x: number; y: number }> = {}
    const visited = new Set<string>()

    const layoutState = (stateName: string, depth: number, offset: number) => {
      if (visited.has(stateName)) return
      visited.add(stateName)

      statePositions[stateName] = { x: 100 + depth * 300, y: 100 + offset * 150 }

      const state = definition.states[stateName]
      if (state?.next) {
        layoutState(state.next, depth + 1, offset)
      }
      if (state?.default) {
        layoutState(state.default, depth + 1, offset + 1)
      }
      if (state?.choices) {
        state.choices.forEach((choice, i) => {
          if (choice.next) {
            layoutState(choice.next, depth + 1, offset + i + 1)
          }
        })
      }
    }

    if (definition.start_at) {
      layoutState(definition.start_at, 0, 0)
    }

    // Create nodes for unvisited states
    stateNames.forEach((name, i) => {
      if (!visited.has(name)) {
        statePositions[name] = { x: 100 + Math.floor(i / 5) * 300, y: 100 + (i % 5) * 150 }
      }
    })

    // Create nodes
    stateNames.forEach((stateName) => {
      const state = definition.states[stateName]
      const pos = statePositions[stateName] || { x: 100, y: 100 }
      const executionStatus = stateStatusMap[stateName] || 'not_executed'

      newNodes.push({
        id: stateName,
        type: state.type.toLowerCase(),
        position: pos,
        data: {
          label: stateName,
          state,
          isStart: stateName === definition.start_at,
          executionStatus,
          hasBreakpoint: breakpointStates.has(stateName),
          onNodeClick: stableOnNodeClick,
        },
        draggable: false,
        selectable: false,
      })

      // Create edges
      if (state.next) {
        newEdges.push({
          id: `${stateName}-${state.next}`,
          source: stateName,
          target: state.next,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#6366f1' },
        })
      }
      if (state.default) {
        newEdges.push({
          id: `${stateName}-default-${state.default}`,
          source: stateName,
          target: state.default,
          label: 'default',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#94a3b8', strokeDasharray: '5,5' },
        })
      }
      if (state.choices) {
        state.choices.forEach((choice, i) => {
          if (choice.next) {
            newEdges.push({
              id: `${stateName}-choice-${i}-${choice.next}`,
              source: stateName,
              target: choice.next,
              label: `条件 ${i + 1}`,
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: '#f59e0b' },
            })
          }
        })
      }
    })

    return { nodes: newNodes, edges: newEdges }
  }, [definition, stateStatusMap, breakpointStates, stableOnNodeClick])

  if (Object.keys(definition.states).length === 0) {
    return (
      <div className={cn('flex items-center justify-center text-muted-foreground py-8', className)}>
        无工作流定义
      </div>
    )
  }

  return (
    <div className={cn('h-[400px]', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={viewerNodeTypes}
        fitView
        className="bg-background"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Controls showInteractive={false} />
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
  )
}

// Export memoized component
const WorkflowViewer = memo(WorkflowViewerInner)
export default WorkflowViewer
