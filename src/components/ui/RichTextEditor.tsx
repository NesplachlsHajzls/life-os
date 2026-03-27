'use client'

import { useEffect, useRef, useCallback } from 'react'

// ── Toolbar button component ───────────────────────────────────────

function ToolBtn({
  onMouseDown, title, active, children,
}: {
  onMouseDown: (e: React.MouseEvent) => void
  title: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={onMouseDown}
      className={`h-7 min-w-[28px] px-1.5 rounded-[6px] text-[13px] font-semibold transition-colors flex items-center justify-center select-none ${
        active
          ? 'bg-[var(--surface-raised)] text-white'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
      }`}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="w-px h-5 bg-[var(--border)] mx-0.5 flex-shrink-0" />
}

// ── Helpers ────────────────────────────────────────────────────────

/** Prevent losing focus when clicking toolbar button */
function noFocus(e: React.MouseEvent) {
  e.preventDefault()
}

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value)
}

function queryState(cmd: string): boolean {
  try { return document.queryCommandState(cmd) } catch { return false }
}

function queryValue(cmd: string): string {
  try { return document.queryCommandValue(cmd) } catch { return '' }
}

// ── Main component ─────────────────────────────────────────────────

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  autoFocus?: boolean
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Začni psát…',
  minHeight = 300,
  autoFocus = false,
  className = '',
}: RichTextEditorProps) {
  const editorRef  = useRef<HTMLDivElement>(null)
  const isInitialized = useRef(false)

  // Set initial content once
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      isInitialized.current = true
      editorRef.current.innerHTML = value ?? ''
      if (autoFocus) {
        editorRef.current.focus()
        // Move cursor to end
        const range = document.createRange()
        const sel   = window.getSelection()
        range.selectNodeContents(editorRef.current)
        range.collapse(false)
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external value changes (e.g. when note loads)
  const prevValue = useRef(value)
  useEffect(() => {
    if (editorRef.current && value !== prevValue.current) {
      prevValue.current = value
      // Only update DOM if different from current innerHTML to avoid cursor jump
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value ?? ''
      }
    }
  }, [value])

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      prevValue.current = html
      onChange(html)
    }
  }, [onChange])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey
    if (!mod) return
    if (e.key === 'b' || e.key === 'B') { e.preventDefault(); exec('bold') }
    if (e.key === 'i' || e.key === 'I') { e.preventDefault(); exec('italic') }
    if (e.key === 'u' || e.key === 'U') { e.preventDefault(); exec('underline') }
    // Ctrl+Shift+X = strikethrough
    if ((e.key === 'x' || e.key === 'X') && e.shiftKey) { e.preventDefault(); exec('strikeThrough') }
  }, [])

  // ── Toolbar actions ──────────────────────────────────────────────

  function tb(cmd: string, val?: string) {
    return (e: React.MouseEvent) => {
      noFocus(e)
      exec(cmd, val)
      editorRef.current?.focus()
      handleInput()
    }
  }

  function tbHeading(tag: string) {
    return (e: React.MouseEvent) => {
      noFocus(e)
      const current = queryValue('formatBlock').toLowerCase()
      exec('formatBlock', current === tag ? 'p' : tag)
      editorRef.current?.focus()
      handleInput()
    }
  }

  function insertTaskItem(e: React.MouseEvent) {
    noFocus(e)
    exec('insertHTML', `<ul class="task-list"><li class="task-item"><label contenteditable="false"><input type="checkbox" />&nbsp;</label><span>Úkol</span></li></ul>`)
    editorRef.current?.focus()
    handleInput()
  }

  // Handle checkbox clicks inside editor
  function handleEditorClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      // Allow native checkbox toggle, then fire onChange
      setTimeout(() => handleInput(), 0)
    }
  }

  const blockTag = queryValue('formatBlock').toLowerCase()

  return (
    <div className={`flex flex-col ${className}`}>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-0.5 flex-wrap py-2 px-1 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-10 rounded-t-[12px]">

        {/* Text style */}
        <ToolBtn onMouseDown={tb('bold')}          title="Tučné (Ctrl+B)"      active={queryState('bold')}         ><strong>B</strong></ToolBtn>
        <ToolBtn onMouseDown={tb('italic')}         title="Kurzíva (Ctrl+I)"   active={queryState('italic')}       ><em>I</em></ToolBtn>
        <ToolBtn onMouseDown={tb('underline')}      title="Podtržení (Ctrl+U)" active={queryState('underline')}    ><span className="underline">U</span></ToolBtn>
        <ToolBtn onMouseDown={tb('strikeThrough')}  title="Přeškrtnutí"        active={queryState('strikeThrough')}><span className="line-through">S</span></ToolBtn>

        <Sep />

        {/* Headings */}
        <ToolBtn onMouseDown={tbHeading('h1')} title="Nadpis 1" active={blockTag === 'h1'}><span className="text-[11px] font-black">H1</span></ToolBtn>
        <ToolBtn onMouseDown={tbHeading('h2')} title="Nadpis 2" active={blockTag === 'h2'}><span className="text-[11px] font-black">H2</span></ToolBtn>
        <ToolBtn onMouseDown={tbHeading('h3')} title="Nadpis 3" active={blockTag === 'h3'}><span className="text-[11px] font-black">H3</span></ToolBtn>

        <Sep />

        {/* Lists */}
        <ToolBtn onMouseDown={tb('insertUnorderedList')} title="Odrážkový seznam" active={queryState('insertUnorderedList')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="2" cy="3.5" r="0.8" fill="currentColor" stroke="none"/>
            <line x1="5" y1="3.5" x2="13" y2="3.5"/>
            <circle cx="2" cy="7" r="0.8" fill="currentColor" stroke="none"/>
            <line x1="5" y1="7" x2="13" y2="7"/>
            <circle cx="2" cy="10.5" r="0.8" fill="currentColor" stroke="none"/>
            <line x1="5" y1="10.5" x2="13" y2="10.5"/>
          </svg>
        </ToolBtn>
        <ToolBtn onMouseDown={tb('insertOrderedList')} title="Číslovaný seznam" active={queryState('insertOrderedList')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <text x="0" y="5" fontSize="5" fill="currentColor" stroke="none" fontWeight="700">1.</text>
            <line x1="5" y1="3.5" x2="13" y2="3.5"/>
            <text x="0" y="9" fontSize="5" fill="currentColor" stroke="none" fontWeight="700">2.</text>
            <line x1="5" y1="7" x2="13" y2="7"/>
            <text x="0" y="13" fontSize="5" fill="currentColor" stroke="none" fontWeight="700">3.</text>
            <line x1="5" y1="10.5" x2="13" y2="10.5"/>
          </svg>
        </ToolBtn>
        <ToolBtn onMouseDown={insertTaskItem} title="Checkbox / úkol">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="1" width="5" height="5" rx="1"/>
            <polyline points="2.2,3.5 3.2,4.5 4.8,2.5"/>
            <line x1="8" y1="3.5" x2="13" y2="3.5"/>
            <rect x="1" y="8" width="5" height="5" rx="1"/>
            <line x1="8" y1="10.5" x2="13" y2="10.5"/>
          </svg>
        </ToolBtn>

        <Sep />

        {/* Block quote */}
        <ToolBtn onMouseDown={tbHeading('blockquote')} title="Citace" active={blockTag === 'blockquote'}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M1 3h2.5l-1.5 3H3c.8 0 1.5.7 1.5 1.5v2C4.5 10.3 3.8 11 3 11H1.5C.7 11 0 10.3 0 9.5v-5C0 3.7.4 3 1 3zm7 0h2.5l-1.5 3H10c.8 0 1.5.7 1.5 1.5v2c0 .8-.7 1.5-1.5 1.5H8.5C7.7 11 7 10.3 7 9.5v-5C7 3.7 7.4 3 8 3z"/>
          </svg>
        </ToolBtn>

        {/* Horizontal rule */}
        <ToolBtn onMouseDown={(e) => { noFocus(e); exec('insertHorizontalRule'); editorRef.current?.focus(); handleInput() }} title="Oddělovač">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="7" x2="13" y2="7"/>
          </svg>
        </ToolBtn>

        <Sep />

        {/* Undo / Redo */}
        <ToolBtn onMouseDown={(e) => { noFocus(e); exec('undo'); handleInput() }} title="Zpět (Ctrl+Z)">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 5H7a4 4 0 0 1 0 8H4"/>
            <polyline points="2,2 2,5 5,5"/>
          </svg>
        </ToolBtn>
        <ToolBtn onMouseDown={(e) => { noFocus(e); exec('redo'); handleInput() }} title="Znovu (Ctrl+Y)">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5H6a4 4 0 0 0 0 8h3"/>
            <polyline points="11,2 11,5 8,5"/>
          </svg>
        </ToolBtn>
      </div>

      {/* ── Editor area ── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={handleEditorClick}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="rich-editor flex-1 outline-none px-1 py-3 text-[15px] text-[var(--text-secondary)] leading-relaxed"
      />
    </div>
  )
}
