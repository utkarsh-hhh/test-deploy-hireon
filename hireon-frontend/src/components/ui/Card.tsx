import { type HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean
  hover?: boolean
  gradient?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ glass, hover, gradient, padding = 'md', children, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-[14px] transition-all duration-300',
        // Base styles
        !glass && !gradient && 'bg-[var(--card-bg)] border border-[var(--card-border)] backdrop-blur-[16px] shadow-[var(--shadow)]',
        // Glass variant
        glass && 'bg-[rgba(255,255,255,0.72)] dark:bg-[rgba(26,12,56,0.84)] backdrop-blur-[24px] saturate-180 border border-[rgba(255,255,255,0.95)] dark:border-[rgba(108,71,255,0.18)] shadow-card',
        // Gradient variant
        gradient && 'bg-gradient-to-br from-[rgba(108,71,255,0.07)] to-[rgba(255,107,198,0.04)] border border-[var(--card-border)] backdrop-blur-[16px] shadow-[var(--shadow)]',
        // Hover effect
        hover && 'hover:shadow-[var(--shadow-h)] hover:-translate-y-1 cursor-pointer',
        // Padding
        {
          'p-0': padding === 'none',
          'p-3': padding === 'sm',
          'p-[22px]': padding === 'md',
          'p-8': padding === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
