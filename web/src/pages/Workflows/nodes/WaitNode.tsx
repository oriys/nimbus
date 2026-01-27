import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Clock, Play } from 'lucide-react'
import { cn } from '../../../utils/format'

interface WaitNodeData {
  label: string
  state: {
    seconds?: number
    timestamp?: string
    comment?: string
  }
  isStart?: boolean
}

function WaitNode({ data, selected }: NodeProps<WaitNodeData>) {
  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg shadow-md bg-card border-2 min-w-[180px]',
        selected ? 'border-accent ring-2 ring-accent/20' : 'border-purple-500',
        data.isStart && 'ring-2 ring-green-500/50'
      )}
    >
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
          </div>
          <p className="text-xs text-muted-foreground">等待</p>
        </div>
      </div>

      {data.state.seconds && (
        <div className="mt-2 px-2 py-1 bg-muted/50 rounded text-xs">
          等待 {data.state.seconds} 秒
        </div>
      )}

      {data.state.timestamp && (
        <div className="mt-2 px-2 py-1 bg-muted/50 rounded text-xs truncate">
          直到 {data.state.timestamp}
        </div>
      )}

      {data.state.comment && (
        <p className="mt-1 text-xs text-muted-foreground truncate">
          {data.state.comment}
        </p>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
    </div>
  )
}

export default memo(WaitNode)
