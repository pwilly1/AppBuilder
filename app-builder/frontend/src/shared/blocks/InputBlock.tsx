import { useEffect } from 'react'
import { resolveFieldKey, useFormRuntime } from './formRuntime'

export function InputBlock({
  blockId,
  label = 'Label',
  fieldKey = '',
  required = false,
  placeholder = 'Placeholder',
  value = '',
  inputType = 'text',
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
  required?: boolean
  placeholder?: string
  value?: string
  inputType?: string
  fontSize?: number
  backgroundColor?: string
  textColor?: string
  placeholderColor?: string
  borderColor?: string
  borderRadius?: number
}) {
  const formRuntime = useFormRuntime()
  const resolvedFieldKey = resolveFieldKey(blockId, label, fieldKey)
  const runtimeValue = blockId ? formRuntime?.getFieldValue(blockId) : undefined
  const currentValue = typeof runtimeValue === 'string' ? runtimeValue : value
  const displayValue = currentValue || placeholder
  const isPlaceholder = !currentValue
  const safeFontSize = Math.max(8, Number(fontSize) || 14)
  const safeRadius = Math.max(0, Number(borderRadius) || 0)
  const isRuntimeField = Boolean(formRuntime?.previewMode)

  useEffect(() => {
    if (!isRuntimeField || !blockId || formRuntime?.getFieldValue(blockId) !== undefined) return
    formRuntime?.setValue(resolvedFieldKey, value, blockId)
  }, [blockId, formRuntime, isRuntimeField, resolvedFieldKey, value])

  return (
    <div
      aria-label={`${inputType || 'text'} input block`}
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
        <input
          type={inputType === 'phone' ? 'tel' : inputType || 'text'}
          value={currentValue}
          placeholder={placeholder}
          required={required}
          onChange={(event) => formRuntime?.setValue(resolvedFieldKey, event.currentTarget.value, blockId)}
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
            lineHeight: 1.3,
            padding: '0 12px',
            outline: 'none',
          }}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            minHeight: 0,
            flex: 1,
            width: '100%',
            boxSizing: 'border-box',
            border: `1px solid ${borderColor || '#cbd5e1'}`,
            borderRadius: safeRadius,
            backgroundColor: backgroundColor || '#ffffff',
            color: isPlaceholder ? placeholderColor || '#94a3b8' : textColor || '#0f172a',
            fontSize: safeFontSize,
            lineHeight: 1.3,
            padding: '0 12px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {displayValue}
        </div>
      )}
    </div>
  )
}
