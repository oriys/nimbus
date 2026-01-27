import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  NodeTypes,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  ArrowLeft,
  Save,
  Trash2,
  Code2,
  GitBranch,
  Clock,
  Boxes,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { workflowService } from '../../services/workflows'
import { functionService } from '../../services/functions'
import type { Workflow, WorkflowDefinition, State, StateType } from '../../types/workflow'
import type { Function } from '../../types/function'
import { STATE_TYPE_LABELS } from '../../types/workflow'
import { cn } from '../../utils/format'
import { Skeleton } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'

// Custom Node Components
import TaskNode from './nodes/TaskNode'
import ChoiceNode from './nodes/ChoiceNode'
import WaitNode from './nodes/WaitNode'
import ParallelNode from './nodes/ParallelNode'
import PassNode from './nodes/PassNode'
import FailNode from './nodes/FailNode'
import SucceedNode from './nodes/SucceedNode'

const nodeTypes: NodeTypes = {
  task: TaskNode,
  choice: ChoiceNode,
  wait: WaitNode,
  parallel: ParallelNode,
  pass: PassNode,
  fail: FailNode,
  succeed: SucceedNode,
}

interface StateEditorProps {
  state: { name: string; data: State } | null
  functions: Function[]
  onSave: (name: string, data: State) => void
  onClose: () => void
  onDelete: (name: string) => void
  stateNames: string[]
}

