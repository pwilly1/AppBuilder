import type { KeyboardEvent } from 'react'
import { isActionConfigured } from '../actions/blockActions'
import { executeWebBlockAction } from '../actions/webActionExecutor'
import type { BlockAction } from '../schema/types'
import type { RuntimeContext } from '../runtime/runtimeBindings'
import { useFormRuntime } from './formRuntime'

const iconMap: Record<string, string> = {
  star: '★',
  check: '✓',
  home: '⌂',
  search: '⌕',
  user: '●',
  heart: '♥',
  bell: '◔',
  plus: '+',
  arrow: '→',
}

export function IconBlock({
  iconName = 'star',
  fontSize = 28,
  color = '#2563eb',
  backgroundColor = '#ffffff',
  borderRadius = 999,
  action,
  previewMode,
  onNavigate,
  runtimeContext,
  onSetPageState,
}: {
  iconName?: string
  fontSize?: number
  color?: string
  backgroundColor?: string
  borderRadius?: number
  action?: BlockAction | null
  previewMode?: boolean
  onNavigate?: (pageId: string) => void
  runtimeContext?: RuntimeContext
  onSetPageState?: (variableId: string, value: string) => void
}) {
  const formRuntime = useFormRuntime()
  const interactive = Boolean(previewMode && isActionConfigured(action))
  const runAction = () => {
    if (!interactive || !action) return
    void executeWebBlockAction(action, { onNavigate, runtimeContext, onSetPageState, formRuntime })
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    runAction()
  }

  return (
    <div
      aria-label={`${iconName || 'star'} icon block`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={runAction}
      onKeyDown={onKeyDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pointerEvents: interactive ? 'auto' : 'none',
        cursor: interactive ? 'pointer' : 'default',
        borderRadius: Math.max(0, Number(borderRadius) || 0),
        backgroundColor: backgroundColor || '#ffffff',
        color: color || '#2563eb',
        fontSize: Math.max(8, Number(fontSize) || 28),
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {iconMap[iconName || 'star'] || iconMap.star}
    </div>
  )
}
