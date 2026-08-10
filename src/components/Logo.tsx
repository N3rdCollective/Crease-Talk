type LogoProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-4xl',
} as const

export function Logo({ className = '', size = 'md' }: LogoProps) {
  return (
    <span
      className={`font-logo leading-none tracking-normal text-white ${sizeClasses[size]} ${className}`}
      aria-label="CreaseTalk"
    >
      Crease Talk
    </span>
  )
}
