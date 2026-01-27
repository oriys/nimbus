import { useState, useEffect } from 'react'
import { Key, Copy, Plus, Trash2, Check, RefreshCw, AlertCircle } from 'lucide-react'
import { copyToClipboard, cn } from '../../utils'
import { apiKeyService, type ApiKey } from '../../services/apikeys'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'general' | 'apikeys'>('general')
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)

  // Load API keys when tab changes to apikeys
  useEffect(() => {
    if (activeTab === 'apikeys') {
      loadApiKeys()
    }
  }, [activeTab])

  const loadApiKeys = async () => {
    try {
      setLoading(true)
      setError(null)
      const keys = await apiKeyService.list()
      setApiKeys(keys)
    } catch (err) {
      console.error('Failed to load API keys:', err)
      setError('加载 API Key 列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyKey = async (key: string, id: string) => {
    const success = await copyToClipboard(key)
    if (success) {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return
    try {
      setCreating(true)
      const result = await apiKeyService.create(newKeyName)
      // Store the newly created key to show to user
      setNewlyCreatedKey(result.api_key)
      // Refresh the list
      await loadApiKeys()
      setNewKeyName('')
    } catch (err) {
      console.error('Failed to create API key:', err)
      alert('创建 API Key 失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!confirm('确定要删除这个 API Key 吗？删除后无法恢复。')) return
    try {
      await apiKeyService.delete(id)
      setApiKeys(apiKeys.filter((k) => k.id !== id))
    } catch (err) {
      console.error('Failed to delete API key:', err)
      alert('删除 API Key 失败')
    }
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setNewKeyName('')
    setNewlyCreatedKey(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">设置</h1>
        <p className="text-muted-foreground mt-1">管理系统配置和 API 密钥</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={cn(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'general'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            基本设置
          </button>
          <button
            onClick={() => setActiveTab('apikeys')}
            className={cn(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'apikeys'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            API Keys
          </button>
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">基本设置</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                API 地址
              </label>
              <input
                type="text"
                value={window.location.origin}
                readOnly
                className="w-full max-w-md px-4 py-2 bg-secondary border border-border rounded-lg text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                默认超时时间（秒）
              </label>
              <input
                type="number"
                defaultValue={30}
                className="w-32 px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                默认内存（MB）
              </label>
              <select
                defaultValue={128}
                className="w-32 px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              >
                <option value={128}>128</option>
                <option value={256}>256</option>
                <option value={512}>512</option>
                <option value={1024}>1024</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* API Keys */}
      {activeTab === 'apikeys' && (
        <div className="space-y-6">
          {/* Error */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center text-destructive">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="text-sm">{error}</span>
              <button
                onClick={loadApiKeys}
                className="ml-auto text-sm text-destructive hover:text-destructive/80 underline transition-colors"
              >
                重试
              </button>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadApiKeys}
                  disabled={loading}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                >
                  <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  创建 Key
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 text-accent animate-spin" />
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-12 h-12 mx-auto mb-2 text-muted-foreground/30" />
                <p>暂无 API Key</p>
                <p className="text-sm mt-1">点击"创建 Key"按钮创建一个新的 API Key</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-secondary/30"
                  >
                    <div className="flex items-center">
                      <Key className="w-5 h-5 text-muted-foreground mr-3" />
                      <div>
                        <p className="font-medium text-foreground">{key.name}</p>
                        <p className="text-sm text-muted-foreground">
                          创建于 {new Date(key.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        className="p-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Key Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-card rounded-xl border border-border shadow-xl p-6 w-full max-w-md">
                {newlyCreatedKey ? (
                  <>
                    <h3 className="text-lg font-semibold text-foreground mb-4">API Key 已创建</h3>
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        请保存您的 API Key，它只会显示一次：
                      </p>
                      <div className="flex items-center bg-secondary rounded-lg p-3">
                        <code className="flex-1 text-sm font-mono text-foreground break-all">{newlyCreatedKey}</code>
                        <button
                          onClick={() => handleCopyKey(newlyCreatedKey, 'new')}
                          className="ml-2 p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg flex-shrink-0 transition-colors"
                        >
                          {copiedId === 'new' ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-orange-400 mt-2">
                        警告：关闭此对话框后将无法再次查看完整的 API Key
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleCloseCreateModal}
                        className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
                      >
                        完成
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-foreground mb-4">创建 API Key</h3>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-foreground mb-1">
                        名称
                      </label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="例如: Production"
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                        disabled={creating}
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={handleCloseCreateModal}
                        className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-secondary transition-colors"
                        disabled={creating}
                      >
                        取消
                      </button>
                      <button
                        onClick={handleCreateKey}
                        disabled={creating || !newKeyName.trim()}
                        className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
                      >
                        {creating ? '创建中...' : '创建'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
