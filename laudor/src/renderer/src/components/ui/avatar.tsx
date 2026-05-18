import { cn } from '../../lib/utils'

interface AvatarProps {
  src?: string | null
  fallback?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-20 w-20 text-xl'
}

export function Avatar({ src, fallback, size = 'md', className }: AvatarProps): React.JSX.Element {
  const sizeClass = sizeClasses[size]

  if (src) {
    return (
      <img
        src={src}
        alt={fallback ?? 'avatar'}
        className={cn('rounded-full object-cover flex-shrink-0', sizeClass, className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center flex-shrink-0 font-medium select-none',
        'bg-primary/10 text-primary dark:bg-primary/20',
        sizeClass,
        className
      )}
    >
      {fallback?.slice(0, 2).toUpperCase() ?? '?'}
    </div>
  )
}
