import { Link } from 'react-router-dom'
import {
  Code2,
  PlayCircle,
  ScrollText,
  BarChart3,
  Plus,
  Sparkles,
  FileCode,
  Zap
} from 'lucide-react'

interface EmptyStateProps {
  type: 'functions' | 'invocations' | 'logs' | 'metrics' | 'general'
  title?: string
  description?: string
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
}

const configs = {
  functions: {
    icon: Code2,
    title: '还没有函数',
    description: '创建您的第一个 Serverless 函数，开始构建无服务器应用',
    actionLabel: '创建函数',
    actionTo: '/functions/create',
    illustration: FunctionsIllustration,
  },
  invocations: {
    icon: PlayCircle,
    title: '暂无调用记录',
    description: '函数被调用后，调用记录将在这里显示',
    actionLabel: '查看函数',
    actionTo: '/functions',
    illustration: InvocationsIllustration,
  },
  logs: {
    icon: ScrollText,
    title: '暂无日志',
    description: '函数执行日志将在这里实时显示',
    actionLabel: '查看函数',
    actionTo: '/functions',
    illustration: LogsIllustration,
  },
  metrics: {
    icon: BarChart3,
    title: '暂无监控数据',
    description: '函数运行后，性能指标将在这里展示',
    actionLabel: '查看函数',
    actionTo: '/functions',
    illustration: MetricsIllustration,
  },
  general: {
    icon: Sparkles,
    title: '暂无数据',
    description: '这里还没有任何内容',
    actionLabel: undefined,
    actionTo: undefined,
    illustration: GeneralIllustration,
  },
}

// 函数空状态插图
function FunctionsIllustration() {
  return (
    <div className="relative w-48 h-48 mx-auto mb-6">
      {/* 背景光晕 */}
      <div className="absolute inset-0 bg-accent/10 rounded-full blur-3xl animate-pulse" />

      {/* 主图标容器 */}
      <div className="relative flex items-center justify-center h-full">
        {/* 轨道环 */}
        <div className="absolute w-40 h-40 border border-dashed border-accent/20 rounded-full animate-spin" style={{ animationDuration: '20s' }} />
        <div className="absolute w-32 h-32 border border-accent/10 rounded-full" />

        {/* 浮动元素 */}
        <div className="absolute top-4 right-8 w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center animate-float" style={{ animationDelay: '0s' }}>
          <FileCode className="w-4 h-4 text-violet-400" />
        </div>
        <div className="absolute bottom-8 left-4 w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center animate-float" style={{ animationDelay: '0.5s' }}>
          <Zap className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="absolute top-12 left-8 w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '1s' }}>
          <Sparkles className="w-3 h-3 text-amber-400" />
        </div>

        {/* 中心图标 */}
        <div className="relative w-20 h-20 bg-gradient-to-br from-accent/20 to-accent/5 rounded-2xl flex items-center justify-center border border-accent/20 shadow-lg shadow-accent/10">
          <Code2 className="w-10 h-10 text-accent" />
        </div>
      </div>
    </div>
  )
}

// 调用空状态插图
function InvocationsIllustration() {
  return (
    <div className="relative w-48 h-48 mx-auto mb-6">
      <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />

      <div className="relative flex items-center justify-center h-full">
        {/* 波纹效果 */}
        <div className="absolute w-36 h-36 border border-emerald-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute w-28 h-28 border border-emerald-500/10 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />

        {/* 中心图标 */}
        <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl flex items-center justify-center border border-emerald-500/20">
          <PlayCircle className="w-10 h-10 text-emerald-400" />
        </div>
      </div>
    </div>
  )
}

// 日志空状态插图
function LogsIllustration() {
  return (
    <div className="relative w-48 h-48 mx-auto mb-6">
      <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />

      <div className="relative flex items-center justify-center h-full">
        {/* 日志行模拟 */}
        <div className="absolute w-40 space-y-2">
          <div className="h-2 bg-blue-500/20 rounded animate-pulse w-full" />
          <div className="h-2 bg-blue-500/15 rounded animate-pulse w-3/4" style={{ animationDelay: '0.2s' }} />
          <div className="h-2 bg-blue-500/10 rounded animate-pulse w-5/6" style={{ animationDelay: '0.4s' }} />
          <div className="h-2 bg-blue-500/5 rounded animate-pulse w-2/3" style={{ animationDelay: '0.6s' }} />
        </div>

        {/* 中心图标 */}
        <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl flex items-center justify-center border border-blue-500/20">
          <ScrollText className="w-10 h-10 text-blue-400" />
        </div>
      </div>
    </div>
  )
}

// 监控空状态插图
function MetricsIllustration() {
  return (
    <div className="relative w-48 h-48 mx-auto mb-6">
      <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />

      <div className="relative flex items-center justify-center h-full">
        {/* 图表模拟 */}
        <div className="absolute bottom-12 flex items-end gap-1.5 h-20">
          <div className="w-3 bg-amber-500/30 rounded-t animate-pulse" style={{ height: '40%' }} />
          <div className="w-3 bg-amber-500/40 rounded-t animate-pulse" style={{ height: '70%', animationDelay: '0.1s' }} />
          <div className="w-3 bg-amber-500/30 rounded-t animate-pulse" style={{ height: '50%', animationDelay: '0.2s' }} />
          <div className="w-3 bg-amber-500/50 rounded-t animate-pulse" style={{ height: '90%', animationDelay: '0.3s' }} />
          <div className="w-3 bg-amber-500/40 rounded-t animate-pulse" style={{ height: '60%', animationDelay: '0.4s' }} />
        </div>

        {/* 中心图标 */}
        <div className="relative w-20 h-20 bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-2xl flex items-center justify-center border border-amber-500/20">
          <BarChart3 className="w-10 h-10 text-amber-400" />
        </div>
      </div>
    </div>
  )
}

// 通用空状态插图
function GeneralIllustration() {
  return (
    <div className="relative w-48 h-48 mx-auto mb-6">
      <div className="absolute inset-0 bg-accent/10 rounded-full blur-3xl animate-pulse" />

      <div className="relative flex items-center justify-center h-full">
        <div className="relative w-20 h-20 bg-gradient-to-br from-accent/20 to-accent/5 rounded-2xl flex items-center justify-center border border-accent/20">
          <Sparkles className="w-10 h-10 text-accent" />
        </div>
      </div>
    </div>
  )
}

export default function EmptyState({
  type,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}: EmptyStateProps) {
  const config = configs[type]
  const Illustration = config.illustration

  const finalTitle = title || config.title
  const finalDescription = description || config.description
  const finalActionLabel = actionLabel || config.actionLabel
  const finalActionTo = actionTo || config.actionTo

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
      <Illustration />

      <h3 className="text-lg font-display font-semibold text-foreground mb-2">
        {finalTitle}
      </h3>

      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
        {finalDescription}
      </p>

      {(finalActionTo || onAction) && finalActionLabel && (
        onAction ? (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-all btn-glow font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            {finalActionLabel}
          </button>
        ) : (
          <Link
            to={finalActionTo!}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-all btn-glow font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            {finalActionLabel}
          </Link>
        )
      )}
    </div>
  )
}
