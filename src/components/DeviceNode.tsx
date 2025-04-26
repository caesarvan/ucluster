import { memo, useState, useCallback, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { DeviceData, PortGroup, Port, CustomAttribute } from '../types/device';
import AttributesTooltip from './AttributesTooltip';
import AttributesEditor from './AttributesEditor';
import useStore from '../store/useStore';

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

  // 鼠标移动时更新位置
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({
      x: e.clientX,
      y: e.clientY
    });
  };

  // 鼠标离开时清除位置
  const handleMouseLeave = () => {
    setMousePosition(null);
    setHoveredDeviceTitle(false);
    setHoveredGroupTitle(null);
    setHoveredPortElement(null);
  };

  return (
    <>
      <div 
        className={`flex shadow-md rounded-md ${
          isDarkMode 
            ? 'bg-gray-800/90 border-gray-600' 
            : 'bg-white/80 border-stone-400'
        } ${selected ? 'border-blue-500' : 'border-2'}`}
        onMouseEnter={() => setHoveredDeviceTitle(true)}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onDoubleClick={() => setEditingDeviceAttrs(true)}
      >
        {/* 设备标题 - 上方显示设备名称和类型 */}
        <div 
          className="absolute -top-7 left-0 right-0 flex items-center justify-center cursor-pointer"
          onMouseEnter={() => setHoveredDeviceTitle(true)}
          onMouseLeave={() => setHoveredDeviceTitle(false)}
        >
          <div className="bg-gray-800 text-white px-2.5 py-1 rounded-md text-sm font-bold flex gap-1.5 items-center">
            <span className="bg-yellow-500 text-black px-1.5 py-0.5 rounded text-xs">
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
            position={mousePosition || undefined}
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
                  } py-1 rounded flex items-center justify-center cursor-pointer`}
                  onMouseEnter={() => setHoveredGroupTitle(group.id)}
                  onMouseLeave={() => setHoveredGroupTitle(null)}
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
                    position={mousePosition || undefined}
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
                        }`}
                        onMouseEnter={() => setHoveredPortElement(port.id)}
                        onMouseLeave={() => setHoveredPortElement(null)}
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
                          }`}
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
                          }`}
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
                            position={mousePosition || undefined}
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
                  } py-1 rounded flex items-center justify-center cursor-pointer`}
                  onMouseEnter={() => setHoveredGroupTitle(group.id)}
                  onMouseLeave={() => setHoveredGroupTitle(null)}
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
                    position={mousePosition || undefined}
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
                        }`}
                        onMouseEnter={() => setHoveredPortElement(port.id)}
                        onMouseLeave={() => setHoveredPortElement(null)}
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
                          }`}
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
                          }`}
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
                            position={mousePosition || undefined}
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
        />
      )}

      {/* 端口属性编辑对话框 */}
      {editingPortAttrs && (
        (() => {
          // 找到端口及其所属的端口组
          let foundPort: Port | null = null;
          let foundGroup: PortGroup | null = null;
          
          data.portGroups.forEach(group => {
            const port = group.ports.find(p => p.id === editingPortAttrs);
            if (port) {
              foundPort = port as Port;
              foundGroup = group as PortGroup;
            }
          });
          
          if (foundPort && foundGroup) {
            return (
              <AttributesEditor
                attributes={foundPort.customAttributes || []}
                onSave={(attrs) => handleSavePortAttributes(foundGroup!.id, foundPort!.id, attrs)}
                onCancel={() => setEditingPortAttrs(null)}
                isDarkMode={isDarkMode}
                title={`编辑端口 "${foundPort.name}" 的属性`}
              />
            );
          }
          
          return null;
        })()
      )}
    </>
  );
};

export default memo(DeviceNode); 