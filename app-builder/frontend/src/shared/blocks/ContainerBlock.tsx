import type { ReactNode } from 'react'

type ContainerBlockProps = {
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  opacity?: number
  children?: ReactNode
}

export function ContainerBlock({
  backgroundColor = 'transparent',
  borderColor = 'transparent',
  borderWidth = 0,
  borderRadius = 0,
  opacity = 1,
  children,
}: ContainerBlockProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        backgroundColor,
        borderColor,
        borderWidth,
        borderStyle: borderWidth > 0 ? 'solid' : 'none',
        borderRadius,
        opacity,
      }}
    >
      {children}
    </div>
  )
}
