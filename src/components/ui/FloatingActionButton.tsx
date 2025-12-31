import React from 'react';

export interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  ariaLabel?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  position = 'bottom-right',
  ariaLabel = 'Action',
  className = '',
  disabled,
  ...props
}) => {
  // Position styles (RTL-aware)
  const positionStyles = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
  };

  return (
    <button
      className={`
        fixed ${positionStyles[position]}
        w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg
        hover:bg-blue-700 active:scale-95
        transition-all duration-200
        flex items-center justify-center
        z-40
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
      aria-label={ariaLabel}
      disabled={disabled}
      {...props}
    >
      {icon}
    </button>
  );
};
