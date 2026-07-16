import { useEffect } from 'react'
import { resolveFieldKey, useFormRuntime } from './formRuntime'

export function ToggleBlock({
  blockId,
  label = 'Toggle',
  fieldKey = '',
  required = false,
  checked = true,
  fontSize = 14,
  textColor = '#0f172a',
  activeColor = '#2563eb',
  inactiveColor = '#cbd5e1',
  knobColor = '#ffffff',
}: {
  blockId?: string
  label?: string
  fieldKey?: string
  required?: boolean
  checked?: boolean
  fontSize?: number
  textColor?: string
  activeColor?: string
  inactiveColor?: string
  knobColor?: string
}) {
  const formRuntime = useFormRuntime()
  const resolvedFieldKey = resolveFieldKey(blockId, label, fieldKey)
  const runtimeValue = blockId ? formRuntime?.getFieldValue(blockId) : undefined
  const currentChecked = typeof runtimeValue === 'boolean' ? runtimeValue : checked
  const safeFontSize = Math.max(8, Number(fontSize) || 14)
  const trackWidth = Math.max(34, safeFontSize * 2.8)
  const trackHeight = Math.max(18, safeFontSize * 1.55)
  const knobSize = trackHeight - 4
  const isRuntimeField = Boolean(formRuntime?.previewMode)

  useEffect(() => {
    if (!isRuntimeField || !blockId || formRuntime?.getFieldValue(blockId) !== undefined) return
    formRuntime?.setValue(resolvedFieldKey, checked, blockId)
  }, [blockId, checked, formRuntime, isRuntimeField, resolvedFieldKey])

  return (
    <button
      type="button"
      aria-label="Toggle block"
      aria-pressed={currentChecked}
      onClick={() => formRuntime?.setValue(resolvedFieldKey, !currentChecked, blockId)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pointerEvents: isRuntimeField ? 'auto' : 'none',
        padding: 0,
        border: 0,
        background: 'transparent',
        textAlign: 'left',
        color: textColor || '#0f172a',
        fontSize: safeFontSize,
        lineHeight: 1.2,
        cursor: isRuntimeField ? 'pointer' : 'default',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          maxWidth: '100%',
        }}
      >
        <span
          style={{
            position: 'relative',
            display: 'inline-flex',
            width: trackWidth,
            height: trackHeight,
            flex: '0 0 auto',
            borderRadius: 999,
            backgroundColor: currentChecked ? activeColor || '#2563eb' : inactiveColor || '#cbd5e1',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: currentChecked ? trackWidth - knobSize - 2 : 2,
              width: knobSize,
              height: knobSize,
              borderRadius: 999,
              backgroundColor: knobColor || '#ffffff',
              boxShadow: '0 1px 4px rgba(15,23,42,0.18)',
            }}
          />
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label || 'Toggle'}{required ? ' *' : ''}
        </span>
      </span>
    </button>
  )
}
