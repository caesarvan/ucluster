import React from 'react';

interface ActionButtonProps {
  onClick: () => void;
  label: string;
  loading?: boolean;
  disabled?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isDarkMode: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  label,
  loading = false,
  disabled = false,
  color = 'primary',
  size = 'sm',
  icon,
  isDarkMode
}) => {
  // 根据颜色设置不同的样式
  const getColorClass = () => {
    switch (color) {
      case 'success':
        return `${isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'}`;
      case 'warning':
        return `${isDarkMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-yellow-500 hover:bg-yellow-600'}`;
      case 'danger':
        return `${isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'}`;
      case 'primary':
      default:
        return `${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`;
    }
  };

  // 根据大小设置不同的样式
  const getSizeClass = () => {
    switch (size) {
      case 'lg':
        return 'px-4 py-2 text-base';
      case 'md':
        return 'px-3 py-1.5 text-sm';
      case 'sm':
      default:
        return 'px-2 py-1 text-xs';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${getColorClass()}
        ${getSizeClass()}
        text-white font-medium rounded
        transition duration-150 ease-in-out
        flex items-center justify-center gap-1
        ${(disabled && !loading) ? 'opacity-50 cursor-not-allowed' : ''}
        ${loading ? 'relative cursor-wait' : ''}
      `}
    >
      {loading ? (
        <>
          <span className="opacity-0">{label}</span>
          <span className="absolute inset-0 flex items-center justify-center">
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
        </>
      ) : (
        <>
          {icon && <span>{icon}</span>}
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

export default ActionButton; 