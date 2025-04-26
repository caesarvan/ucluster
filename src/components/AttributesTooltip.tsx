import React, { useRef, useEffect, useState, memo } from 'react';
import ReactDOM from 'react-dom';
import { CustomAttribute } from '../types/device';

interface AttributesTooltipProps {
  attributes: CustomAttribute[];
  title?: string;
  isDarkMode: boolean;
  position?: { x: number, y: number };
  onClose?: () => void;
}

// 创建一个单例容器
const getTooltipContainer = (() => {
  let container: HTMLDivElement | null = null;
  
  return () => {
    if (!container) {
      container = document.createElement('div');
      container.className = 'tooltip-container';
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.zIndex = '9999';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }
    return container;
  };
})();

// 内部渲染组件，使用memo避免不必要的重渲染
const TooltipContent = memo(({ 
  attributes, 
  title, 
  isDarkMode, 
  position 
}: Omit<AttributesTooltipProps, 'onClose'>) => {
  // 没有属性或位置时不渲染
  if (!attributes || attributes.length === 0 || !position) return null;
  
  const style = {
    position: 'fixed' as const,
    left: position.x,
    top: position.y - 20,
    transform: 'translateX(-50%)',
    zIndex: 9999,
  };

  return (
    <div 
      className={`fixed ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} shadow-lg rounded-md p-3 min-w-48 max-w-xs z-[9999]`}
      style={style}
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
});

// 记录最后一次有效的位置，用于减少渲染
let lastValidPosition: { x: number, y: number } | undefined = undefined;

const AttributesTooltip: React.FC<AttributesTooltipProps> = (props) => {
  // 获取DOM容器
  const containerRef = useRef<HTMLDivElement | null>(null);
  if (!containerRef.current) {
    containerRef.current = getTooltipContainer();
  }
  
  // 使用状态来强制更新，但只在位置变化显著时
  const [stablePosition, setStablePosition] = useState(props.position);
  
  useEffect(() => {
    const { position } = props;
    if (!position) return;
    
    // 只有当位置变化显著或首次设置时才更新位置
    if (!lastValidPosition || 
        Math.abs(position.x - lastValidPosition.x) > 20 || 
        Math.abs(position.y - lastValidPosition.y) > 20) {
      lastValidPosition = position;
      setStablePosition(position);
    }
  }, [props.position]);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 组件卸载时的清理逻辑
    };
  }, []);
  
  if (!props.attributes || props.attributes.length === 0 || !containerRef.current) {
    return null;
  }
  
  // 使用稳定的位置，而不是原始位置
  const renderProps = {
    ...props,
    position: stablePosition
  };
  
  return ReactDOM.createPortal(
    <TooltipContent {...renderProps} />, 
    containerRef.current
  );
};

export default memo(AttributesTooltip); 