import { useEffect, useRef, type CSSProperties } from 'react'
import { resolveFieldKey, useFormRuntime } from './formRuntime'

type TextBlockProps = {
  blockId?: string
  previewMode?: boolean
  value?: string
  fontSize?: number
  contentPadding?: number
  contentScale?: number
  textColor?: string
  editable?: boolean
  textInputMode?: 'singleLine' | 'multiline'
  inputType?: string
  fieldLabel?: string
  showFieldLabel?: boolean
  fieldKey?: string
  required?: boolean
  placeholder?: string
  backgroundColor?: string
  placeholderColor?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
}

export function TextBlock({
  blockId,
  previewMode,
  value = '',
  fontSize = 16,
  contentPadding = 12,
  contentScale = 1,
  textColor = '#0f172a',
  editable = false,
  textInputMode = 'singleLine',
  inputType = 'text',
  fieldLabel = 'Text field',
  showFieldLabel = false,
  fieldKey = '',
  required = false,
  placeholder = 'Enter text...',
  backgroundColor = '#ffffff',
  placeholderColor = '#94a3b8',
  borderColor = '#cbd5e1',
  borderWidth = 1,
  borderRadius = 12,
}: TextBlockProps) {
  const formRuntime = useFormRuntime()
  const safeScale = Math.max(0.1, Number(contentScale) || 1)
  const safeFontSize = Math.max(8, Number(fontSize) || 16) * safeScale
  const safePadding = Math.max(0, Number(contentPadding) || 0) * safeScale
  const safeBorderWidth = Math.max(0, Number(borderWidth) || 0) * safeScale
  const safeRadius = Math.max(0, Number(borderRadius) || 0) * safeScale
  const isMultiline = textInputMode === 'multiline'
  const isRuntimeField = Boolean(editable && previewMode && formRuntime?.previewMode)
  const resolvedFieldKey = resolveFieldKey(blockId, fieldLabel, fieldKey)
  const runtimeValue = blockId ? formRuntime?.getFieldValue(blockId) : undefined
  const currentValue = typeof runtimeValue === 'string' ? runtimeValue : value
  const lastSeedValueRef = useRef<string | undefined>(undefined)
  const lastFieldKeyRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!isRuntimeField || !blockId || !formRuntime) return

    const existingValue = formRuntime.getFieldValue(blockId)
    const previousSeed = lastSeedValueRef.current
    const fieldKeyChanged = lastFieldKeyRef.current !== undefined && lastFieldKeyRef.current !== resolvedFieldKey
    const seedChangedWithoutUserEdit = previousSeed !== undefined
      && previousSeed !== value
      && existingValue === previousSeed

    if (existingValue === undefined || seedChangedWithoutUserEdit || fieldKeyChanged) {
      formRuntime.setValue(
        resolvedFieldKey,
        typeof existingValue === 'string' && !seedChangedWithoutUserEdit ? existingValue : value,
        blockId,
      )
    }

    lastSeedValueRef.current = value
    lastFieldKeyRef.current = resolvedFieldKey
  }, [blockId, formRuntime, isRuntimeField, resolvedFieldKey, value])

  if (!editable) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          width: '100%',
          boxSizing: 'border-box',
          padding: safePadding,
          overflow: 'hidden',
        }}
      >
        <p
          style={{
            margin: 0,
            width: '100%',
            minWidth: 0,
            fontSize: safeFontSize,
            lineHeight: 1.45,
            color: textColor,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
          }}
        >
          {value}
        </p>
      </div>
    )
  }

  const fieldStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    border: safeBorderWidth > 0 ? `${safeBorderWidth}px solid ${borderColor}` : 'none',
    borderRadius: safeRadius,
    backgroundColor,
    color: textColor,
    font: 'inherit',
    fontSize: safeFontSize,
    lineHeight: 1.45,
    padding: `${8 * safeScale}px ${10 * safeScale}px`,
    outline: 'none',
  }
  const displayValue = currentValue || placeholder
  const displayColor = currentValue ? textColor : placeholderColor

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: showFieldLabel ? 6 * safeScale : 0,
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: safePadding,
        overflow: 'hidden',
        pointerEvents: isRuntimeField ? 'auto' : 'none',
      }}
    >
      {showFieldLabel && fieldLabel ? (
        <div
          style={{
            flex: '0 0 auto',
            color: textColor,
            fontSize: Math.max(8, safeFontSize - 2 * safeScale),
            fontWeight: 600,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fieldLabel}
        </div>
      ) : null}

      {isRuntimeField && isMultiline ? (
        <textarea
          className="apptura-editable-text"
          aria-label={fieldLabel || 'Text field'}
          value={currentValue}
          placeholder={placeholder}
          required={required}
          onChange={(event) => formRuntime?.setValue(resolvedFieldKey, event.currentTarget.value, blockId)}
          style={{
            ...fieldStyle,
            resize: 'none',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            '--apptura-placeholder-color': placeholderColor,
          } as CSSProperties}
        />
      ) : isRuntimeField ? (
        <input
          className="apptura-editable-text"
          aria-label={fieldLabel || 'Text field'}
          type={inputType === 'phone' ? 'tel' : inputType || 'text'}
          value={currentValue}
          placeholder={placeholder}
          required={required}
          onChange={(event) => formRuntime?.setValue(resolvedFieldKey, event.currentTarget.value, blockId)}
          style={{
            ...fieldStyle,
            '--apptura-placeholder-color': placeholderColor,
          } as CSSProperties}
        />
      ) : (
        <div
          aria-label={fieldLabel || 'Text field'}
          style={{
            ...fieldStyle,
            color: displayColor,
            whiteSpace: isMultiline ? 'pre-wrap' : 'nowrap',
            overflow: 'hidden',
            overflowWrap: isMultiline ? 'break-word' : undefined,
            textOverflow: isMultiline ? undefined : 'ellipsis',
          }}
        >
          {inputType === 'password' && currentValue ? '\u2022'.repeat(currentValue.length) : displayValue}
        </div>
      )}
    </div>
  )
}
