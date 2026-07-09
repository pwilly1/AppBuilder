import { resolveFieldKey, resolveSubmitGroupId, useFormRuntime } from './formRuntime'

export function CheckboxBlock({
  blockId,
  label = 'Checkbox',
  fieldKey = '',
  submitGroupId = '',
  required = false,
  checked = true,
  fontSize = 14,
  textColor = '#0f172a',
  boxColor = '#2563eb',
  checkColor = '#ffffff',
  borderColor = '#94a3b8',
}: {
  blockId?: string
  label?: string
  fieldKey?: string
  submitGroupId?: string
  required?: boolean
  checked?: boolean
  fontSize?: number
  textColor?: string
  boxColor?: string
  checkColor?: string
  borderColor?: string
}) {
  const formRuntime = useFormRuntime()
  const resolvedFieldKey = resolveFieldKey(blockId, label, fieldKey)
  const resolvedGroupId = resolveSubmitGroupId(submitGroupId)
  const runtimeValue = formRuntime?.values[resolvedGroupId]?.[resolvedFieldKey]
  const currentChecked = typeof runtimeValue === 'boolean' ? runtimeValue : checked
  const safeFontSize = Math.max(8, Number(fontSize) || 14)
  const isRuntimeField = Boolean(formRuntime?.previewMode)

  return (
    <button
      type="button"
      aria-label="Checkbox block"
      aria-pressed={currentChecked}
      onClick={() => formRuntime?.setValue(resolvedFieldKey, !currentChecked, resolvedGroupId)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
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
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: Math.max(14, safeFontSize + 3),
          height: Math.max(14, safeFontSize + 3),
          flex: '0 0 auto',
          borderRadius: 5,
          border: `1px solid ${currentChecked ? boxColor || '#2563eb' : borderColor || '#94a3b8'}`,
          backgroundColor: currentChecked ? boxColor || '#2563eb' : 'transparent',
          color: checkColor || '#ffffff',
          fontSize: safeFontSize,
          fontWeight: 800,
        }}
      >
        {currentChecked ? '✓' : ''}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label || 'Checkbox'}{required ? ' *' : ''}
      </span>
    </button>
  )
}
