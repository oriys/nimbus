import { useEffect, useRef, useCallback } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import type { Runtime } from '../../types'
import { registerCompletionProvider } from './completions'

// 语言映射
const languageMap: Record<Runtime, string> = {
  'python3.11': 'python',
  'nodejs20': 'javascript',
  'go1.24': 'go',
  'wasm': 'rust',
  'rust1.75': 'rust',
}

// 快捷键动作类型
export type EditorAction = 'save' | 'run' | 'format' | 'debug'

export interface CodeEditorProps {
  // 代码内容
  value: string
  // 运行时（决定语言高亮和补全）
  runtime: Runtime
  // 代码变化回调
  onChange?: (value: string) => void
  // 快捷键回调
  onAction?: (action: EditorAction) => void
  // 编辑器高度
  height?: string | number
  // 是否只读
  readOnly?: boolean
  // 是否显示 minimap
  minimap?: boolean
  // 字体大小
  fontSize?: number
  // 主题
  theme?: 'vs-dark' | 'light'
  // 是否启用自动补全
  enableCompletion?: boolean
  // 问题标记
  markers?: Monaco.editor.IMarkerData[]
}

export default function CodeEditor({
  value,
  runtime,
  onChange,
  onAction,
  height = '100%',
  readOnly = false,
  minimap = false,
  fontSize = 14,
  theme = 'vs-dark',
  enableCompletion = true,
  markers = [],
}: CodeEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const completionDisposableRef = useRef<Monaco.IDisposable | null>(null)

  // 处理编辑器挂载
  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor
      monacoRef.current = monaco

      // 注册自动补全
      if (enableCompletion) {
        completionDisposableRef.current = registerCompletionProvider(monaco, runtime)
      }

      // 注册快捷键
      if (onAction) {
        // Ctrl+S: 保存
        editor.addAction({
          id: 'nimbus-save',
          label: '保存',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
          run: () => {
            onAction('save')
          },
        })

        // Ctrl+Enter: 运行
        editor.addAction({
          id: 'nimbus-run',
          label: '运行',
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
          run: () => {
            onAction('run')
          },
        })

        // F5: 调试
        editor.addAction({
          id: 'nimbus-debug',
          label: '调试',
          keybindings: [monaco.KeyCode.F5],
          run: () => {
            onAction('debug')
          },
        })

        // Shift+Alt+F: 格式化
        editor.addAction({
          id: 'nimbus-format',
          label: '格式化',
          keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
          run: () => {
            onAction('format')
          },
        })
      }

      // 设置编辑器焦点
      editor.focus()
    },
    [runtime, enableCompletion, onAction]
  )

  // 处理代码变化
  const handleChange: OnChange = useCallback(
    (value) => {
      if (onChange && value !== undefined) {
        onChange(value)
      }
    },
    [onChange]
  )

  // 当运行时变化时，重新注册补全提供者
  useEffect(() => {
    if (monacoRef.current && enableCompletion) {
      // 清理旧的补全提供者
      if (completionDisposableRef.current) {
        completionDisposableRef.current.dispose()
      }
      // 注册新的补全提供者
      completionDisposableRef.current = registerCompletionProvider(monacoRef.current, runtime)
    }

    return () => {
      if (completionDisposableRef.current) {
        completionDisposableRef.current.dispose()
      }
    }
  }, [runtime, enableCompletion])

  // 更新问题标记
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel()
      if (model) {
        monacoRef.current.editor.setModelMarkers(model, 'nimbus', markers)
      }
    }
  }, [markers])

  return (
    <Editor
      height={height}
      language={languageMap[runtime]}
      value={value}
      onChange={handleChange}
      onMount={handleEditorMount}
      theme={theme}
      options={{
        minimap: { enabled: minimap },
        fontSize,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        readOnly,
        automaticLayout: true,
        formatOnPaste: true,
        formatOnType: true,
        suggestOnTriggerCharacters: enableCompletion,
        quickSuggestions: enableCompletion
          ? {
              other: true,
              comments: false,
              strings: false,
            }
          : false,
        parameterHints: {
          enabled: enableCompletion,
        },
        folding: true,
        foldingHighlight: true,
        showFoldingControls: 'mouseover',
        bracketPairColorization: {
          enabled: true,
        },
        guides: {
          bracketPairs: true,
          indentation: true,
        },
        // 光标设置
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        // 滚动设置
        smoothScrolling: true,
        // 渲染设置
        renderLineHighlight: 'all',
        renderWhitespace: 'selection',
      }}
    />
  )
}

// 导出补全相关
export * from './completions'
