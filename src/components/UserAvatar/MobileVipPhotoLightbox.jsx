import { useEffect, useState } from 'react';
import ImageLightbox from '../PostFeed/ImageLightbox';
import { shouldShowProfileVipVisual } from '../../utils/shouldShowOwnProfileVipVisual';
import { useTouchAvatarUx } from '../../utils/isTouchAvatarUx';

export const VIP_BADGE_SRC = '/vip/badge.png';

/**
 * Mobile/touch VIP profile photo viewer: photo ⇄ badge via existing ImageLightbox swipe.
 * Renders nothing on desktop / non-VIP so the original overlay stays 1:1.
 */
export default function MobileVipPhotoLightbox({
  user,
  photoUrl,
  isOpen,
  onClose,
  vipVisual,
}) {
  const touchUx = useTouchAvatarUx();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (isOpen) setIndex(0);
  }, [isOpen, photoUrl]);

  const showVip = typeof vipVisual === 'boolean' ? vipVisual : shouldShowProfileVipVisual(user);

  if (!isOpen || !photoUrl || !showVip || !touchUx) {
    return null;
  }

  const images = [photoUrl, VIP_BADGE_SRC];

  return (
    <ImageLightbox
      isOpen
      images={images}
      index={index}
      indicator="dots"
      onClose={onClose}
      onPrev={() => setIndex((i) => (i === 0 ? 1 : 0))}
      onNext={() => setIndex((i) => (i === 1 ? 0 : 1))}
    />
  );
}
