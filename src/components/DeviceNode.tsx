import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { DeviceData, PortGroup, Port } from '../types/device';

const DeviceNode = ({ data, id }: NodeProps<DeviceData>) => {
  console.log('Device Node Data:', {
    nodeId: id,
    portGroups: data.portGroups.map(g => ({
      groupId: g.id,
      ports: g.ports.map(p => ({
        portId: p.id,
        portName: p.name,
        status: p.status
      }))
    }))
  });
  
  // 获取当前模式（从父组件传递或使用Context）
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  // 计算每列应该包含的端口组数量
  const totalGroups = data.portGroups.length;
  const groupsPerColumn = Math.ceil(totalGroups / 2);
  
  // 将端口组分成两列
  const leftColumn = data.portGroups.slice(0, groupsPerColumn);
  const rightColumn = data.portGroups.slice(groupsPerColumn);

  return (
    <div className={`flex shadow-md rounded-md ${
      isDarkMode 
        ? 'bg-gray-800/90 border-gray-600' 
        : 'bg-white/80 border-stone-400'
    } border-2`}>
      {/* 设备编号 - 左上角显示 */}
      <div className="absolute -top-6 -left-2 bg-gray-800 text-white px-2 py-0.5 rounded-full text-sm font-bold">
        设备{id}
      </div>

      {/* 端口组容器 - 两列布局 */}
      <div className="flex">
        {/* 左列 */}
        <div className={`flex flex-col border-r ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          {leftColumn.map((group) => (
            <div key={group.id} className="w-28 p-2">
              {/* 端口组名称 */}
              <div className={`text-sm font-bold text-center mb-2 ${
                isDarkMode 
                  ? 'bg-gray-700/90 text-white' 
                  : 'bg-gray-100/90 text-gray-900'
              } py-1 rounded`}>
                {group.name}
              </div>
              
              {/* 端口列表 */}
              <div className="flex flex-col gap-1">
                {group.ports.map((port: Port) => {
                  const portNumber = port.id.split('-').pop();
                  const handleId = `${group.id}-port-${portNumber}`;
                  
                  console.log('Handle ID:', {
                    fullId: `${id}-${handleId}`,
                    nodeId: id,
                    groupId: group.id,
                    portId: port.id,
                    portNumber,
                    handleId
                  });
                  
                  return (
                    <div
                      key={port.id}
                      className={`relative py-0.5 px-1 text-xs text-center rounded flex items-center ${
                        port.status === 'connected' 
                          ? isDarkMode
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-green-200/50 text-green-700'
                          : isDarkMode
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-red-200/50 text-red-700'
                      }`}
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
            <div key={group.id} className="w-28 p-2">
              {/* 端口组名称 */}
              <div className={`text-sm font-bold text-center mb-2 ${
                isDarkMode 
                  ? 'bg-gray-700/90 text-white' 
                  : 'bg-gray-100/90 text-gray-900'
              } py-1 rounded`}>
                {group.name}
              </div>
              
              {/* 端口列表 */}
              <div className="flex flex-col gap-1">
                {group.ports.map((port: Port) => {
                  const portNumber = port.id.split('-').pop();
                  const handleId = `${group.id}-port-${portNumber}`;
                  
                  return (
                    <div
                      key={port.id}
                      className={`relative py-0.5 px-1 text-xs text-center rounded flex items-center ${
                        port.status === 'connected' 
                          ? isDarkMode
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-green-200/50 text-green-700'
                          : isDarkMode
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-red-200/50 text-red-700'
                      }`}
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
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(DeviceNode); 