import { useId, type ReactNode } from 'react'

interface TooltipProps {
  content: string
  /** Receives the props to spread on the focusable element being described. */
  children: (trigger: { 'aria-describedby': string }) => ReactNode
}

// Shown on hover and on keyboard focus, purely via CSS (group-hover / group-focus-within).
export function Tooltip({ content, children }: TooltipProps) {
  const id = useId()
  return (
    <span className="group relative inline-flex">
      {children({ 'aria-describedby': id })}
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max max-w-48 -translate-x-1/2 rounded-md border border-line bg-surface px-2 py-1 text-center text-xs text-heading opacity-0 shadow-md transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {content}
      </span>
    </span>
  )
}
