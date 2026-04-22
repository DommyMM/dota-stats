import clsx from 'clsx'
import type { Hero } from '../../api/types'
import { heroIconUrl } from '../../lib/dota'

type HeroIconProps = {
  hero?: Hero
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASS: Record<NonNullable<HeroIconProps['size']>, string> = {
  sm: 'w-7 h-4',
  md: 'w-12 h-7',
  lg: 'w-16 h-9',
}

export function HeroIcon({ hero, size = 'md', className }: HeroIconProps) {
  const url = heroIconUrl(hero)
  return (
    <div
      className={clsx(
        'overflow-hidden rounded-sm bg-border2 ring-1 ring-border',
        SIZE_CLASS[size],
        className,
      )}
      title={hero?.localized_name ?? ''}
    >
      {url && (
        <img
          src={url}
          alt={hero?.localized_name ?? ''}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  )
}
