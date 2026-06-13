import { useEffect, useRef, useState, type FocusEventHandler } from 'react'
import type { Block } from '../shared/schema/types'
import { getHeroHeadlineStyle, getHeroRootStyle } from '../shared/blocks/Hero'
import { getBlockContentScale } from '../shared/schema/contentScale'

type InlineBlockEditorProps = {
  block: Block
  width?: number
  onCommit: (props: Record<string, any>) => void
  onCancel: () => void
}

export function InlineBlockEditor({ block, width, onCommit, onCancel }: InlineBlockEditorProps) {
  const [draft, setDraft] = useState<Record<string, any>>(() => ({ ...(block.props as Record<string, any>) }))
  const textEditorRef = useRef<HTMLTextAreaElement | null>(null)
  const lastAcceptedTextHeightRef = useRef(0)
  const heroEditorRef = useRef<HTMLDivElement | null>(null)
  const heroHeadlineRef = useRef<HTMLDivElement | null>(null)
  const lastAcceptedHeroHeightRef = useRef(0)
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
      lastAcceptedHeroHeightRef.current = headlineNode?.scrollHeight ?? 0
    })
    return () => window.cancelAnimationFrame(frame)
  }, [block.id, block.type])

  useEffect(() => {
    if (block.type !== 'text') return
    const frame = window.requestAnimationFrame(() => {
      lastAcceptedTextHeightRef.current = textEditorRef.current?.scrollHeight ?? 0
    })
    return () => window.cancelAnimationFrame(frame)
  }, [block.id, block.type, draft.value])

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
    const previousHeadline = String(lastAcceptedHeroDraftRef.current.headline ?? '')
    const isShrinking = String(nextDraft.headline ?? '').length < previousHeadline.length

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
    const fitsHeight = contentHeight <= usableHeight + 6
    const staysOnAcceptedRows =
      lastAcceptedHeroHeightRef.current > 0 && contentHeight <= lastAcceptedHeroHeightRef.current + 2

    if (fitsHeight || staysOnAcceptedRows || isShrinking) {
      lastAcceptedHeroHeightRef.current = contentHeight
      lastAcceptedHeroDraftRef.current = nextDraft
      return
    }

    node.textContent = String(lastAcceptedHeroDraftRef.current.headline ?? '')
    moveCaretToEnd(node)
  }

  if (block.type === 'text') {
    const contentScale = getBlockContentScale(block)
    const contentPadding = Number(draft.contentPadding ?? 12) || 12
    const fontSize = Number(draft.fontSize ?? 16) || 16
    const editWidthCompensationPx = 4

    return (
      <div
        className="absolute inset-0 z-[120] overflow-hidden rounded-[1rem]"
        style={{ padding: contentPadding * contentScale }}
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
            const contentHeight = event.target.scrollHeight
            const fitsHeight = contentHeight <= event.target.clientHeight + 6
            const staysOnAcceptedRows =
              lastAcceptedTextHeightRef.current > 0 && contentHeight <= lastAcceptedTextHeightRef.current + 2

            if (fitsHeight || staysOnAcceptedRows || isShrinking) {
              lastAcceptedTextHeightRef.current = contentHeight
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
            display: 'block',
            margin: 0,
            marginRight: -editWidthCompensationPx,
            padding: 0,
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            fontSize: fontSize * contentScale,
            lineHeight: 1.45,
            width: `calc(100% + ${editWidthCompensationPx}px)`,
            maxWidth: `calc(100% + ${editWidthCompensationPx}px)`,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            overflowY: 'hidden',
          }}
        />
      </div>
    )
  }

  if (block.type === 'hero') {
    const contentScale = getBlockContentScale(block)
    const contentPadding = Number(lastAcceptedHeroDraftRef.current.contentPadding ?? 16) || 16
    const heroRootStyle = getHeroRootStyle(contentScale, contentPadding)
    const heroHeadlineStyle = getHeroHeadlineStyle(Number(lastAcceptedHeroDraftRef.current.headlineSize ?? 28) || 28, contentScale)
    const editWidthCompensationPx = 4

    return (
      <div
        ref={heroEditorRef}
        className="absolute inset-0 z-[120] rounded-[1rem]"
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
            width: `calc(100% + ${editWidthCompensationPx}px)`,
            maxWidth: `calc(100% + ${editWidthCompensationPx}px)`,
            marginRight: -editWidthCompensationPx,
          }}
        />
      </div>
    )
  }

  if (block.type === 'navButton') {
    const disabled = !(draft.toPageId as string | undefined)
    const contentScale = getBlockContentScale(block)
    const contentPadding = Number(draft.contentPadding ?? 12) || 12
    const buttonPaddingX = Number(draft.buttonPaddingX ?? 14) || 14
    const buttonPaddingY = Number(draft.buttonPaddingY ?? 10) || 10
    const borderRadius = Number(draft.borderRadius ?? 10) || 10
    const fontSize = Number(draft.fontSize ?? 14) || 14
    const scaledContentPadding = contentPadding * contentScale
    const scaledButtonPaddingX = buttonPaddingX * contentScale
    const scaledButtonPaddingY = buttonPaddingY * contentScale
    const scaledBorderRadius = borderRadius * contentScale
    const scaledFontSize = fontSize * contentScale

    return (
      <div
        className="absolute inset-0 z-[120] flex items-start justify-start overflow-hidden rounded-[1rem]"
        style={{ padding: scaledContentPadding }}
        onPointerDown={(event) => event.stopPropagation()}
        onBlur={handleOverlayBlur}
      >
        <div
          style={{
            backgroundColor: disabled ? '#e5e7eb' : '#0f172a',
            borderRadius: scaledBorderRadius,
            boxSizing: 'border-box',
            maxWidth: '100%',
            minWidth: 0,
            overflow: 'hidden',
            padding: `${scaledButtonPaddingY}px ${scaledButtonPaddingX}px`,
          }}
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
              display: 'block',
              margin: 0,
              padding: 0,
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              color: disabled ? '#475569' : '#ffffff',
              fontSize: scaledFontSize,
              minWidth: 0,
              maxWidth: width ? Math.max(1, width - scaledContentPadding * 2 - scaledButtonPaddingX * 2) : undefined,
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
