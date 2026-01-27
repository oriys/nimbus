import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, AlertCircle, Info, Tag, Clock, FileCode, LayoutTemplate } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { functionService, templateService } from '../../services'
import type { Runtime, CreateFunctionRequest, Template } from '../../types'
import { RUNTIME_LABELS, CODE_TEMPLATES } from '../../types'
import { cn } from '../../utils'
import { validateCron, describeCron } from '../../utils/cron'
import TemplateSelector from '../../components/TemplateSelector'

const runtimes: Runtime[] = ['python3.11', 'nodejs20', 'go1.24', 'wasm', 'rust1.75']

const defaultHandlers: Record<Runtime, string> = {
  'python3.11': 'handler.handler',
  'nodejs20': 'index.handler',
  'go1.24': 'main.Handler',
  'wasm': 'handle',
  'rust1.75': 'main',
}

const languageMap: Record<Runtime, string> = {
  'python3.11': 'python',
  'nodejs20': 'javascript',
  'go1.24': 'go',
  'wasm': 'rust',
  'rust1.75': 'rust',
}

// 运行时按钮颜色
const runtimeButtonColors: Record<Runtime, { active: string; inactive: string }> = {
  'python3.11': { active: 'border-blue-400 bg-blue-400/10 text-blue-400', inactive: 'border-border hover:border-blue-400/50' },
  'nodejs20': { active: 'border-green-400 bg-green-400/10 text-green-400', inactive: 'border-border hover:border-green-400/50' },
  'go1.24': { active: 'border-cyan-400 bg-cyan-400/10 text-cyan-400', inactive: 'border-border hover:border-cyan-400/50' },
  'wasm': { active: 'border-purple-400 bg-purple-400/10 text-purple-400', inactive: 'border-border hover:border-purple-400/50' },
  'rust1.75': { active: 'border-orange-400 bg-orange-400/10 text-orange-400', inactive: 'border-border hover:border-orange-400/50' },
}

// 需要编译的运行时
const compilableRuntimes: Runtime[] = ['go1.24', 'wasm', 'rust1.75']

type CreateMode = 'template' | 'scratch'

