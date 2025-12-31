import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      title,
      subtitle,
      actions,
      padding = 'md',
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    // Padding styles
    const paddingStyles = {
      none: 'p-0',
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={`bg-white rounded-lg shadow-sm border border-gray-200 ${paddingStyles[padding]} ${className}`}
        {...props}
      >
        {/* Header (if title or actions provided) */}
        {(title || actions) && (
          <div className="flex items-center justify-between mb-3">
            <div>
              {title && (
                <h3 className="text-base font-semibold text-gray-900">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
            {actions && <div>{actions}</div>}
          </div>
        )}

        {/* Content */}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
