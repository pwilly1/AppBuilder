import { resolveFieldKey, resolveSubmitGroupId, useFormRuntime } from './formRuntime'

export function TextareaBlock({
  blockId,
  label = 'Message',
  fieldKey = '',
  submitGroupId = '',
  required = false,
  placeholder = 'Write something...',
  value = '',
  rows = 3,
  fontSize = 14,
  backgroundColor = '#ffffff',
  textColor = '#0f172a',
  placeholderColor = '#94a3b8',
  borderColor = '#cbd5e1',
  borderRadius = 12,
}: {
  blockId?: string
  label?: string
  fieldKey?: string
  submitGroupId?: string
  required?: boolean
  placeholder?: string
  value?: string
  rows?: number
  fontSize?: number
  backgroundColor?: string
  textColor?: string
  placeholderColor?: string
  borderColor?: string
  borderRadius?: number
}) {
  const formRuntime = useFormRuntime()
  const resolvedFieldKey = resolveFieldKey(blockId, label, fieldKey)
  const resolvedGroupId = resolveSubmitGroupId(submitGroupId)
  const runtimeValue = formRuntime?.values[resolvedGroupId]?.[resolvedFieldKey]
  const currentValue = typeof runtimeValue === 'string' ? runtimeValue : value
  const displayValue = currentValue || placeholder
  const isPlaceholder = !currentValue
  const safeFontSize = Math.max(8, Number(fontSize) || 14)
  const safeRadius = Math.max(0, Number(borderRadius) || 0)
  const safeRows = Math.max(1, Number(rows) || 1)
  const isRuntimeField = Boolean(formRuntime?.previewMode)

  return (
    <div
      aria-label="Textarea block"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        padding: 8,
        pointerEvents: isRuntimeField ? 'auto' : 'none',
      }}
    >
      {label ? (
        <div
          style={{
            color: '#475569',
            fontSize: Math.max(8, safeFontSize - 2),
            fontWeight: 600,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      ) : null}
      {isRuntimeField ? (
        <textarea
          value={currentValue}
          placeholder={placeholder}
          required={required}
          rows={safeRows}
          onChange={(event) => formRuntime?.setValue(resolvedFieldKey, event.currentTarget.value, resolvedGroupId, blockId)}
          style={{
            minHeight: 0,
            flex: 1,
            width: '100%',
            boxSizing: 'border-box',
            border: `1px solid ${borderColor || '#cbd5e1'}`,
            borderRadius: safeRadius,
            backgroundColor: backgroundColor || '#ffffff',
            color: textColor || '#0f172a',
            fontSize: safeFontSize,
            lineHeight: 1.4,
            padding: '10px 12px',
            resize: 'none',
            outline: 'none',
          }}
        />
      ) : (
        <div
          style={{
            minHeight: 0,
            flex: 1,
            width: '100%',
            boxSizing: 'border-box',
            border: `1px solid ${borderColor || '#cbd5e1'}`,
            borderRadius: safeRadius,
            backgroundColor: backgroundColor || '#ffffff',
            color: isPlaceholder ? placeholderColor || '#94a3b8' : textColor || '#0f172a',
            fontSize: safeFontSize,
            lineHeight: 1.4,
            padding: '10px 12px',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
          }}
        >
          {displayValue.split('\n').slice(0, safeRows).join('\n')}
        </div>
      )}
    </div>
  )
}
