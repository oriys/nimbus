import { useState, useEffect } from 'react'
import { RefreshCw, Trash2, Search, Database, Clock, X, ChevronDown, ChevronRight } from 'lucide-react'
import { sessionService, type Session, type StateKeyInfo } from '../../services/sessions'
import { formatDate, cn, formatBytes } from '../../utils'

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [functionId, setFunctionId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [sessionState, setSessionState] = useState<{ [key: string]: StateKeyInfo[] }>({})
  const [loadingState, setLoadingState] = useState<string | null>(null)

  const loadSessions = async () => {
    if (!functionId) return
    try {
      setLoading(true)
      const result = await sessionService.list(functionId, 50)
      setSessions(result.sessions || [])
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setFunctionId(searchInput)
  }

  useEffect(() => {
    if (functionId) {
      loadSessions()
    }
  }, [functionId])

  const handleDelete = async (sessionKey: string) => {
    if (!confirm(`确定要删除会话 "${sessionKey}" 吗？会话状态也将被清除。`)) return
    try {
      await sessionService.delete(functionId, sessionKey)
      await loadSessions()
    } catch (error) {
      console.error('Failed to delete session:', error)
      alert('删除失败')
    }
  }

  const toggleExpand = async (sessionKey: string) => {
    if (expandedSession === sessionKey) {
      setExpandedSession(null)
      return
    }

    setExpandedSession(sessionKey)

    // 加载状态详情
    if (!sessionState[sessionKey]) {
      try {
        setLoadingState(sessionKey)
        const state = await sessionService.getState(functionId, sessionKey)
        setSessionState(prev => ({ ...prev, [sessionKey]: state.keys }))
      } catch (error) {
        console.error('Failed to load session state:', error)
      } finally {
        setLoadingState(null)
      }
    }
  }

  const handleDeleteKey = async (sessionKey: string, key: string) => {
    if (!confirm(`确定要删除状态键 "${key}" 吗？`)) return
    try {
      await sessionService.deleteStateKey(functionId, sessionKey, key)
      // 重新加载状态
      const state = await sessionService.getState(functionId, sessionKey)
      setSessionState(prev => ({ ...prev, [sessionKey]: state.keys }))
    } catch (error) {
      console.error('Failed to delete state key:', error)
      alert('删除失败')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">会话管理</h1>
          <p className="text-muted-foreground mt-1">查看和管理有状态函数的会话及状态数据</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入函数 ID 查询会话..."
              className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchInput || loading}
            className="flex items-center px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <Search className="w-4 h-4 mr-2" />
            查询
          </button>
          {functionId && (
            <button
              onClick={loadSessions}
              disabled={loading}
              className="flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
              刷新
            </button>
          )}
        </div>
        {functionId && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="w-4 h-4" />
            当前函数: <span className="text-foreground font-mono">{functionId}</span>
            <button
              onClick={() => {
                setFunctionId('')
                setSessions([])
                setSearchInput('')
              }}
              className="ml-2 p-1 hover:bg-secondary rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Sessions List */}
      {functionId && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              该函数暂无活跃会话
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sessions.map((session) => (
                <div key={session.session_key} className="hover:bg-secondary/30 transition-colors">
                  {/* Session Row */}
                  <div
                    className="px-6 py-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => toggleExpand(session.session_key)}
                  >
                    <div className="flex-shrink-0">
                      {expandedSession === session.session_key ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-foreground truncate">
                          {session.session_key}
                        </span>
                        {session.state_keys && session.state_keys.length > 0 && (
                          <span className="px-2 py-0.5 text-xs rounded bg-accent/20 text-accent">
                            {session.state_keys.length} keys
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          创建: {formatDate(session.created_at)}
                        </span>
                        {session.last_used_at && (
                          <span>最后使用: {formatDate(session.last_used_at)}</span>
                        )}
                        <span>调用次数: {session.invocation_count}</span>
                        {session.total_size !== undefined && session.total_size > 0 && (
                          <span>状态大小: {formatBytes(session.total_size)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(session.session_key)
                        }}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                        title="删除会话"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded State Details */}
                  {expandedSession === session.session_key && (
                    <div className="px-6 pb-4 ml-9">
                      <div className="bg-secondary/50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-foreground mb-3">状态键列表</h4>
                        {loadingState === session.session_key ? (
                          <div className="flex items-center justify-center py-4">
                            <RefreshCw className="w-5 h-5 text-accent animate-spin" />
                          </div>
                        ) : !sessionState[session.session_key] || sessionState[session.session_key].length === 0 ? (
                          <p className="text-sm text-muted-foreground">暂无状态数据</p>
                        ) : (
                          <div className="space-y-2">
                            {sessionState[session.session_key].map((keyInfo) => (
                              <div
                                key={keyInfo.key}
                                className="flex items-center justify-between p-2 bg-background rounded border border-border"
                              >
                                <div className="flex-1 min-w-0">
                                  <span className="font-mono text-sm text-foreground">
                                    {keyInfo.key}
                                  </span>
                                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                    <span>大小: {formatBytes(keyInfo.size)}</span>
                                    <span>TTL: {keyInfo.ttl === -1 ? '永不过期' : `${keyInfo.ttl}秒`}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteKey(session.session_key, keyInfo.key)}
                                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded transition-colors"
                                  title="删除键"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Help */}
      {!functionId && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">使用说明</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>会话管理功能允许您查看和管理有状态函数的会话数据：</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>输入函数 ID 查询该函数的所有活跃会话</li>
              <li>展开会话查看详细的状态键列表</li>
              <li>可以删除单个状态键或整个会话</li>
              <li>会话状态数据存储在 Redis 中，支持 TTL 自动过期</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
