import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'right',
      fullWidth = false,
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    // Variant styles
    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };

    // Size styles
    const sizeStyles = {
      sm: 'text-sm px-3 py-1.5 min-h-[36px]',
      md: 'text-base px-4 py-2 min-h-[44px]', // Mobile-friendly 44px touch target
      lg: 'text-lg px-6 py-3 min-h-[52px]',
    };

    // Width styles
    const widthStyles = fullWidth ? 'w-full' : '';

    // Icon margin (RTL support)
    const iconMargin = iconPosition === 'right' ? 'mr-2' : 'ml-2';

    // Loading spinner
    const spinner = (
      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
    );

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
        {...props}
      >
        {loading && spinner}
        {!loading && icon && iconPosition === 'left' && (
          <span className={iconMargin}>{icon}</span>
        )}
        {children}
        {!loading && icon && iconPosition === 'right' && (
          <span className={iconMargin}>{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
