'use client';

import { normalizePlatformName } from '../utils/helpers';

const PLATFORM_ICONS = {
  instagram: 'fa-instagram text-rose-400',
  tiktok: 'fa-tiktok text-teal-400',
  youtube: 'fa-youtube text-red-500',
};

export default function PlatformBadge({ platform }) {
  const name = normalizePlatformName(platform) || 'Unknown';
  const key = name.toLowerCase();
  const icon = PLATFORM_ICONS[key];
  const badgeClass = Object.hasOwn(PLATFORM_ICONS, key) ? `badge-platform-${key}` : 'badge-platform-unknown';

  return (
    <span className={`badge ${badgeClass} platform-badge-with-logo inline-flex items-center align-middle leading-tight py-[3.5px] px-2`}>
      <i
        aria-hidden="true"
        className={`${icon ? 'fa-brands' : 'fa-solid'} ${icon || 'fa-globe text-primary'} mr-[5px] text-[13px] align-middle`}
      />
      {name}
    </span>
  );
}
