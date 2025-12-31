import { useState, useRef, useCallback } from 'react';

export interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // Minimum pull distance in px to trigger refresh
  resistance?: number; // How much to resist the pull (0-1, lower = more resistance)
}

export const usePullToRefresh = (options: UsePullToRefreshOptions) => {
  const {
    onRefresh,
    threshold = 80,
    resistance = 0.5
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const touchStart = useRef<number | null>(null);
  const scrollContainer = useRef<HTMLElement | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start tracking if we're at the top of the scroll container
    const target = e.currentTarget as HTMLElement;
    if (target.scrollTop === 0) {
      touchStart.current = e.touches[0].clientY;
      scrollContainer.current = target;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart.current === null || isRefreshing) return;

    const target = e.currentTarget as HTMLElement;
    const currentTouch = e.touches[0].clientY;
    const diff = currentTouch - touchStart.current;

    // Only allow pull down when at top of scroll
    if (diff > 0 && target.scrollTop === 0) {
      // Apply resistance to the pull
      const distance = Math.min(diff * resistance, threshold * 1.5);
      setPullDistance(distance);

      // Prevent default scrolling behavior when pulling
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [isRefreshing, resistance, threshold]);

  const onTouchEnd = useCallback(async () => {
    if (touchStart.current === null || isRefreshing) return;

    // If pulled beyond threshold, trigger refresh
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Error refreshing:', error);
      } finally {
        setIsRefreshing(false);
      }
    }

    // Reset
    setPullDistance(0);
    touchStart.current = null;
    scrollContainer.current = null;
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);

  return {
    isRefreshing,
    pullDistance,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    handleRefresh
  };
};
