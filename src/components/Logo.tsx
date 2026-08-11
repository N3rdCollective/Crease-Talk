type LogoProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-12 w-auto max-w-[160px]',
  md: 'h-[4.25rem] w-auto max-w-[200px] sm:h-[4.75rem] sm:max-w-[240px] md:h-[5.25rem] md:max-w-[280px]',
  lg: 'h-20 w-auto max-w-[240px] md:h-24 md:max-w-[300px]',
} as const

export function Logo({ className = '', size = 'md' }: LogoProps) {
  return (
    <img
      src="/creasetalk-logo.png"
      alt="Crease Talk"
      className={`object-contain object-left ${sizeClasses[size]} ${className}`}
    />
  )
}
