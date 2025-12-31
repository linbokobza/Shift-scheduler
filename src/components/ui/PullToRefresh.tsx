import React from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

export interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80
}) => {
  const {
    isRefreshing,
    pullDistance,
    onTouchStart,
    onTouchMove,
    onTouchEnd
  } = usePullToRefresh({ onRefresh, threshold });

  // Calculate rotation based on pull distance
  const rotation = Math.min((pullDistance / threshold) * 360, 360);

  // Show refresh indicator when pulled or refreshing
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div
      className="relative overflow-auto"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {showIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex justify-center items-center transition-opacity"
          style={{
            height: `${Math.min(pullDistance, threshold)}px`,
            opacity: pullDistance / threshold
          }}
        >
          <div className="bg-white rounded-full p-2 shadow-md">
            <RefreshCw
              className={`w-5 h-5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{
                transform: isRefreshing ? 'none' : `rotate(${rotation}deg)`
              }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: `translateY(${Math.min(pullDistance * 0.5, threshold * 0.5)}px)`,
          transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};
