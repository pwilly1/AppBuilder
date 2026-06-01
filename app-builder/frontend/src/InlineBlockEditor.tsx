import { useEffect, useRef, useState, type FocusEventHandler } from 'react'
import type { Block } from './shared/schema/types'
import { getHeroHeadlineStyle, getHeroRootStyle } from './shared/blocks/Hero'

type InlineBlockEditorProps = {
  block: Block
  width?: number
  onCommit: (props: Record<string, any>) => void
  onCancel: () => void
}

export function InlineBlockEditor({ block, width, onCommit, onCancel }: InlineBlockEditorProps) {
  const [draft, setDraft] = useState<Record<string, any>>(() => ({ ...(block.props as Record<string, any>) }))
  const textEditorRef = useRef<HTMLTextAreaElement | null>(null)
  const heroEditorRef = useRef<HTMLDivElement | null>(null)
  const heroHeadlineRef = useRef<HTMLDivElement | null>(null)
  const lastAcceptedHeroDraftRef = useRef<Record<string, any>>({ ...(block.props as Record<string, any>) })
  const navInputRef = useRef<HTMLInputElement | null>(null)
  const lastAcceptedNavLabelRef = useRef(String((block.props as Record<string, any>)?.label ?? 'Go'))

  useEffect(() => {
    setDraft({ ...(block.props as Record<string, any>) })
    lastAcceptedHeroDraftRef.current = { ...(block.props as Record<string, any>) }
    lastAcceptedNavLabelRef.current = String((block.props as Record<string, any>)?.label ?? 'Go')
  }, [block])

  useEffect(() => {
    if (block.type !== 'hero') return
    const frame = window.requestAnimationFrame(() => {
      const headlineNode = heroHeadlineRef.current
      if (headlineNode) headlineNode.textContent = String(lastAcceptedHeroDraftRef.current.headline ?? '')
      if (headlineNode) {
        headlineNode.focus()
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(headlineNode)
        range.collapse(false)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [block.id, block.type])

  const commit = () => onCommit(block.type === 'hero' ? lastAcceptedHeroDraftRef.current : draft)
  const handleOverlayBlur: FocusEventHandler<HTMLDivElement> = (event) => {
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) return
    commit()
  }

  const readEditableText = (node: HTMLDivElement | null) => (node?.innerText ?? '').replace(/\r\n/g, '\n')

  const moveCaretToEnd = (node: HTMLDivElement | null) => {
    if (!node) return
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(node)
    range.collapse(false)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  const applyHeroDraft = (node: HTMLDivElement | null) => {
    if (!node) return

    const nextDraft = {
      ...lastAcceptedHeroDraftRef.current,
      headline: readEditableText(node),
    }

    const editor = heroEditorRef.current
    const headlineNode = heroHeadlineRef.current
    if (!editor || !headlineNode) {
      lastAcceptedHeroDraftRef.current = nextDraft
      return
    }

    const editorStyles = window.getComputedStyle(editor)
    const paddingTop = Number.parseFloat(editorStyles.paddingTop || '0') || 0
    const paddingBottom = Number.parseFloat(editorStyles.paddingBottom || '0') || 0
    const usableHeight = editor.clientHeight - paddingTop - paddingBottom
    const contentHeight = headlineNode.scrollHeight
    const fitsHeight = contentHeight <= usableHeight + 4

    if (fitsHeight) {
      lastAcceptedHeroDraftRef.current = nextDraft
      return
    }

    node.textContent = String(lastAcceptedHeroDraftRef.current.headline ?? '')
    moveCaretToEnd(node)
  }

  if (block.type === 'text') {
    return (
      <div
        className="absolute inset-0 z-[120] rounded-[1rem] bg-white/90 p-3 backdrop-blur-[1px]"
        onPointerDown={(event) => event.stopPropagation()}
        onBlur={handleOverlayBlur}
      >
        <textarea
          ref={textEditorRef}
          autoFocus
          value={String(draft.value ?? '')}
          onChange={(event) => {
            const nextValue = event.target.value
            const currentValue = String(draft.value ?? '')
            const isShrinking = nextValue.length < currentValue.length
            const fitsHeight = event.target.scrollHeight <= event.target.clientHeight + 1

            if (fitsHeight || isShrinking) {
              setDraft((current) => ({ ...current, value: nextValue }))
              return
            }

            event.target.value = currentValue
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              onCancel()
            }
          }}
          className="h-full w-full resize-none border-none bg-transparent text-slate-900 outline-none"
          style={{
            fontSize: Number(draft.fontSize ?? 16) || 16,
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            overflowY: 'hidden',
          }}
        />
      </div>
    )
  }

  if (block.type === 'hero') {
    const heroRootStyle = getHeroRootStyle()
    const heroHeadlineStyle = getHeroHeadlineStyle(Number(lastAcceptedHeroDraftRef.current.headlineSize ?? 28) || 28)
    const heroEditCompensationPx = 4

    return (
      <div
        ref={heroEditorRef}
        className="absolute inset-0 z-[120] rounded-[1rem] bg-white/90 backdrop-blur-[1px]"
        style={heroRootStyle}
        onPointerDown={(event) => event.stopPropagation()}
        onBlur={handleOverlayBlur}
      >
        <div
          ref={heroHeadlineRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          onInput={(event) => applyHeroDraft(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              onCancel()
            }
          }}
          className="outline-none"
          style={{
            ...heroHeadlineStyle,
            background: 'transparent',
            width: `calc(100% + ${heroEditCompensationPx}px)`,
            maxWidth: `calc(100% + ${heroEditCompensationPx}px)`,
            marginRight: -heroEditCompensationPx,
          }}
        />
      </div>
    )
  }

  if (block.type === 'navButton') {
    const disabled = !(draft.toPageId as string | undefined)
    return (
      <div
        className="absolute inset-0 z-[120] flex items-start justify-start rounded-[1rem] bg-white/20 p-3"
        onPointerDown={(event) => event.stopPropagation()}
        onBlur={handleOverlayBlur}
      >
        <div
          className="rounded-[10px] px-[14px] py-[10px]"
          style={{ backgroundColor: disabled ? '#e5e7eb' : '#0f172a', maxWidth: width ? Math.max(80, width - 24) : undefined }}
        >
          <input
            ref={navInputRef}
            autoFocus
            value={String(draft.label ?? 'Go')}
            onChange={(event) => {
              const nextLabel = event.target.value
              const currentLabel = String(draft.label ?? 'Go')
              const isShrinking = nextLabel.length < currentLabel.length
              const fitsWidth = event.target.scrollWidth <= event.target.clientWidth + 1

              if (fitsWidth || isShrinking) {
                lastAcceptedNavLabelRef.current = nextLabel
                setDraft((current) => ({ ...current, label: nextLabel }))
                return
              }

              event.target.value = lastAcceptedNavLabelRef.current
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                onCancel()
              }
              if (event.key === 'Enter') {
                event.preventDefault()
                commit()
              }
            }}
            className="w-full border-none bg-transparent text-left font-semibold outline-none"
            style={{
              margin: 0,
              padding: 0,
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              color: disabled ? '#475569' : '#ffffff',
              fontSize: 14,
              minWidth: 24,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          />
        </div>
      </div>
    )
  }

  return null
}
