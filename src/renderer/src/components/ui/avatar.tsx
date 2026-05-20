import { User } from 'lucide-react'
import { cn } from '../../lib/utils'

interface AvatarProps {
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-20 w-20'
}

const iconSizes = {
  sm: 14,
  md: 16,
  lg: 32
}

export function Avatar({ src, size = 'md', className }: AvatarProps): React.JSX.Element {
  const sizeClass = sizeClasses[size]

  if (src) {
    return (
      <img
        src={src}
        alt="avatar"
        className={cn('rounded-full object-cover flex-shrink-0', sizeClass, className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center flex-shrink-0 select-none',
        'bg-muted text-muted-foreground',
        sizeClass,
        className
      )}
    >
      <User size={iconSizes[size]} strokeWidth={1.5} />
    </div>
  )
}
