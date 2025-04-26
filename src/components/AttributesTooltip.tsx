import React from 'react';
import ReactDOM from 'react-dom';
import { CustomAttribute } from '../types/device';

interface AttributesTooltipProps {
  attributes: CustomAttribute[];
  title?: string;
  isDarkMode: boolean;
  position?: { x: number, y: number };
}

const AttributesTooltip: React.FC<AttributesTooltipProps> = ({ 
  attributes, 
  title,
  isDarkMode,
  position
}) => {
  if (!attributes || attributes.length === 0) return null;

  // 计算tooltip的位置，如果提供了position属性，则使用绝对定位
  // 否则保持之前的相对定位（用于向上偏移的情况）
  const tooltipStyle = position ? {
    position: 'fixed' as const,
    left: position.x,
    top: position.y - 20, // 向上偏移一点，避免遮挡
    transform: 'translateX(-50%)',
    zIndex: 9999
  } : {
    transform: 'translateY(-100%)'
  };

  const tooltipContent = (
    <div 
      className={`${position ? 'fixed' : 'absolute'} ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg rounded-md p-3 min-w-48 max-w-xs z-[9999]`}
      style={tooltipStyle}
    >
      {title && (
        <div className={`font-bold mb-2 pb-1 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'} border-b`}>
          {title}
        </div>
      )}
      <div className="max-h-52 overflow-y-auto">
        {attributes.map(attr => (
          <div key={attr.id} className="mb-1 last:mb-0 text-sm">
            <span className="font-medium">{attr.name}: </span>
            <span className={attr.type === 'number' ? 'text-blue-500' : 'text-green-500'}>
              {attr.value.toString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  // 如果提供了position，使用portal将tooltip渲染到body
  // 否则在当前位置正常渲染
  return position 
    ? ReactDOM.createPortal(tooltipContent, document.body)
    : tooltipContent;
};

export default AttributesTooltip; 