import type { BlockAction } from '../schema/types'
import { isActionConfigured } from '../actions/blockActions'
import { executeWebBlockAction } from '../actions/webActionExecutor'

export function NavButton({
  label,
  action,
  onNavigate,
  previewMode,
  fontSize,
  contentPadding = 12,
  buttonPaddingX = 14,
  buttonPaddingY = 10,
  borderRadius = 10,
  backgroundColor = '#0f172a',
  textColor = '#ffffff',
  contentScale = 1,
}: {
  label?: string
  action?: BlockAction | null
  onNavigate?: (pageId: string) => void
  previewMode?: boolean
  fontSize?: number
  contentPadding?: number
  buttonPaddingX?: number
  buttonPaddingY?: number
  borderRadius?: number
  backgroundColor?: string
  textColor?: string
  contentScale?: number
}) {
  const text = label || 'Go'
  const configured = isActionConfigured(action)

  return (
    <div
      style={{
        display: 'inline-flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        boxSizing: 'border-box',
        padding: contentPadding * contentScale,
        overflow: 'visible',
      }}
    >
      <button
        type="button"
        disabled={!configured}
        onClick={() => {
          if (!previewMode || !action || !configured) return
          void executeWebBlockAction(action, { onNavigate })
        }}
        style={{
          border: 'none',
          borderRadius: borderRadius * contentScale,
          padding: `${buttonPaddingY * contentScale}px ${buttonPaddingX * contentScale}px`,
          backgroundColor: configured ? backgroundColor || '#0f172a' : '#e5e7eb',
          color: configured ? textColor || '#ffffff' : '#475569',
          fontSize: (fontSize ?? 14) * contentScale,
          fontWeight: 600,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          cursor: previewMode && configured ? 'pointer' : 'default',
        }}
      >
        {text}
      </button>
    </div>
  )
}
