import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary:
    'bg-gradient-to-br from-violet-600 to-violet-mid text-white border-0 shadow-violet hover:shadow-violet-lg hover:-translate-y-0.5',
  secondary:
    'bg-white/80 dark:bg-white/10 text-text-dark dark:text-white border border-white/60 dark:border-white/20 backdrop-blur-sm hover:-translate-y-0.5 hover:bg-white dark:hover:bg-white/20',
  ghost:
    'bg-[rgba(108,71,255,0.08)] text-violet-600 border-0 hover:bg-[rgba(108,71,255,0.14)]',
  glass:
    'bg-[rgba(255,255,255,0.72)] dark:bg-[rgba(26,12,56,0.84)] text-text-dark dark:text-white border border-[rgba(255,255,255,0.6)] dark:border-[rgba(108,71,255,0.18)] backdrop-blur-xl hover:bg-white dark:hover:bg-[rgba(26,12,56,0.95)] hover:-translate-y-0.5',
  danger:
    'bg-red-500 hover:bg-red-600 text-white border-0',
  outline:
    'bg-transparent text-violet-600 border border-[rgba(108,71,255,0.30)] hover:bg-[rgba(108,71,255,0.07)]',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-[8px]',
  md: 'px-[18px] py-[9px] text-[13px] rounded-[10px]',
  lg: 'px-10 py-4 text-[15px] rounded-[10px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 font-semibold font-sora transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
