import { useState, useRef } from 'react';

export interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
  threshold?: number; // Minimum distance in px for swipe to register
}

export const useSwipe = (options: UseSwipeOptions) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeDown,
    onSwipeUp,
    threshold = 50
  } = options;

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null; // Reset touch end
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if this is a horizontal or vertical swipe
    // Horizontal swipe (|deltaX| > |deltaY|)
    if (absDeltaX > absDeltaY && absDeltaX > threshold) {
      if (deltaX > 0) {
        // Swipe right
        onSwipeRight?.();
      } else {
        // Swipe left
        onSwipeLeft?.();
      }
    }
    // Vertical swipe (|deltaY| > |deltaX|)
    else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
      if (deltaY > 0) {
        // Swipe down
        onSwipeDown?.();
      } else {
        // Swipe up
        onSwipeUp?.();
      }
    }

    // Reset
    touchStart.current = null;
    touchEnd.current = null;
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};
