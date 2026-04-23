import clsx from 'clsx'
import type { Ability } from '../../api/types'
import { abilityIconUrl } from '../../lib/dota'

type AbilityIconProps = {
  ability?: Ability
  size?: 'sm' | 'md'
  className?: string
  title?: string
}

const SIZE: Record<NonNullable<AbilityIconProps['size']>, string> = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
}

export function AbilityIcon({ ability, size = 'md', className, title }: AbilityIconProps) {
  const url = abilityIconUrl(ability?.name)
  return (
    <div
      className={clsx(
        'overflow-hidden rounded-sm bg-border2 ring-1 ring-border',
        SIZE[size],
        ability?.is_ultimate && 'ring-gold/70',
        className,
      )}
      title={title ?? ability?.name ?? ''}
    >
      {url && (
        <img
          src={url}
          alt={ability?.name ?? ''}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  )
}