function StateEditor({ state, functions, onSave, onClose, onDelete, stateNames }: StateEditorProps) {
  const [name, setName] = useState(state?.name || '')
  const [data, setData] = useState<State>(state?.data || { type: 'Task' })

  useEffect(() => {
    setName(state?.name || '')
    setData(state?.data || { type: 'Task' })
  }, [state])

  if (!state) return null

  const handleSave = () => {
    if (!name.trim()) return
    onSave(name, data)
  }

  const otherStateNames = stateNames.filter(n => n !== state.name)

  return (
    <div className="w-80 bg-card border-l border-border p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">编辑状态</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">状态名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">状态类型</label>
          <select
            value={data.type}
            onChange={(e) => setData({ ...data, type: e.target.value as StateType })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {Object.entries(STATE_TYPE_LABELS).map(([type, label]) => (
              <option key={type} value={type}>{label}</option>
            ))}
          </select>
        </div>

        {data.type === 'Task' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">选择函数</label>
              <select
                value={data.function_id || ''}
                onChange={(e) => setData({ ...data, function_id: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">选择函数...</option>
                {functions.map(fn => (
                  <option key={fn.id} value={fn.id}>{fn.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">超时 (秒)</label>
              <input
                type="number"
                value={data.timeout_sec || ''}
                onChange={(e) => setData({ ...data, timeout_sec: parseInt(e.target.value) || undefined })}
                placeholder="默认 30"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </>
        )}

        {data.type === 'Wait' && (
          <div>
            <label className="block text-sm font-medium mb-1">等待秒数</label>
            <input
              type="number"
              value={data.seconds || ''}
              onChange={(e) => setData({ ...data, seconds: parseInt(e.target.value) || undefined })}
              placeholder="输入秒数"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        )}

        {data.type === 'Fail' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">错误类型</label>
              <input
                type="text"
                value={data.error || ''}
                onChange={(e) => setData({ ...data, error: e.target.value })}
                placeholder="例如: ValidationError"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">错误原因</label>
              <textarea
                value={data.cause || ''}
                onChange={(e) => setData({ ...data, cause: e.target.value })}
                placeholder="描述失败原因"
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </>
        )}

        {data.type !== 'Succeed' && data.type !== 'Fail' && (
          <div>
            <label className="block text-sm font-medium mb-1">下一状态</label>
            <div className="flex items-center gap-2">
              <select
                value={data.next || ''}
                onChange={(e) => {
                  const next = e.target.value
                  setData({ ...data, next: next || undefined, end: !next })
                }}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">结束</option>
                {otherStateNames.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 mt-2 text-sm">
              <input
                type="checkbox"
                checked={data.end || false}
                onChange={(e) => setData({ ...data, end: e.target.checked, next: e.target.checked ? undefined : data.next })}
                className="rounded"
              />
              结束状态
            </label>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">注释</label>
          <textarea
            value={data.comment || ''}
            onChange={(e) => setData({ ...data, comment: e.target.value })}
            placeholder="可选的状态说明"
            rows={2}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
          >
            保存
          </button>
          <button
            onClick={() => onDelete(state.name)}
            className="px-4 py-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WorkflowEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const isNew = !id || id === 'create'

  const [, setWorkflow] = useState<Workflow | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [timeoutSec, setTimeoutSec] = useState(3600)
  const [definition, setDefinition] = useState<WorkflowDefinition>({
    start_at: '',
    states: {},
  })
  const [functions, setFunctions] = useState<Function[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [selectedState, setSelectedState] = useState<{ name: string; data: State } | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Fetch workflow and functions
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch functions for Task nodes
        const fnResponse = await functionService.list({ limit: 100 })
        setFunctions(fnResponse.functions || [])

        // Fetch workflow if editing
        if (!isNew && id) {
          const wf = await workflowService.get(id)
          setWorkflow(wf)
          setName(wf.name)
          setDescription(wf.description || '')
          setTimeoutSec(wf.timeout_sec)
          setDefinition(wf.definition)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        toast.error('获取数据失败')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, isNew])

  // Convert definition to nodes and edges
  useEffect(() => {
    const stateNames = Object.keys(definition.states)
    if (stateNames.length === 0) return

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
      const functionName = state.function_id
        ? functions.find(f => f.id === state.function_id)?.name
        : undefined

      newNodes.push({
        id: stateName,
        type: state.type.toLowerCase(),
        position: pos,
        data: {
          label: stateName,
          state,
          functionName,
          isStart: stateName === definition.start_at,
        },
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

    setNodes(newNodes)
    setEdges(newEdges)
  }, [definition, functions])

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return

      // Update definition
      setDefinition(prev => {
        const newDef = { ...prev, states: { ...prev.states } }
        const sourceState = newDef.states[params.source!]
        if (sourceState) {
          newDef.states[params.source!] = {
            ...sourceState,
            next: params.target!,
            end: false,
          }
        }
        return newDef
      })

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#6366f1' },
          },
          eds
        )
      )
    },
    [setEdges, setDefinition]
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const state = definition.states[node.id]
    if (state) {
      setSelectedState({ name: node.id, data: state })
    }
  }, [definition])

  const handleAddState = (type: StateType) => {
    const baseName = type === 'Task' ? 'NewTask'
      : type === 'Choice' ? 'NewChoice'
      : type === 'Wait' ? 'NewWait'
      : type === 'Parallel' ? 'NewParallel'
      : type === 'Pass' ? 'NewPass'
      : type === 'Fail' ? 'NewFail'
      : 'NewSucceed'

    let name = baseName
    let i = 1
    while (definition.states[name]) {
      name = `${baseName}${i++}`
    }

    const newState: State = {
      type,
      end: type === 'Succeed' || type === 'Fail',
    }

    setDefinition(prev => ({
      ...prev,
      start_at: prev.start_at || name,
      states: {
        ...prev.states,
        [name]: newState,
      },
    }))
  }

  const handleSaveState = (oldName: string, newName: string, data: State) => {
    setDefinition(prev => {
      const newStates = { ...prev.states }

      // If renamed, update references
      if (oldName !== newName) {
        delete newStates[oldName]
        // Update references to old name
        Object.keys(newStates).forEach(key => {
          const state = newStates[key]
          if (state.next === oldName) state.next = newName
          if (state.default === oldName) state.default = newName
          if (state.choices) {
            state.choices.forEach(choice => {
              if (choice.next === oldName) choice.next = newName
            })
          }
        })
      }

      newStates[newName] = data

      return {
        ...prev,
        start_at: prev.start_at === oldName ? newName : prev.start_at,
        states: newStates,
      }
    })
    setSelectedState(null)
  }

  const handleDeleteState = (name: string) => {
    if (!confirm(`确定要删除状态 "${name}" 吗？`)) return

    setDefinition(prev => {
      const newStates = { ...prev.states }
      delete newStates[name]

      // Clean up references
      Object.keys(newStates).forEach(key => {
        const state = newStates[key]
        if (state.next === name) state.next = undefined
        if (state.default === name) state.default = undefined
        if (state.choices) {
          state.choices = state.choices.filter(choice => choice.next !== name)
        }
      })

      return {
        ...prev,
        start_at: prev.start_at === name ? Object.keys(newStates)[0] || '' : prev.start_at,
        states: newStates,
      }
    })
    setSelectedState(null)
  }

  const handleSetStartState = (stateName: string) => {
    setDefinition(prev => ({
      ...prev,
      start_at: stateName,
    }))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('请输入工作流名称')
      return
    }
    if (!definition.start_at || Object.keys(definition.states).length === 0) {
      toast.error('请添加至少一个状态')
      return
    }

    setSaving(true)
    try {
      if (isNew) {
        const created = await workflowService.create({
          name,
          description,
          definition,
          timeout_sec: timeoutSec,
        })
        toast.success('工作流已创建')
        navigate(`/workflows/${created.id}`)
      } else {
        await workflowService.update(id!, {
          description,
          definition,
          timeout_sec: timeoutSec,
        })
        toast.success('工作流已保存')
      }
    } catch (error: any) {
      console.error('Failed to save workflow:', error)
      toast.error(error.response?.data?.error || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  const stateNames = Object.keys(definition.states)

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(isNew ? '/workflows' : `/workflows/${id}`)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="工作流名称"
              disabled={!isNew}
              className={cn(
                "text-xl font-display font-bold bg-transparent border-b border-transparent focus:border-accent focus:outline-none",
                isNew && "border-border"
              )}
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加描述..."
              className="block text-sm text-muted-foreground bg-transparent border-b border-transparent focus:border-accent focus:outline-none mt-1 w-full"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4">
            <Clock className="w-4 h-4" />
            <input
              type="number"
              value={timeoutSec}
              onChange={(e) => setTimeoutSec(parseInt(e.target.value) || 3600)}
              className="w-20 px-2 py-1 bg-background border border-border rounded text-center"
            />
            <span>秒超时</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex border border-border rounded-lg overflow-hidden">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
          >
            <Controls />
            <MiniMap />
            <Background gap={16} size={1} />
            <Panel position="top-left" className="space-y-2">
              <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-1">添加状态</p>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => handleAddState('Task')}
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted rounded transition-colors"
                    title="任务 - 调用函数"
                  >
                    <Code2 className="w-5 h-5 text-blue-500" />
                    <span className="text-xs">任务</span>
                  </button>
                  <button
                    onClick={() => handleAddState('Choice')}
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted rounded transition-colors"
                    title="条件 - 分支判断"
                  >
                    <GitBranch className="w-5 h-5 text-yellow-500" />
                    <span className="text-xs">条件</span>
                  </button>
                  <button
                    onClick={() => handleAddState('Wait')}
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted rounded transition-colors"
                    title="等待 - 延时"
                  >
                    <Clock className="w-5 h-5 text-purple-500" />
                    <span className="text-xs">等待</span>
                  </button>
                  <button
                    onClick={() => handleAddState('Parallel')}
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted rounded transition-colors"
                    title="并行 - 同时执行"
                  >
                    <Boxes className="w-5 h-5 text-green-500" />
                    <span className="text-xs">并行</span>
                  </button>
                  <button
                    onClick={() => handleAddState('Pass')}
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted rounded transition-colors"
                    title="透传 - 传递数据"
                  >
                    <ArrowRight className="w-5 h-5 text-gray-500" />
                    <span className="text-xs">透传</span>
                  </button>
                  <button
                    onClick={() => handleAddState('Fail')}
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted rounded transition-colors"
                    title="失败 - 终止执行"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-xs">失败</span>
                  </button>
                  <button
                    onClick={() => handleAddState('Succeed')}
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted rounded transition-colors"
                    title="成功 - 成功结束"
                  >
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs">成功</span>
                  </button>
                </div>
              </div>
              {stateNames.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-2 px-1">起始状态</p>
                  <select
                    value={definition.start_at}
                    onChange={(e) => handleSetStartState(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {stateNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
            </Panel>
          </ReactFlow>
        </div>

        {/* State Editor Sidebar */}
        {selectedState && (
          <StateEditor
            state={selectedState}
            functions={functions}
            onSave={(newName, data) => handleSaveState(selectedState.name, newName, data)}
            onClose={() => setSelectedState(null)}
            onDelete={handleDeleteState}
            stateNames={stateNames}
          />
        )}
      </div>
    </div>
  )
}
