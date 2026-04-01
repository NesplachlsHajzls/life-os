'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────

export interface PageSuggestion {
  id: string
  title: string
  icon: string
}

interface SlashState {
  active: boolean
  query: string
  rect: DOMRect | null
  selectedIdx: number
}

const SLASH_CLOSED: SlashState = { active: false, query: '', rect: null, selectedIdx: 0 }

// ── Toolbar helpers ───────────────────────────────────────────────

function ToolBtn({ onMouseDown, title, active, children }: {
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

function noFocus(e: React.MouseEvent) { e.preventDefault() }
function exec(cmd: string, value?: string) { document.execCommand(cmd, false, value) }
function queryState(cmd: string): boolean { try { return document.queryCommandState(cmd) } catch { return false } }
function queryValue(cmd: string): string  { try { return document.queryCommandValue(cmd)  } catch { return '' } }

// ── Slash popup ───────────────────────────────────────────────────

function SlashPopup({ query, rect, suggestions, selectedIdx, onSelect, onCreateNew }: {
  query: string
  rect: DOMRect
  suggestions: PageSuggestion[]
  selectedIdx: number
  onSelect: (s: PageSuggestion) => void
  onCreateNew: (title: string) => void
}) {
  const filtered = suggestions.filter(s =>
    !query || s.title.toLowerCase().includes(query.toLowerCase())
  )

  // Position: below cursor, flip up if no space
  const popupHeight = 48 + (filtered.length > 0 ? 26 + Math.min(filtered.length, 5) * 40 : 0)
  const spaceBelow  = window.innerHeight - rect.bottom - 8
  const useAbove    = spaceBelow < popupHeight && rect.top > popupHeight
  const top         = useAbove ? rect.top - popupHeight - 4 : rect.bottom + 4
  const left        = Math.max(8, Math.min(rect.left, window.innerWidth - 290))

  return (
    <div
      style={{ position: 'fixed', top, left, zIndex: 9999, width: 280 }}

      style={{
        position: 'fixed', top, left, zIndex: 9999, width: 280,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      }}
      onMouseDown={e => e.preventDefault()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-[15px]">📄</span>
        <span className="text-[12px] font-bold" style={{ color: 'var(--text-tertiary)' }}>
          Vložit stránku
        </span>
      </div>

      {/* Create new */}
      <button
        onMouseDown={e => { e.preventDefault(); onCreateNew(query.trim() || 'Nová stránka') }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-semibold text-left transition-colors"
        style={{
          background: selectedIdx === 0 ? 'var(--color-primary-light)' : 'transparent',
          color: 'var(--color-primary)',
        }}
      >
        <span className="text-[16px] w-5 text-center flex-shrink-0">+</span>
        <span className="truncate">
          {query.trim() ? `Vytvořit „${query.trim()}"` : 'Nová stránka'}
        </span>
      </button>

      {/* Existing pages */}
      {filtered.length > 0 && (
        <>
          <div className="px-3 py-1.5" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              Podstránky
            </span>
          </div>
          {filtered.slice(0, 5).map((s, i) => (
            <button
              key={s.id}
              onMouseDown={e => { e.preventDefault(); onSelect(s) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-left transition-colors"
              style={{
                background: selectedIdx === i + 1 ? 'var(--surface-raised)' : 'transparent',
                color: selectedIdx === i + 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              <span className="text-[16px] w-5 text-center flex-shrink-0">{s.icon}</span>
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  autoFocus?: boolean
  className?: string
  // Slash /page command support
  pageSuggestions?: PageSuggestion[]
  onCreatePage?: (title: string) => Promise<PageSuggestion>
}

export function RichTextEditor({
  value, onChange,
  placeholder = 'Začni psát…',
  minHeight = 300,
  autoFocus = false,
  className = '',
  pageSuggestions = [],
  onCreatePage,
}: RichTextEditorProps) {
  const editorRef     = useRef<HTMLDivElement>(null)
  const isInitialized = useRef(false)
  const prevValue     = useRef(value)

  // Slash command state
  const [slash, setSlash] = useState<SlashState>(SLASH_CLOSED)
  const slashNodeRef   = useRef<Text | null>(null)
  const slashOffsetRef = useRef<number>(0)

  // ── Init / sync ───────────────────────────────────────────────
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      isInitialized.current = true
      editorRef.current.innerHTML = value ?? ''
      if (autoFocus) {
        editorRef.current.focus()
        const range = document.createRange()
        const sel   = window.getSelection()
        range.selectNodeContents(editorRef.current)
        range.collapse(false)
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (editorRef.current && value !== prevValue.current) {
      prevValue.current = value
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value ?? ''
      }
    }
  }, [value])

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    prevValue.current = html
    onChange(html)
  }, [onChange])

  // ── Slash: detect after each input ────────────────────────────
  const checkSlash = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) { setSlash(SLASH_CLOSED); return }

    const range = sel.getRangeAt(0)
    if (!range.collapsed) { setSlash(SLASH_CLOSED); return }

    const node = range.startContainer
    if (node.nodeType !== Node.TEXT_NODE) { setSlash(SLASH_CLOSED); return }
    if (!editorRef.current?.contains(node)) { setSlash(SLASH_CLOSED); return }

    const text   = node.textContent ?? ''
    const offset = range.startOffset
    const before = text.slice(0, offset)

    // Find last '/' that looks like a command trigger
    // Must be at start of text OR preceded by whitespace
    const match = before.match(/(^|[\s\n])\/([^\s]*)$/)
    if (!match) { setSlash(SLASH_CLOSED); slashNodeRef.current = null; return }

    const query = match[2]  // everything after the '/'

    // Only trigger for 'page' (or substrings), or empty (just typed '/')
    const PAGE_TRIGGERS = ['', 'p', 'pa', 'pag', 'page', 's', 'st', 'str', 'stran', 'stranka', 'stranku']
    if (!PAGE_TRIGGERS.includes(query.toLowerCase())) {
      setSlash(SLASH_CLOSED)
      slashNodeRef.current = null
      return
    }

    // Get cursor rect for popup position
    const cursorRange = range.cloneRange()
    const rect = cursorRange.getBoundingClientRect()
    if (!rect.width && !rect.height) { setSlash(SLASH_CLOSED); return }

    // Save slash anchor
    slashNodeRef.current  = node as Text
    slashOffsetRef.current = offset - query.length - 1  // position of '/'

    setSlash({ active: true, query, rect, selectedIdx: 0 })
  }, [])

  // ── Insert a page link chip ───────────────────────────────────
  const insertPageLink = useCallback((page: PageSuggestion) => {
    const editor = editorRef.current
    const startNode   = slashNodeRef.current
    if (!editor || !startNode) return

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return

    // Range from '/' to current cursor
    const currentRange = sel.getRangeAt(0)
    const deleteRange  = document.createRange()
    deleteRange.setStart(startNode, slashOffsetRef.current)
    deleteRange.setEnd(currentRange.startContainer, currentRange.startOffset)
    deleteRange.deleteContents()

    // Build chip element
    const chip = document.createElement('a')
    chip.href          = `/poznamky/${page.id}`
    chip.className     = 'page-link-chip'
    chip.dataset.noteId = page.id
    chip.contentEditable = 'false'
    chip.innerHTML     = `${page.icon} ${page.title}`

    // Insert chip + trailing space
    const space = document.createTextNode('\u00A0')
    deleteRange.insertNode(space)
    deleteRange.insertNode(chip)

    // Move cursor after space
    const after = document.createRange()
    after.setStartAfter(space)
    after.collapse(true)
    sel.removeAllRanges()
    sel.addRange(after)

    setSlash(SLASH_CLOSED)
    slashNodeRef.current = null
    handleInput()
  }, [handleInput])

  // ── Create new page then insert link ─────────────────────────
  const handleCreatePage = useCallback(async (title: string) => {
    if (!onCreatePage) return
    setSlash(s => ({ ...s, active: false }))  // hide popup immediately
    try {
      const page = await onCreatePage(title)
      insertPageLink(page)
    } catch (e) {
      console.error('Failed to create page', e)
    }
  }, [onCreatePage, insertPageLink])

  // ── Keyboard: shortcuts + slash navigation ────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey

    // Slash popup navigation
    if (slash.active) {
      const totalItems = 1 + Math.min(
        pageSuggestions.filter(s =>
          !slash.query || s.title.toLowerCase().includes(slash.query.toLowerCase())
        ).length, 5
      )

      if (e.key === 'Escape') { e.preventDefault(); setSlash(SLASH_CLOSED); slashNodeRef.current = null; return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlash(s => ({ ...s, selectedIdx: (s.selectedIdx + 1) % totalItems }))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlash(s => ({ ...s, selectedIdx: (s.selectedIdx - 1 + totalItems) % totalItems }))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const filtered = pageSuggestions.filter(s =>
          !slash.query || s.title.toLowerCase().includes(slash.query.toLowerCase())
        ).slice(0, 5)
        if (slash.selectedIdx === 0) {
          handleCreatePage(slash.query.trim() || 'Nová stránka')
        } else {
          const page = filtered[slash.selectedIdx - 1]
          if (page) insertPageLink(page)
        }
        return
      }
      if (e.key === 'Backspace' && slash.query === '') {
        setSlash(SLASH_CLOSED)
        slashNodeRef.current = null
      }
    }

    // Standard formatting shortcuts
    if (!mod) return
    if (e.key === 'b' || e.key === 'B') { e.preventDefault(); exec('bold') }
    if (e.key === 'i' || e.key === 'I') { e.preventDefault(); exec('italic') }
    if (e.key === 'u' || e.key === 'U') { e.preventDefault(); exec('underline') }
    if ((e.key === 'x' || e.key === 'X') && e.shiftKey) { e.preventDefault(); exec('strikeThrough') }
  }, [slash, pageSuggestions, insertPageLink, handleCreatePage])

  const handleEditorInput = useCallback(() => {
    handleInput()
    // Defer slash check so DOM has updated
    requestAnimationFrame(checkSlash)
  }, [handleInput, checkSlash])

  // ── Click on page-link-chip → navigate ───────────────────────
  function handleEditorClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      setTimeout(handleInput, 0)
      return
    }
    // Chips are contenteditable=false, so clicks won't land in the editor's text
  }

  // ── Toolbar helpers ───────────────────────────────────────────
  function tb(cmd: string, val?: string) {
    return (e: React.MouseEvent) => {
      noFocus(e); exec(cmd, val); editorRef.current?.focus(); handleInput()
    }
  }
  function tbHeading(tag: string) {
    return (e: React.MouseEvent) => {
      noFocus(e)
      const current = queryValue('formatBlock').toLowerCase()
      exec('formatBlock', current === tag ? 'p' : tag)
      editorRef.current?.focus(); handleInput()
    }
  }
  function insertTaskItem(e: React.MouseEvent) {
    noFocus(e)
    exec('insertHTML', `<ul class="task-list"><li class="task-item"><label contenteditable="false"><input type="checkbox" />&nbsp;</label><span>Úkol</span></li></ul>`)
    editorRef.current?.focus(); handleInput()
  }

  const blockTag = queryValue('formatBlock').toLowerCase()

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap py-2 px-1 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-10 rounded-t-[12px]">

        <ToolBtn onMouseDown={tb('bold')}          title="Tučné (Ctrl+B)"      active={queryState('bold')}         ><strong>B</strong></ToolBtn>
        <ToolBtn onMouseDown={tb('italic')}         title="Kurzíva (Ctrl+I)"   active={queryState('italic')}       ><em>I</em></ToolBtn>
        <ToolBtn onMouseDown={tb('underline')}      title="Podtržení (Ctrl+U)" active={queryState('underline')}    ><span className="underline">U</span></ToolBtn>
        <ToolBtn onMouseDown={tb('strikeThrough')}  title="Přeškrtnutí"        active={queryState('strikeThrough')}><span className="line-through">S</span></ToolBtn>

        <Sep />

        <ToolBtn onMouseDown={tbHeading('h1')} title="Nadpis 1" active={blockTag === 'h1'}><span className="text-[11px] font-black">H1</span></ToolBtn>
        <ToolBtn onMouseDown={tbHeading('h2')} title="Nadpis 2" active={blockTag === 'h2'}><span className="text-[11px] font-black">H2</span></ToolBtn>
        <ToolBtn onMouseDown={tbHeading('h3')} title="Nadpis 3" active={blockTag === 'h3'}><span className="text-[11px] font-black">H3</span></ToolBtn>

        <Sep />

        <ToolBtn onMouseDown={tb('insertUnorderedList')} title="Odrážkový seznam" active={queryState('insertUnorderedList')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="2" cy="3.5" r="0.8" fill="currentColor" stroke="none"/><line x1="5" y1="3.5" x2="13" y2="3.5"/>
            <circle cx="2" cy="7"   r="0.8" fill="currentColor" stroke="none"/><line x1="5" y1="7"   x2="13" y2="7"/>
            <circle cx="2" cy="10.5" r="0.8" fill="currentColor" stroke="none"/><line x1="5" y1="10.5" x2="13" y2="10.5"/>
          </svg>
        </ToolBtn>
        <ToolBtn onMouseDown={tb('insertOrderedList')} title="Číslovaný seznam" active={queryState('insertOrderedList')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <text x="0" y="5" fontSize="5" fill="currentColor" stroke="none" fontWeight="700">1.</text><line x1="5" y1="3.5" x2="13" y2="3.5"/>
            <text x="0" y="9" fontSize="5" fill="currentColor" stroke="none" fontWeight="700">2.</text><line x1="5" y1="7"   x2="13" y2="7"/>
            <text x="0" y="13" fontSize="5" fill="currentColor" stroke="none" fontWeight="700">3.</text><line x1="5" y1="10.5" x2="13" y2="10.5"/>
          </svg>
        </ToolBtn>
        <ToolBtn onMouseDown={insertTaskItem} title="Checkbox">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="1" width="5" height="5" rx="1"/><polyline points="2.2,3.5 3.2,4.5 4.8,2.5"/>
            <line x1="8" y1="3.5" x2="13" y2="3.5"/>
            <rect x="1" y="8" width="5" height="5" rx="1"/><line x1="8" y1="10.5" x2="13" y2="10.5"/>
          </svg>
        </ToolBtn>

        <Sep />

        <ToolBtn onMouseDown={tbHeading('blockquote')} title="Citace" active={blockTag === 'blockquote'}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M1 3h2.5l-1.5 3H3c.8 0 1.5.7 1.5 1.5v2C4.5 10.3 3.8 11 3 11H1.5C.7 11 0 10.3 0 9.5v-5C0 3.7.4 3 1 3zm7 0h2.5l-1.5 3H10c.8 0 1.5.7 1.5 1.5v2c0 .8-.7 1.5-1.5 1.5H8.5C7.7 11 7 10.3 7 9.5v-5C7 3.7 7.4 3 8 3z"/>
          </svg>
        </ToolBtn>
        <ToolBtn onMouseDown={(e) => { noFocus(e); exec('insertHorizontalRule'); editorRef.current?.focus(); handleInput() }} title="Oddělovač">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="7" x2="13" y2="7"/>
          </svg>
        </ToolBtn>

        <Sep />

        {/* /page button in toolbar */}
        {onCreatePage && (
          <>
            <ToolBtn
              onMouseDown={(e) => {
                noFocus(e)
                exec('insertText', '/')
                editorRef.current?.focus()
                requestAnimationFrame(checkSlash)
              }}
              title="Vložit stránku (/page)"
            >
              <span className="text-[11px] font-bold" style={{ color: slash.active ? 'var(--color-primary)' : undefined }}>
                /↗
              </span>
            </ToolBtn>
            <Sep />
          </>
        )}

        <ToolBtn onMouseDown={(e) => { noFocus(e); exec('undo'); handleInput() }} title="Zpět (Ctrl+Z)">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 5H7a4 4 0 0 1 0 8H4"/><polyline points="2,2 2,5 5,5"/>
          </svg>
        </ToolBtn>
        <ToolBtn onMouseDown={(e) => { noFocus(e); exec('redo'); handleInput() }} title="Znovu (Ctrl+Y)">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5H6a4 4 0 0 0 0 8h3"/><polyline points="11,2 11,5 8,5"/>
          </svg>
        </ToolBtn>
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleEditorInput}
        onKeyDown={handleKeyDown}
        onClick={handleEditorClick}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="rich-editor flex-1 outline-none px-1 py-3 text-[15px] text-[var(--text-secondary)] leading-relaxed"
      />

      {/* Slash command popup */}
      {slash.active && slash.rect && (
        <SlashPopup
          query={slash.query}
          rect={slash.rect}
          suggestions={pageSuggestions}
          selectedIdx={slash.selectedIdx}
          onSelect={insertPageLink}
          onCreateNew={handleCreatePage}
        />
      )}
    </div>
  )
}
