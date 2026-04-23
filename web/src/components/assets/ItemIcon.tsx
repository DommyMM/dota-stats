import clsx from 'clsx'
import type { Item } from '../../api/types'
import { itemIconUrl } from '../../lib/dota'

type ItemIconProps = {
  item?: Item
  size?: 'sm' | 'md'
  className?: string
  title?: string
}

const SIZE: Record<NonNullable<ItemIconProps['size']>, string> = {
  sm: 'h-5 w-[26px]',
  md: 'h-6 w-[32px]',
}

export function ItemIcon({ item, size = 'md', className, title }: ItemIconProps) {
  const url = itemIconUrl(item?.name)
  return (
    <div
      className={clsx(
        'overflow-hidden rounded-sm bg-border2 ring-1 ring-border',
        SIZE[size],
        className,
      )}
      title={title ?? item?.name ?? ''}
    >
      {url && (
        <img
          src={url}
          alt={item?.name ?? ''}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  )
}