export default function FunctionCreate() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<CreateMode>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [compiling, setCompiling] = useState(false)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [form, setForm] = useState<CreateFunctionRequest>({
    name: '',
    tags: [],
    runtime: 'python3.11',
    handler: defaultHandlers['python3.11'],
    code: CODE_TEMPLATES['python3.11'],
    memory_mb: 128,
    timeout_sec: 30,
    max_concurrency: 0,
    env_vars: {},
    cron_expression: '',
    http_path: '',
    http_methods: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const needsCompilation = compilableRuntimes.includes(form.runtime)

  // 处理模板选择
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template)
    // 初始化模板变量默认值
    const vars: Record<string, string> = {}
    if (template.variables) {
      template.variables.forEach((v) => {
        vars[v.name] = v.default || ''
      })
    }
    setTemplateVariables(vars)
    // 预填表单
    setForm({
      ...form,
      runtime: template.runtime,
      handler: template.handler,
      code: template.code,
      memory_mb: template.default_memory,
      timeout_sec: template.default_timeout,
    })
  }

  const handleRuntimeChange = (runtime: Runtime) => {
    setForm({
      ...form,
      runtime,
      handler: defaultHandlers[runtime],
      code: CODE_TEMPLATES[runtime],
    })
    setCompileError(null)
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) {
      newErrors.name = '请输入函数名称'
    } else if (!/^[a-z][a-z0-9-]*$/.test(form.name)) {
      newErrors.name = '函数名称只能包含小写字母、数字和连字符，且必须以字母开头'
    }
    if (!form.handler.trim()) {
      newErrors.handler = '请输入处理函数'
    }
    if (!form.code.trim()) {
      newErrors.code = '请输入函数代码'
    }
    // 验证模板变量
    if (mode === 'template' && selectedTemplate?.variables) {
      selectedTemplate.variables.forEach((v) => {
        if (v.required && !templateVariables[v.name]?.trim()) {
          newErrors[`var_${v.name}`] = `请输入 ${v.label}`
        }
      })
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      setSaving(true)
      setCompileError(null)

      // 如果是从模板创建
      if (mode === 'template' && selectedTemplate) {
        const response = await templateService.createFunction({
          template_id: selectedTemplate.id,
          function_name: form.name,
          variables: templateVariables,
          env_vars: form.env_vars,
          memory_mb: form.memory_mb,
          timeout_sec: form.timeout_sec,
        })
        navigate(`/functions/${response.function.id}`)
        return
      }

      // 从头开始创建
      let binaryToSave: string | undefined

      // 如果是需要编译的运行时，先编译
      if (needsCompilation) {
        setCompiling(true)
        try {
          const compileResult = await functionService.compile({
            runtime: form.runtime,
            code: form.code,
          })

          if (!compileResult.success) {
            setCompileError(compileResult.error || '编译失败')
            setCompiling(false)
            setSaving(false)
            return
          }

          // 保存编译后的二进制到 binary 字段
          binaryToSave = compileResult.binary
        } catch (error) {
          console.error('Compilation failed:', error)
          setCompileError('编译服务不可用，请稍后重试')
          setCompiling(false)
          setSaving(false)
          return
        }
        setCompiling(false)
      }

      const response = await functionService.create({
        ...form,
        code: form.code,  // 保留源代码
        binary: binaryToSave,  // 编译后的二进制
      })
      // 异步创建返回 function 对象和 task_id
      navigate(`/functions/${response.function.id}`)
    } catch (error) {
      console.error('Failed to create function:', error)
      alert('创建失败，请重试')
    } finally {
      setSaving(false)
      setCompiling(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/functions')}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg mr-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">创建函数</h1>
            <p className="text-muted-foreground mt-1">创建新的 Serverless 函数</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || compiling || (mode === 'template' && !selectedTemplate)}
          className="flex items-center px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {(saving || compiling) && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
          {!saving && !compiling && <Save className="w-5 h-5 mr-2" />}
          {compiling ? '编译中...' : saving ? '保存中...' : needsCompilation ? '编译并创建' : '创建函数'}
        </button>
      </div>

      {/* 模式切换 */}
      <div className="flex gap-2 p-1 bg-secondary/50 rounded-lg w-fit">
        <button
          onClick={() => setMode('template')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md transition-all',
            mode === 'template'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <LayoutTemplate className="w-4 h-4" />
          从模板创建
        </button>
        <button
          onClick={() => setMode('scratch')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md transition-all',
            mode === 'scratch'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FileCode className="w-4 h-4" />
          从头开始
        </button>
      </div>

      {/* 模板选择模式 */}
      {mode === 'template' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：模板选择 */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">选择模板</h2>
              <TemplateSelector
                onSelect={handleTemplateSelect}
                selectedTemplate={selectedTemplate}
              />
            </div>
          </div>

          {/* 右侧：函数配置 */}
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">函数配置</h2>
              <div className="space-y-4">
                {/* 函数名称 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    函数名称 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="my-function"
                    className={cn(
                      'w-full px-4 py-2 bg-input border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all',
                      errors.name ? 'border-destructive' : 'border-border'
                    )}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                {/* 选中的模板信息 */}
                {selectedTemplate && (
                  <div className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">已选模板</p>
                    <p className="font-medium text-foreground">{selectedTemplate.display_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {RUNTIME_LABELS[selectedTemplate.runtime]} · {selectedTemplate.handler}
                    </p>
                  </div>
                )}

                {/* 模板变量 */}
                {selectedTemplate?.variables && selectedTemplate.variables.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">模板变量</h3>
                    {selectedTemplate.variables.map((v) => (
                      <div key={v.name}>
                        <label className="block text-sm text-muted-foreground mb-1">
                          {v.label}
                          {v.required && <span className="text-destructive ml-1">*</span>}
                        </label>
                        <input
                          type={v.type === 'number' ? 'number' : 'text'}
                          value={templateVariables[v.name] || ''}
                          onChange={(e) =>
                            setTemplateVariables({
                              ...templateVariables,
                              [v.name]: e.target.value,
                            })
                          }
                          placeholder={v.default || v.description}
                          className={cn(
                            'w-full px-3 py-2 bg-input border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all',
                            errors[`var_${v.name}`] ? 'border-destructive' : 'border-border'
                          )}
                        />
                        {v.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{v.description}</p>
                        )}
                        {errors[`var_${v.name}`] && (
                          <p className="mt-1 text-sm text-destructive">{errors[`var_${v.name}`]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 资源配置 */}
                {selectedTemplate && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        内存 (MB)
                      </label>
                      <select
                        value={form.memory_mb}
                        onChange={(e) => setForm({ ...form, memory_mb: Number(e.target.value) })}
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      >
                        <option value={128}>128 MB</option>
                        <option value={256}>256 MB</option>
                        <option value={512}>512 MB</option>
                        <option value={1024}>1024 MB</option>
                        <option value={2048}>2048 MB</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        超时时间 (秒)
                      </label>
                      <input
                        type="number"
                        value={form.timeout_sec}
                        onChange={(e) => setForm({ ...form, timeout_sec: Number(e.target.value) })}
                        min={1}
                        max={900}
                        className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 代码预览 */}
            {selectedTemplate && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 bg-secondary/50 border-b border-border">
                  <h2 className="text-sm font-medium text-foreground">代码预览</h2>
                </div>
                <Editor
                  height="300px"
                  language={languageMap[selectedTemplate.runtime]}
                  value={selectedTemplate.code}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 2,
                    readOnly: true,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 从头开始模式 */}
      {mode === 'scratch' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：基本配置 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 基本信息 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">基本信息</h2>
              <div className="space-y-4">
                {/* 函数名称 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    函数名称 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="my-function"
                    className={cn(
                      'w-full px-4 py-2 bg-input border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all',
                      errors.name ? 'border-destructive' : 'border-border'
                    )}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                {/* 标签 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    <span className="inline-flex items-center">
                      <Tag className="w-4 h-4 mr-1" />
                      标签
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form.tags?.join(', ') || ''}
                    onChange={(e) => setForm({
                      ...form,
                      tags: e.target.value
                        .split(',')
                        .map(t => t.trim())
                        .filter(t => t.length > 0)
                    })}
                    placeholder="api, web, 核心"
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    用逗号分隔多个标签，用于分类和筛选
                  </p>
                </div>

                {/* 运行时 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    运行时 <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {runtimes.map((rt) => (
                      <button
                        key={rt}
                        onClick={() => handleRuntimeChange(rt)}
                        className={cn(
                          'px-3 py-2 text-sm rounded-lg border transition-all',
                          form.runtime === rt
                            ? runtimeButtonColors[rt].active
                            : runtimeButtonColors[rt].inactive,
                          form.runtime !== rt && 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {RUNTIME_LABELS[rt]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 处理函数 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    处理函数 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.handler}
                    onChange={(e) => setForm({ ...form, handler: e.target.value })}
                    className={cn(
                      'w-full px-4 py-2 bg-input border rounded-lg text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all',
                      errors.handler ? 'border-destructive' : 'border-border'
                    )}
                  />
                  {errors.handler && (
                    <p className="mt-1 text-sm text-destructive">{errors.handler}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 资源配置 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">资源配置</h2>
              <div className="space-y-4">
                {/* 内存 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    内存 (MB)
                  </label>
                  <select
                    value={form.memory_mb}
                    onChange={(e) => setForm({ ...form, memory_mb: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  >
                    <option value={128}>128 MB</option>
                    <option value={256}>256 MB</option>
                    <option value={512}>512 MB</option>
                    <option value={1024}>1024 MB</option>
                    <option value={2048}>2048 MB</option>
                  </select>
                </div>

                {/* 超时时间 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    超时时间 (秒)
                  </label>
                  <input
                    type="number"
                    value={form.timeout_sec}
                    onChange={(e) => setForm({ ...form, timeout_sec: Number(e.target.value) })}
                    min={1}
                    max={900}
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                </div>

                {/* 并发限制 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    最大并发数
                  </label>
                  <input
                    type="number"
                    value={form.max_concurrency || 0}
                    onChange={(e) => setForm({ ...form, max_concurrency: Number(e.target.value) })}
                    min={0}
                    max={1000}
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    限制同时执行的实例数量，0 表示不限制
                  </p>
                </div>
              </div>
            </div>

            {/* 触发器配置 */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">触发器配置</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    定时触发 (Cron 表达式)
                  </label>
                  <input
                    type="text"
                    value={form.cron_expression || ''}
                    onChange={(e) => setForm({ ...form, cron_expression: e.target.value })}
                    placeholder="*/5 * * * * *"
                    className={cn(
                      "w-full px-4 py-2 bg-input border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all font-mono text-sm",
                      form.cron_expression && !validateCron(form.cron_expression).valid
                        ? "border-destructive"
                        : "border-border"
                    )}
                  />
                  {form.cron_expression ? (
                    validateCron(form.cron_expression).valid ? (
                      <div className="mt-2 flex items-center gap-2 text-xs text-emerald-500">
                        <Clock className="w-3.5 h-3.5" />
                        {describeCron(form.cron_expression)}
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2 text-xs text-destructive">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {validateCron(form.cron_expression).error}
                      </div>
                    )
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      支持秒级 Cron (秒 分 时 日 月 周)，例如 "*/5 * * * * *" 表示每5秒触发一次。留空则不启用。
                    </p>
                  )}
                </div>

                <div className="w-full h-px bg-border my-2" />

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    HTTP 路径 (可选)
                  </label>
                  <input
                    type="text"
                    value={form.http_path || ''}
                    onChange={(e) => setForm({ ...form, http_path: e.target.value })}
                    placeholder="/api/hello"
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    HTTP 方法 (可选)
                  </label>
                  <input
                    type="text"
                    value={form.http_methods?.join(',') || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        http_methods: e.target.value
                          .split(',')
                          .filter((m) => m)
                          .map((m) => m.trim().toUpperCase()),
                      })
                    }
                    placeholder="GET,POST"
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    使用逗号分隔，例如 "GET,POST"。留空则不限制方法。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：代码编辑器 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 编译错误提示 */}
            {compileError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-destructive mb-1">编译错误</h3>
                    <pre className="text-xs text-destructive/80 whitespace-pre-wrap font-mono">{compileError}</pre>
                  </div>
                </div>
              </div>
            )}

            {/* 编译提示 */}
            {needsCompilation && !compileError && (
              <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  <p className="text-sm text-blue-400">
                    {form.runtime === 'go1.24'
                      ? '编写 Go 源代码，保存时将自动编译为 Linux 可执行文件'
                      : '编写 Rust 源代码，保存时将自动编译为 WebAssembly'}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-card rounded-xl border border-border overflow-hidden h-[600px]">
              <div className="px-4 py-3 bg-secondary/50 border-b border-border">
                <h2 className="text-sm font-medium text-foreground">函数代码</h2>
              </div>
              <Editor
                height="calc(100% - 49px)"
                language={languageMap[form.runtime]}
                value={form.code}
                onChange={(value) => setForm({ ...form, code: value || '' })}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  tabSize: 2,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
