import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { DeviceData, PortGroup, Port, CustomAttribute } from '../types/device';
import AttributesTooltip from './AttributesTooltip';
import AttributesEditor from './AttributesEditor';
import useStore from '../store/useStore';
import ReactDOM from 'react-dom';

const DeviceNode = ({ data, id, selected }: NodeProps<DeviceData>) => {
  const updateNodeData = useStore((state: any) => state.updateNodeData);
  
  // 获取当前模式（从父组件传递或使用Context）
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  // --- 精确的悬停状态 --- 
  const [hoveredDeviceTitle, setHoveredDeviceTitle] = useState(false); // 悬停在设备标题
  const [hoveredGroupTitle, setHoveredGroupTitle] = useState<string | null>(null); // 悬停在端口组标题
  const [hoveredPortElement, setHoveredPortElement] = useState<string | null>(null); // 悬停在端口元素
  
  // 编辑状态
  const [editingDeviceAttrs, setEditingDeviceAttrs] = useState(false);
  const [editingGroupAttrs, setEditingGroupAttrs] = useState<string | null>(null);
  const [editingPortAttrs, setEditingPortAttrs] = useState<string | null>(null);
  
  // 鼠标位置
  const [mousePosition, setMousePosition] = useState<{x: number, y: number} | null>(null);
  // 添加防抖动处理，避免频繁更新鼠标位置
  const mousePositionRef = useRef<{x: number, y: number} | null>(null);
  
  // 延迟预览的定时器
  const deviceTitleTimerRef = useRef<number | null>(null);
  const groupTitleTimerRef = useRef<number | null>(null);
  const portElementTimerRef = useRef<number | null>(null);
  
  // 清除所有定时器的辅助函数
  const clearAllTimers = () => {
    if (deviceTitleTimerRef.current) {
      window.clearTimeout(deviceTitleTimerRef.current);
      deviceTitleTimerRef.current = null;
    }
    
    if (groupTitleTimerRef.current) {
      window.clearTimeout(groupTitleTimerRef.current);
      groupTitleTimerRef.current = null;
    }
    
    if (portElementTimerRef.current) {
      window.clearTimeout(portElementTimerRef.current);
      portElementTimerRef.current = null;
    }
  };
  
  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);
  
  // 计算每列应该包含的端口组数量
  const totalGroups = data.portGroups.length;
  const groupsPerColumn = Math.ceil(totalGroups / 2);
  
  // 将端口组分成两列
  const leftColumn = data.portGroups.slice(0, groupsPerColumn);
  const rightColumn = data.portGroups.slice(groupsPerColumn);

  // 更新设备属性
  const handleSaveDeviceAttributes = useCallback((attributes: CustomAttribute[]) => {
    const updatedData = {
      ...data,
      customAttributes: attributes
    };
    updateNodeData(id, updatedData);
    setEditingDeviceAttrs(false);
  }, [data, id, updateNodeData]);

  // 更新端口组属性
  const handleSaveGroupAttributes = useCallback((groupId: string, attributes: CustomAttribute[]) => {
    const updatedData = {
      ...data,
      portGroups: data.portGroups.map(group => 
        group.id === groupId
          ? { ...group, customAttributes: attributes }
          : group
      )
    };
    updateNodeData(id, updatedData);
    setEditingGroupAttrs(null);
  }, [data, id, updateNodeData]);

  // 更新端口属性
  const handleSavePortAttributes = useCallback((groupId: string, portId: string, attributes: CustomAttribute[]) => {
    const updatedData = {
      ...data,
      portGroups: data.portGroups.map(group => 
        group.id === groupId
          ? {
              ...group,
              ports: group.ports.map(port => 
                port.id === portId
                  ? { ...port, customAttributes: attributes }
                  : port
              )
            }
          : group
      )
    };
    updateNodeData(id, updatedData);
    setEditingPortAttrs(null);
  }, [data, id, updateNodeData]);

  // 鼠标移动时节流处理，减少状态更新频率
  const handleMouseMove = (e: React.MouseEvent) => {
    // 更新引用中的位置（不会触发重渲染）
    mousePositionRef.current = {
      x: e.clientX,
      y: e.clientY
    };
    
    // 只有当鼠标位置显著变化时才更新状态（节流处理）
    if (mousePosition) {
      const dx = Math.abs(e.clientX - mousePosition.x);
      const dy = Math.abs(e.clientY - mousePosition.y);
      
      // 只有当鼠标移动超过阈值时才更新位置（减少更新频率，提高性能）
      if (dx < 20 && dy < 20) {
        return; // 忽略微小的移动
      }
    }
    
    // 显著变化时才更新状态，触发重渲染
    setMousePosition({
      x: e.clientX,
      y: e.clientY
    });
  };

  // 处理设备标题的鼠标进入事件，减少延迟
  const handleDeviceTitleEnter = () => {
    // 如果已经显示了预览，则不需要再触发
    if (hoveredDeviceTitle) return;
    
    // 清除之前的所有定时器
    clearAllTimers();
    
    // 确保没有其他元素的预览正在显示
    setHoveredGroupTitle(null);
    setHoveredPortElement(null);
    
    // 设置一个新的延迟，减少等待时间以提高响应性
    deviceTitleTimerRef.current = window.setTimeout(() => {
      setHoveredDeviceTitle(true);
    }, 300);
  };

  // 处理端口组标题的鼠标进入事件，减少延迟
  const handleGroupTitleEnter = (groupId: string) => {
    // 如果已经显示了这个组的预览，则不需要再触发
    if (hoveredGroupTitle === groupId) return;
    
    // 清除之前的所有定时器
    clearAllTimers();
    
    // 清除其他预览
    setHoveredDeviceTitle(false);
    setHoveredPortElement(null);
    
    // 设置一个新的延迟，减少等待时间以提高响应性
    groupTitleTimerRef.current = window.setTimeout(() => {
      setHoveredGroupTitle(groupId);
    }, 300);
  };

  // 处理端口元素的鼠标进入事件，减少延迟
  const handlePortElementEnter = (portId: string) => {
    // 如果已经显示了这个端口的预览，则不需要再触发
    if (hoveredPortElement === portId) return;
    
    // 清除之前的所有定时器
    clearAllTimers();
    
    // 清除其他预览
    setHoveredDeviceTitle(false);
    setHoveredGroupTitle(null);
    
    // 设置一个新的延迟，减少等待时间以提高响应性
    portElementTimerRef.current = window.setTimeout(() => {
      setHoveredPortElement(portId);
    }, 300);
  };

  // 鼠标离开时清除位置和状态
  const handleMouseLeave = () => {
    clearAllTimers();
    setMousePosition(null);
    mousePositionRef.current = null;
    setHoveredDeviceTitle(false);
    setHoveredGroupTitle(null);
    setHoveredPortElement(null);
  };

  // 设备标题离开处理
  const handleDeviceTitleLeave = () => {
    // 清除定时器
    if (deviceTitleTimerRef.current) {
      window.clearTimeout(deviceTitleTimerRef.current);
      deviceTitleTimerRef.current = null;
    }
    
    // 延迟少量时间后清除状态，避免在悬停时意外清除
    setTimeout(() => {
      setHoveredDeviceTitle(false);
    }, 50);
  };

  // 端口组标题离开处理
  const handleGroupTitleLeave = () => {
    // 清除定时器
    if (groupTitleTimerRef.current) {
      window.clearTimeout(groupTitleTimerRef.current);
      groupTitleTimerRef.current = null;
    }
    
    // 延迟少量时间后清除状态，避免在悬停时意外清除
    setTimeout(() => {
      setHoveredGroupTitle(null);
    }, 50);
  };

  // 端口元素离开处理
  const handlePortElementLeave = () => {
    // 清除定时器
    if (portElementTimerRef.current) {
      window.clearTimeout(portElementTimerRef.current);
      portElementTimerRef.current = null;
    }
    
    // 延迟少量时间后清除状态，避免在悬停时意外清除
    setTimeout(() => {
      setHoveredPortElement(null);
    }, 50);
  };

  // 根据设备类型返回对应的颜色配置
  const getDeviceTypeColors = (deviceType: string) => {
    switch (deviceType) {
      case 'DavidV100': // NPU芯片
        return {
          bgColor: isDarkMode ? 'bg-purple-900' : 'bg-purple-700',
          labelBgColor: 'bg-purple-400',
          labelTextColor: 'text-purple-900',
          textColor: 'text-white'
        };
      case 'Hi1650V100': // CPU芯片
        return {
          bgColor: isDarkMode ? 'bg-blue-900' : 'bg-blue-700',
          labelBgColor: 'bg-blue-400',
          labelTextColor: 'text-blue-900',
          textColor: 'text-white'
        };
      case 'UnionsV100': // Switch芯片
        return {
          bgColor: isDarkMode ? 'bg-green-900' : 'bg-green-700',
          labelBgColor: 'bg-green-400',
          labelTextColor: 'text-green-900',
          textColor: 'text-white'
        };
      default: // 未知类型
        return {
          bgColor: isDarkMode ? 'bg-gray-800' : 'bg-gray-700',
          labelBgColor: 'bg-yellow-500',
          labelTextColor: 'text-black',
          textColor: 'text-white'
        };
    }
  };
  
  // 获取当前设备的颜色配置
  const deviceColors = getDeviceTypeColors(data.type);

  return (
    <>
      <div 
        className={`flex shadow-md rounded-md ${
          isDarkMode 
            ? 'bg-gray-800/90 border-gray-600' 
            : 'bg-white/80 border-stone-400'
        } ${
          selected 
            ? `border-3 border-blue-500 shadow-md ${isDarkMode ? 'shadow-blue-500/20' : 'shadow-blue-500/30'} ring-1 ring-blue-300 ring-offset-1 z-10 scale-[1.02] transition-all duration-150` 
            : 'border-2'
        }`}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onDoubleClick={() => setEditingDeviceAttrs(true)}
      >
        {/* 设备标题 - 上方显示设备名称和类型 */}
        <div 
          className={`absolute -top-7 left-0 right-0 flex items-center justify-center cursor-pointer ${
            hoveredDeviceTitle ? 'ring-2 ring-blue-500 ring-offset-1' : ''
          } ${selected ? 'scale-[1.03]' : ''}`}
          onMouseEnter={handleDeviceTitleEnter}
          onMouseLeave={handleDeviceTitleLeave}
          onMouseMove={handleMouseMove}
        >
          <div className={`${deviceColors.bgColor} ${deviceColors.textColor} px-2.5 py-1 rounded-md text-sm font-bold flex gap-1.5 items-center ${selected ? 'ring-1 ring-white/70' : ''}`}>
            <span className={`${deviceColors.labelBgColor} ${deviceColors.labelTextColor} px-1.5 py-0.5 rounded text-xs`}>
              {data.label || `设备-${id.split('-').pop()}`}
            </span>
            <span>{data.type || '未知类型'}</span>
            {data.customAttributes && data.customAttributes.length > 0 && (
              <span className="bg-blue-500 text-white text-xs px-1 py-0.5 rounded-full">
                {data.customAttributes.length}
              </span>
            )}
          </div>
        </div>

        {/* 设备属性气泡：仅在悬停设备标题时显示 */}
        {hoveredDeviceTitle && data.customAttributes && data.customAttributes.length > 0 && (
          <AttributesTooltip 
            attributes={data.customAttributes} 
            title={`${data.label} 属性`}
            isDarkMode={isDarkMode}
            position={mousePositionRef.current || undefined}
            onClose={() => setHoveredDeviceTitle(false)}
          />
        )}

        {/* 端口组容器 - 两列布局 */}
        <div className="flex">
          {/* 左列 */}
          <div className={`flex flex-col border-r ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
            {leftColumn.map((group) => (
              <div 
                key={group.id} 
                className="w-28 p-2 relative"
              >
                {/* 端口组名称区域 */}
                <div 
                  className={`text-sm font-bold text-center mb-2 ${
                    isDarkMode 
                      ? 'bg-gray-700/90 text-white' 
                      : 'bg-gray-100/90 text-gray-900'
                  } py-1 rounded flex items-center justify-center cursor-pointer ${
                    hoveredGroupTitle === group.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                  } ${selected ? 'bg-opacity-80 ring-1 ring-blue-300' : ''}`}
                  onMouseEnter={() => handleGroupTitleEnter(group.id)}
                  onMouseLeave={handleGroupTitleLeave}
                  onMouseMove={handleMouseMove}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingGroupAttrs(group.id);
                  }}
                >
                  <span>{group.name}</span>
                  {group.customAttributes && group.customAttributes.length > 0 && (
                    <span className="bg-green-500 text-white text-xs px-1 ml-1 rounded-full">
                      {group.customAttributes.length}
                    </span>
                  )}
                </div>
                
                {/* 端口组属性气泡：仅在悬停端口组标题时显示 */}
                {hoveredGroupTitle === group.id && group.customAttributes && group.customAttributes.length > 0 && (
                  <AttributesTooltip 
                    attributes={group.customAttributes} 
                    title={`${group.name} 属性`}
                    isDarkMode={isDarkMode}
                    position={mousePositionRef.current || undefined}
                    onClose={() => setHoveredGroupTitle(null)}
                  />
                )}
                
                {/* 端口列表 */}
                <div className="flex flex-col gap-1">
                  {group.ports.map((port: Port) => {
                    const portNumber = port.id.split('-').pop();
                    const handleId = `${group.id}-port-${portNumber}`;
                    
                    return (
                      <div
                        key={port.id}
                        className={`relative py-0.5 px-1 text-xs text-center rounded flex items-center cursor-pointer ${
                          port.status === 'connected' 
                            ? isDarkMode
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-green-200/50 text-green-700'
                            : isDarkMode
                              ? 'bg-red-900/50 text-red-300'
                              : 'bg-red-200/50 text-red-700'
                        } ${
                          hoveredPortElement === port.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                        } ${
                          selected ? 'ring-1 ring-blue-300 brightness-110' : ''
                        }`}
                        onMouseEnter={() => handlePortElementEnter(port.id)}
                        onMouseLeave={handlePortElementLeave}
                        onMouseMove={handleMouseMove}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingPortAttrs(port.id);
                        }}
                      >
                        <Handle
                          type="target"
                          position={Position.Left}
                          id={handleId}
                          className={`!w-4 !h-4 !min-w-[16px] !min-h-[16px] ${
                            port.status === 'connected' 
                              ? '!bg-green-500/80' 
                              : '!bg-red-500/80'
                          } ${selected ? '!ring-1 !ring-blue-300 !brightness-125' : ''}`}
                          style={{ left: '-8px' }}
                        />
                        <Handle
                          type="source"
                          position={Position.Left}
                          id={handleId}
                          className={`!w-4 !h-4 !min-w-[16px] !min-h-[16px] ${
                            port.status === 'connected' 
                              ? '!bg-green-500/80' 
                              : '!bg-red-500/80'
                          } ${selected ? '!ring-1 !ring-blue-300 !brightness-125' : ''}`}
                          style={{ left: '-8px' }}
                        />
                        <span className="flex-grow text-[11px]">{port.name}</span>
                        {port.customAttributes && port.customAttributes.length > 0 && (
                          <span className="bg-purple-500 text-white text-[8px] px-0.5 ml-0.5 rounded-full">
                            {port.customAttributes.length}
                          </span>
                        )}
                        
                        {/* 端口属性气泡：仅在悬停端口元素时显示 */}
                        {hoveredPortElement === port.id && port.customAttributes && port.customAttributes.length > 0 && (
                          <AttributesTooltip 
                            attributes={port.customAttributes} 
                            title={`${port.name} 属性`}
                            isDarkMode={isDarkMode}
                            position={mousePositionRef.current || undefined}
                            onClose={() => setHoveredPortElement(null)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 右列 */}
          <div className="flex flex-col">
            {rightColumn.map((group) => (
              <div 
                key={group.id} 
                className="w-28 p-2 relative"
              >
                {/* 端口组名称区域 */}
                <div 
                  className={`text-sm font-bold text-center mb-2 ${
                    isDarkMode 
                      ? 'bg-gray-700/90 text-white' 
                      : 'bg-gray-100/90 text-gray-900'
                  } py-1 rounded flex items-center justify-center cursor-pointer ${
                    hoveredGroupTitle === group.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                  } ${selected ? 'bg-opacity-80 ring-1 ring-blue-300' : ''}`}
                  onMouseEnter={() => handleGroupTitleEnter(group.id)}
                  onMouseLeave={handleGroupTitleLeave}
                  onMouseMove={handleMouseMove}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingGroupAttrs(group.id);
                  }}
                >
                  <span>{group.name}</span>
                  {group.customAttributes && group.customAttributes.length > 0 && (
                    <span className="bg-green-500 text-white text-xs px-1 ml-1 rounded-full">
                      {group.customAttributes.length}
                    </span>
                  )}
                </div>
                
                {/* 端口组属性气泡 */}
                {hoveredGroupTitle === group.id && group.customAttributes && group.customAttributes.length > 0 && (
                  <AttributesTooltip 
                    attributes={group.customAttributes} 
                    title={`${group.name} 属性`}
                    isDarkMode={isDarkMode}
                    position={mousePositionRef.current || undefined}
                    onClose={() => setHoveredGroupTitle(null)}
                  />
                )}
                
                {/* 端口列表 */}
                <div className="flex flex-col gap-1">
                  {group.ports.map((port: Port) => {
                    const portNumber = port.id.split('-').pop();
                    const handleId = `${group.id}-port-${portNumber}`;
                    
                    return (
                      <div
                        key={port.id}
                        className={`relative py-0.5 px-1 text-xs text-center rounded flex items-center cursor-pointer ${
                          port.status === 'connected' 
                            ? isDarkMode
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-green-200/50 text-green-700'
                            : isDarkMode
                              ? 'bg-red-900/50 text-red-300'
                              : 'bg-red-200/50 text-red-700'
                        } ${
                          hoveredPortElement === port.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                        } ${
                          selected ? 'ring-1 ring-blue-300 brightness-110' : ''
                        }`}
                        onMouseEnter={() => handlePortElementEnter(port.id)}
                        onMouseLeave={handlePortElementLeave}
                        onMouseMove={handleMouseMove}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingPortAttrs(port.id);
                        }}
                      >
                        <Handle
                          type="target"
                          position={Position.Right}
                          id={handleId}
                          className={`!w-4 !h-4 !min-w-[16px] !min-h-[16px] ${
                            port.status === 'connected' 
                              ? '!bg-green-500/80' 
                              : '!bg-red-500/80'
                          } ${selected ? '!ring-1 !ring-blue-300 !brightness-125' : ''}`}
                          style={{ right: '-8px' }}
                        />
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={handleId}
                          className={`!w-4 !h-4 !min-w-[16px] !min-h-[16px] ${
                            port.status === 'connected' 
                              ? '!bg-green-500/80' 
                              : '!bg-red-500/80'
                          } ${selected ? '!ring-1 !ring-blue-300 !brightness-125' : ''}`}
                          style={{ right: '-8px' }}
                        />
                        <span className="flex-grow text-[11px]">{port.name}</span>
                        {port.customAttributes && port.customAttributes.length > 0 && (
                          <span className="bg-purple-500 text-white text-[8px] px-0.5 ml-0.5 rounded-full">
                            {port.customAttributes.length}
                          </span>
                        )}
                        
                        {/* 端口属性气泡 */}
                        {hoveredPortElement === port.id && port.customAttributes && port.customAttributes.length > 0 && (
                          <AttributesTooltip 
                            attributes={port.customAttributes} 
                            title={`${port.name} 属性`}
                            isDarkMode={isDarkMode}
                            position={mousePositionRef.current || undefined}
                            onClose={() => setHoveredPortElement(null)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 设备属性编辑对话框 */}
      {editingDeviceAttrs && (
        <AttributesEditor
          attributes={data.customAttributes || []}
          onSave={handleSaveDeviceAttributes}
          onCancel={() => setEditingDeviceAttrs(false)}
          isDarkMode={isDarkMode}
          title={`编辑设备 "${data.label}" 的属性`}
          elementType="device"
          deviceData={data}
        />
      )}

      {/* 端口组属性编辑对话框 */}
      {editingGroupAttrs && (
        <AttributesEditor
          attributes={data.portGroups.find(g => g.id === editingGroupAttrs)?.customAttributes || []}
          onSave={(attrs) => handleSaveGroupAttributes(editingGroupAttrs, attrs)}
          onCancel={() => setEditingGroupAttrs(null)}
          isDarkMode={isDarkMode}
          title={`编辑端口组 "${data.portGroups.find(g => g.id === editingGroupAttrs)?.name}" 的属性`}
          elementType="portGroup"
          deviceData={data}
          portGroup={data.portGroups.find(g => g.id === editingGroupAttrs)}
        />
      )}

      {/* 端口属性编辑对话框 */}
      {editingPortAttrs && (() => {
        // 在所有端口组中查找匹配的端口
        let targetPort: Port | undefined;
        let targetGroup: PortGroup | undefined;
        
        // 查找包含指定端口的端口组
        for (const group of data.portGroups) {
          const port = group.ports.find(p => p.id === editingPortAttrs);
          if (port) {
            targetPort = port;
            targetGroup = group;
            break;
          }
        }
        
        // 如果找到了端口和端口组，则显示编辑器
        if (targetPort && targetGroup) {
          return (
            <AttributesEditor
              attributes={targetPort.customAttributes || []}
              onSave={(attrs) => handleSavePortAttributes(targetGroup.id, targetPort.id, attrs)}
              onCancel={() => setEditingPortAttrs(null)}
              isDarkMode={isDarkMode}
              title={`编辑端口 "${targetPort.name}" 的属性`}
              elementType="port"
              deviceData={data}
              portGroup={targetGroup}
              port={targetPort}
            />
          );
        }
        
        return null;
      })()}
    </>
  );
};

export default memo(DeviceNode); 