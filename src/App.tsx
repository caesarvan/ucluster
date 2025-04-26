import { useCallback, useState, useEffect, useRef } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge,
  NodeChange,
  EdgeChange,
  addEdge,
  Connection,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider,
  MarkerType,
  ConnectionLineType,
  useReactFlow,
  EdgeTypes,
  getBezierPath,
  EdgeProps,
  Position,
  SelectionMode,
  OnSelectionChangeParams,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';
import useStore from './store/useStore';
import DeviceNode from './components/DeviceNode';
import { createDefaultDeviceData, defaultDeviceTemplates, DeviceTemplate, createDeviceFromTemplate } from './types/device';
import dagre from 'dagre';
import { shallow } from 'zustand/shallow';

const nodeTypes = {
  device: DeviceNode,
};

// 预设12种颜色
const EDGE_COLORS = [
  '#FF0000', // 红色
  '#00FF00', // 绿色
  '#0000FF', // 蓝色
  '#FFFF00', // 黄色
  '#FF00FF', // 品红
  '#00FFFF', // 青色
  '#FFA500', // 橙色
  '#800080', // 紫色
  '#008000', // 深绿色
  '#000080', // 海军蓝
  '#8B4513', // 棕色
  '#4B0082', // 靛蓝色
];

interface CustomEdgeData {
  color?: string;
  label?: string;
}

// 自定义边组件
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
}: EdgeProps<CustomEdgeData>) => {
  // 判断源端口和目标端口的位置
  const sourceIsLeft = sourcePosition === Position.Left;
  const targetIsLeft = targetPosition === Position.Left;
  
  // 计算控制点的偏移量
  const offset = 150;
  
  // 为源点和目标点分别计算控制点
  const sourceControlX = sourceX + (sourceIsLeft ? -offset : offset);
  const targetControlX = targetX + (targetIsLeft ? -offset : offset);
  
  // 构建路径
  const path = `M ${sourceX} ${sourceY}
               C ${sourceControlX} ${sourceY},
                 ${targetControlX} ${targetY},
                 ${targetX} ${targetY}`;

  const color = data?.color || style?.stroke || '#999';

  // 计算标签位置 - 更靠近连线
  // 使用 0.3 和 0.7 的比例点来计算两个中间点
  const t1 = 0.3; // 第一个中间点的位置比例
  const t2 = 0.7; // 第二个中间点的位置比例
  
  // 计算贝塞尔曲线上的点
  const midX1 = Math.pow(1-t1, 3) * sourceX + 
                3 * Math.pow(1-t1, 2) * t1 * sourceControlX + 
                3 * (1-t1) * Math.pow(t1, 2) * targetControlX + 
                Math.pow(t1, 3) * targetX;
  
  const midY1 = Math.pow(1-t1, 3) * sourceY + 
                3 * Math.pow(1-t1, 2) * t1 * sourceY + 
                3 * (1-t1) * Math.pow(t1, 2) * targetY + 
                Math.pow(t1, 3) * targetY;
  
  const midX2 = Math.pow(1-t2, 3) * sourceX + 
                3 * Math.pow(1-t2, 2) * t2 * sourceControlX + 
                3 * (1-t2) * Math.pow(t2, 2) * targetControlX + 
                Math.pow(t2, 3) * targetX;
  
  const midY2 = Math.pow(1-t2, 3) * sourceY + 
                3 * Math.pow(1-t2, 2) * t2 * sourceY + 
                3 * (1-t2) * Math.pow(t2, 2) * targetY + 
                Math.pow(t2, 3) * targetY;
  
  // 取两个中间点的平均位置作为标签位置
  const labelX = (midX1 + midX2) / 2;
  const labelY = (midY1 + midY2) / 2;

  return (
    <>
      {/* 添加一个更宽的透明路径作为点击区域 */}
      <path
        id={`${id}-interaction`}
        style={{
          strokeWidth: 12,
          stroke: 'transparent',
          fill: 'none',
        }}
        className="react-flow__edge-interaction"
        d={path}
      />
      <path
        id={id}
        style={{
          ...style,
          stroke: color,
          strokeWidth: style?.strokeWidth || 2,
        }}
        className="react-flow__edge-path"
        d={path}
      />
      {data?.label && (
        <text
          x={labelX}
          y={labelY}
          className="react-flow__edge-text"
          style={{
            fill: color,
            fontSize: '12px',
            textAnchor: 'middle',
            dominantBaseline: 'middle',
            pointerEvents: 'none',
            backgroundColor: 'white',
          }}
        >
          <tspan dy="-0.5em" style={{ backgroundColor: 'white', padding: '0 4px' }}>
            {data.label}
          </tspan>
        </text>
      )}
    </>
  );
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

// 生成连线颜色和样式
const getEdgeStyle = (sourceY: number, targetY: number, sourceX: number, targetX: number, isSameDevice: boolean) => {
  const colors = [
    '#FF0000', // 鲜红色
    '#00FF00', // 鲜绿色
    '#0000FF', // 鲜蓝色
    '#FF00FF', // 洋红色
    '#00FFFF', // 青色
    '#FFA500', // 橙色
    '#800080', // 紫色
    '#008000', // 深绿色
    '#000080', // 深蓝色
  ];
  
  // 根据连线的垂直位置选择颜色
  const index = Math.abs(Math.floor((sourceY - targetY) / 30)) % colors.length;
  
  // 计算控制点的偏移量（仅用于设备间连线）
  const distance = Math.abs(targetX - sourceX);
  const offset = isSameDevice ? 0 : (0.2 * distance + (index * 20));
  
  return {
    stroke: colors[index],
    strokeWidth: 3,
    sourceControlOffset: offset,
    targetControlOffset: offset,
    type: isSameDevice ? 'smoothstep' : 'default' // 同一设备内使用smoothstep，设备间使用贝塞尔
  };
};

function Flow() {
  const { nodes, edges, addNode, addNodes, deleteNode, setNodes, setEdges, updatePortStatus } = useStore();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { fitView } = useReactFlow();
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [deviceTemplates, setDeviceTemplates] = useState(defaultDeviceTemplates);
  const [newTemplate, setNewTemplate] = useState<DeviceTemplate>({
    id: '',
    name: '',
    description: '',
    portGroups: []
  });
  const [edgeLabel, setEdgeLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(EDGE_COLORS[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);
  const [selectionMode, setSelectionMode] = useState<'drag' | 'select'>('drag');
  const [isDragging, setIsDragging] = useState(false);
  const [deviceCount, setDeviceCount] = useState<number>(1); // 添加设备数量状态
  
  // 添加历史记录状态
  const [history, setHistory] = useState<{
    past: { nodes: Node[]; edges: Edge[] }[];
    future: { nodes: Node[]; edges: Edge[] }[];
  }>({
    past: [],
    future: [],
  });

  // 添加状态来追踪是否需要在节点更新后执行布局
  const [shouldLayoutAfterAdd, setShouldLayoutAfterAdd] = useState<boolean>(false);
  const [layoutTrigger, setLayoutTrigger] = useState<number>(0);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // 切换模式
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // 计算节点尺寸
  const getNodeDimensions = (node: Node) => {
    // 基础高度（标题等）
    const baseHeight = 40;
    // 每个端口的高度（包括间距）
    const portHeight = 30;
    // 获取端口数量
    const portCount = node.data.portGroups[0].ports.length;
    
    return {
      width: 320,  // 两个端口组的宽度 (160 * 2)
      height: baseHeight + (portCount * portHeight) // 根据端口数量计算高度
    };
  };

  // 自动排布
  const handleAutoLayout = () => {
    // 保存历史状态
    saveToHistory();
    
    // 保存现有的连接
    const existingEdges = [...edges];
    
    // 复制节点而不是创建新的节点列表（保留ID和数据）
    const nodesToLayout = [...nodes]; 
    
    // 按设备类型分组
    const devicesByType: Record<string, Node[]> = {
      'DavidV100': [],  // NPU芯片
      'Hi1650V100': [], // CPU芯片
      'UnionsV100': [], // Switch芯片
      'unknown': []
    };
    
    // 对节点进行分类
    nodesToLayout.forEach(node => {
      const type = node.data.type || 'unknown';
      if (!devicesByType[type]) {
        devicesByType[type] = [];
      }
      devicesByType[type].push(node);
    });
    
    // 基础配置
    const baseConfig = {
      spacing: 300,      // 水平间距
      rowSpacing: 500,   // 垂直间距 - 从250增加到500（两倍）
      startX: 100,       // 起始X坐标
      maxNodesPerRow: 8  // 每行最多设备数
    };
    
    // 创建一个新的节点列表，保持节点ID不变
    const updatedNodes: Node[] = [];
    
    // 当前Y坐标位置，随着布局进行动态更新
    let currentY = 100;  // 起始Y坐标
    
    // 按类型逐个布局设备，确保不同类型之间不重叠
    Object.entries(devicesByType).forEach(([type, typeNodes]) => {
      if (typeNodes.length === 0) return; // 跳过没有节点的类型
      
      console.log(`正在布局 ${type} 类型，共 ${typeNodes.length} 个设备，起始Y坐标: ${currentY}`);
      
      // 计算当前类型需要的行数
      const rowsNeeded = Math.ceil(typeNodes.length / baseConfig.maxNodesPerRow);
      
      // 为当前类型的设备布局
      typeNodes.forEach((node, index) => {
        // 计算行和列
        const row = Math.floor(index / baseConfig.maxNodesPerRow);
        const col = index % baseConfig.maxNodesPerRow;
        
        // 计算新位置
        const x = baseConfig.startX + col * baseConfig.spacing;
        const y = currentY + row * baseConfig.rowSpacing;
        
        // 创建更新后的节点（保留原始ID和数据）
        const updatedNode = {
          ...node,
          position: { x, y }
        };
        
        updatedNodes.push(updatedNode);
      });
      
      // 更新Y坐标，为下一种类型的设备准备位置
      // 添加额外的间距作为类型之间的分隔
      currentY += rowsNeeded * baseConfig.rowSpacing + 300; // 类型之间增加300px额外空间（原来是150px）
    });
    
    // 更新所有节点位置
    setNodes(updatedNodes);
    
    // 确保连接保持不变
    setEdges(existingEdges);
    
    // 延迟执行 fitView，确保节点位置更新后再调整视图
    setTimeout(() => {
      fitView({ 
        padding: 0.2,  // 增加边距，确保所有节点可见
        maxZoom: 1     // 限制自动适应时的最大缩放
      });
    }, 100);
  };

  // 导出当前状态为JSON
  const handleExport = () => {
    const data = {
      nodes,
      edges
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'network-topology.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 导入JSON
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const jsonData = JSON.parse(event.target?.result as string);
            if (jsonData.nodes && jsonData.edges) {
              setNodes(jsonData.nodes);
              setEdges(jsonData.edges);
            }
          } catch (error) {
            console.error('Error parsing JSON:', error);
            alert('导入失败：无效的JSON文件');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      // 先更新端口状态
      edgesToDelete.forEach((edge) => {
        if (edge.source && edge.target) {
          console.log('Edge to delete:', edge);
          
          // 更新源端口状态
          const sourceNodeId = edge.source;
          const sourcePortId = edge.sourceHandle;
          if (sourceNodeId && sourcePortId) {
            updatePortStatus(sourceNodeId, sourcePortId, 'disconnected');
          }

          // 更新目标端口状态
          const targetNodeId = edge.target;
          const targetPortId = edge.targetHandle;
          if (targetNodeId && targetPortId) {
            updatePortStatus(targetNodeId, targetPortId, 'disconnected');
          }
        }
      });

      // 从edges数组中移除被删除的边
      const remainingEdges = edges.filter(
        edge => !edgesToDelete.some(toDelete => toDelete.id === edge.id)
      );
      setEdges(remainingEdges);
    },
    [edges, setEdges, updatePortStatus]
  );

  // 保存当前状态到历史记录
  const saveToHistory = useCallback(() => {
    setHistory(curr => ({
      past: [...curr.past, { nodes, edges }],
      future: [],
    }));
  }, [nodes, edges]);

  // 撤销操作
  const undo = useCallback(() => {
    setHistory(curr => {
      if (curr.past.length === 0) return curr;
      
      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, -1);
      
      setNodes(previous.nodes);
      setEdges(previous.edges);
      
      return {
        past: newPast,
        future: [{ nodes, edges }, ...curr.future],
      };
    });
  }, [nodes, edges, setNodes, setEdges]);

  // 重做操作
  const redo = useCallback(() => {
    setHistory(curr => {
      if (curr.future.length === 0) return curr;
      
      const next = curr.future[0];
      const newFuture = curr.future.slice(1);
      
      setNodes(next.nodes);
      setEdges(next.edges);
      
      return {
        past: [...curr.past, { nodes, edges }],
        future: newFuture,
      };
    });
  }, [nodes, edges, setNodes, setEdges]);

  // 处理连接建立
  const handleConnect = useCallback(
    (params: Connection) => {
      if (!params.sourceHandle || !params.targetHandle || !params.source || !params.target) {
        setErrorMessage('连接参数无效');
        return false;
      }

      // 检查是否是同一个端口的自连
      if (params.sourceHandle === params.targetHandle && params.source === params.target) {
        setErrorMessage('不能将端口与自己连接');
        return false;
      }

      // 检查源端口和目标端口是否已经有连接
      const sourceConnections = edges.filter(edge => {
        return (
          (edge.source === params.source && edge.sourceHandle === params.sourceHandle) ||
          (edge.target === params.source && edge.targetHandle === params.sourceHandle)
        );
      });

      const targetConnections = edges.filter(edge => {
        return (
          (edge.source === params.target && edge.sourceHandle === params.targetHandle) ||
          (edge.target === params.target && edge.targetHandle === params.targetHandle)
        );
      });

      if (sourceConnections.length > 0) {
        setErrorMessage(`设备 ${params.source} 的端口已被连接`);
        return false;
      }

      if (targetConnections.length > 0) {
        setErrorMessage(`设备 ${params.target} 的端口已被连接`);
        return false;
      }

      try {
        // 从完整的handle ID中提取端口信息
        const sourceHandleParts = params.sourceHandle.split('-');
        const targetHandleParts = params.targetHandle.split('-');
        
        // 提取端口组ID和端口ID
        const sourceGroupId = sourceHandleParts[1];
        const targetGroupId = targetHandleParts[1];
        const sourcePortId = params.sourceHandle;
        const targetPortId = params.targetHandle;

        // 检查是否是同一设备内的连接
        const isSameDevice = params.source === params.target;

        // 获取源节点和目标节点的位置
        const sourceNode = nodes.find(n => n.id === params.source);
        const targetNode = nodes.find(n => n.id === params.target);

        if (!sourceNode || !targetNode) {
          console.log('Source or target node not found:', { sourceNode, targetNode });
          return;
        }

        // 计算连线的控制点偏移
        let edgeStyle = {};
        if (isSameDevice) {
          // 同一设备内的连接
          const isSameGroup = sourceGroupId === targetGroupId;
          const isLeftGroup = sourceGroupId === 'group-1';
          
          edgeStyle = {
            type: 'custom',
            style: {
              stroke: selectedColor,
              strokeWidth: 2,
            },
            data: {
              color: selectedColor,
              label: edgeLabel,
            },
            sourcePosition: isLeftGroup ? Position.Left : Position.Right,
            targetPosition: isLeftGroup ? Position.Left : Position.Right,
          };
        } else {
          // 不同设备之间的连接
          edgeStyle = {
            type: 'custom',  // 改为使用自定义边类型
            style: {
              stroke: selectedColor,
              strokeWidth: 2,
            },
            data: {
              color: selectedColor,
              label: edgeLabel,
            }
          };
        }

        // 创建新的连接
        const newEdge = {
          ...params,
          ...edgeStyle,
          id: `${params.source}-${params.sourceHandle}-${params.target}-${params.targetHandle}`,
        } as Edge;

        // 在成功连接后保存历史
        saveToHistory();
        const newEdges = addEdge(newEdge, edges);
        setEdges(newEdges);

        // 更新端口状态
        console.log('Creating new connection:', {
          sourceId: params.source,
          sourceHandle: params.sourceHandle,
          targetId: params.target,
          targetHandle: params.targetHandle,
          edgeStyle
        });

        updatePortStatus(params.source, sourcePortId, 'connected');
        updatePortStatus(params.target, targetPortId, 'connected');

        return false;
      } catch (error) {
        console.error('Error creating connection:', error);
        return false;
      }
    },
    [edges, nodes, selectedColor, edgeLabel, updatePortStatus, saveToHistory]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const dragChange = changes.find(
        change => change.type === 'position' && (change as any).dragging !== undefined
      ) as any;
      
      // 判断当前是否处于拖动状态
      if (dragChange) {
        const dragStarting = dragChange.dragging === true && !isDragging;
        const dragEnding = dragChange.dragging === false && isDragging;
        
        // 当拖动刚开始时保存状态，这样撤销时可以回到拖动前的状态
        if (dragStarting) {
          setIsDragging(true);
          saveToHistory();
        } 
        // 拖动结束时更新状态
        else if (dragEnding) {
          setIsDragging(false);
        }
      } 
      // 非拖动变化时保存历史（如选择节点、添加节点等）
      else if (changes.length > 0) {
        saveToHistory();
      }
      
      const newNodes = applyNodeChanges(changes, nodes);
      setNodes(newNodes);
    },
    [nodes, setNodes, saveToHistory, isDragging]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // 检查是否是边的选择或移动操作
      const isSelectionChange = changes.some(change => change.type === 'select');
      
      // 只有当不是边的选择操作时才保存历史（避免选择边时产生多余历史记录）
      if (!isSelectionChange && changes.length > 0) {
        saveToHistory();
      }
      
      const newEdges = applyEdgeChanges(changes, edges);
      setEdges(newEdges);
      
      if (selectedEdge) {
        const updatedEdge = newEdges.find(e => e.id === selectedEdge.id);
        setSelectedEdge(updatedEdge || null);
      }
    },
    [edges, setEdges, selectedEdge, saveToHistory]
  );

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setEdgeLabel(edge.data?.label || '');
    setSelectedColor(edge.data?.color || EDGE_COLORS[0]);
  }, []);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
    setSelectedEdge(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedEdge(null);
    setSelectedNode(null);
  }, []);

  // 找到新节点的合适位置
  const findNewNodePosition = (deviceType: string = 'unknown') => {
    // 第一个节点的默认位置
    if (nodes.length === 0) {
      return { x: 100, y: 100 };
    }
    
    // 基础配置，与自动布局保持一致
    const baseConfig = {
      spacing: 300,      // 水平间距
      rowSpacing: 500,   // 垂直间距 - 与自动布局保持一致
      startX: 100,       // 起始X坐标
      maxNodesPerRow: 8  // 每行最多设备数
    };
    
    // 获取设备尺寸
    const deviceDims = getNodeDimensions({ 
      data: createDefaultDeviceData('新设备') 
    } as Node);
    
    // 创建一个占用区域列表，包含所有现有节点的位置
    const occupiedAreas = nodes.map(node => {
      const dims = getNodeDimensions(node);
      return {
        left: node.position.x - 30, // 添加30px的安全边距
        right: node.position.x + dims.width + 30,
        top: node.position.y - 30,
        bottom: node.position.y + dims.height + 30,
        type: node.data.type || 'unknown' // 记录节点类型
      };
    });
    
    // 按类型分组节点
    const devicesByType: Record<string, typeof occupiedAreas> = {};
    
    occupiedAreas.forEach(area => {
      const type = area.type;
      if (!devicesByType[type]) {
        devicesByType[type] = [];
      }
      devicesByType[type].push(area);
    });
    
    // 获取当前设备类型的所有区域
    const currentTypeAreas = devicesByType[deviceType] || [];
    
    // 找出当前设备类型的区域范围
    let minY = 100; // 默认起始Y坐标
    let maxY = minY;
    
    if (currentTypeAreas.length > 0) {
      // 如果已有同类型设备，使用它们的区域来确定位置
      minY = Math.min(...currentTypeAreas.map(area => area.top));
      maxY = Math.max(...currentTypeAreas.map(area => area.bottom));
    } else {
      // 如果没有同类型设备，则基于其他类型设备的位置来确定新位置
      // 从小到大排序各类型设备的最大Y坐标
      const typesMaxY: Array<{type: string, maxY: number}> = [];
      
      Object.entries(devicesByType).forEach(([type, areas]) => {
        if (areas.length > 0) {
          typesMaxY.push({
            type,
            maxY: Math.max(...areas.map(area => area.bottom))
          });
        }
      });
      
      typesMaxY.sort((a, b) => a.maxY - b.maxY);
      
      // 找到应该放置的位置
      const typeIndex = Object.keys(devicesByType).indexOf(deviceType);
      if (typeIndex > 0 && typesMaxY.length > 0) {
        // 寻找应该放在哪个类型的下方
        let placeBelowIndex = -1;
        for (let i = 0; i < typesMaxY.length; i++) {
          if (typesMaxY[i].type < deviceType) {
            placeBelowIndex = i;
          } else {
            break;
          }
        }
        
        if (placeBelowIndex >= 0) {
          // 放在前一个类型的下方
          minY = typesMaxY[placeBelowIndex].maxY + 300; // 添加300px的类型间距（从150px增加）
        } else {
          // 放在第一个位置
          minY = 100;
        }
      } else {
        // 如果是未知类型或应该放在最后，则放在所有设备的下方
        if (typesMaxY.length > 0) {
          minY = typesMaxY[typesMaxY.length - 1].maxY + 300; // 添加300px的类型间距（从150px增加）
        }
      }
      
      maxY = minY; // 初始情况下，最大Y等于最小Y
    }
    
    // 计算可以容纳设备的位置
    let bestPosition = { x: baseConfig.startX, y: minY };
    let bestOverlap = Number.MAX_VALUE;
    
    // 在当前类型区域内寻找最佳位置
    const rowsToCheck = 3; // 检查3行
    
    for (let row = 0; row < rowsToCheck; row++) {
      for (let col = 0; col < baseConfig.maxNodesPerRow; col++) {
        const x = baseConfig.startX + col * baseConfig.spacing;
        const y = minY + row * baseConfig.rowSpacing;
        
        const newArea = {
          left: x,
          right: x + deviceDims.width,
          top: y,
          bottom: y + deviceDims.height
        };
        
        // 计算与所有设备的重叠程度
        let totalOverlap = 0;
        let hasDirectOverlap = false;
        
        occupiedAreas.forEach(area => {
          if (!(newArea.left > area.right || 
                newArea.right < area.left || 
                newArea.top > area.bottom || 
                newArea.bottom < area.top)) {
            hasDirectOverlap = true;
            totalOverlap += 1000; // 直接重叠，给予很高的惩罚
          } else {
            // 计算距离
            const dx = Math.max(0, 
              Math.min(Math.abs(newArea.left - area.right), Math.abs(newArea.right - area.left)));
            const dy = Math.max(0, 
              Math.min(Math.abs(newArea.top - area.bottom), Math.abs(newArea.bottom - area.top)));
            totalOverlap += 1 / (dx * dx + dy * dy + 1);
          }
        });
        
        // 如果没有直接重叠，且overlap更小，更新最佳位置
        if (!hasDirectOverlap && totalOverlap < bestOverlap) {
          bestOverlap = totalOverlap;
          bestPosition = { x, y };
        }
      }
    }
    
    // 如果无法找到不重叠的位置，则放在当前类型区域的下方
    if (bestOverlap === Number.MAX_VALUE) {
      bestPosition = { 
        x: baseConfig.startX, 
        y: maxY + baseConfig.rowSpacing 
      };
    }
    
    return bestPosition;
  };

  const handleAddDeviceClick = () => {
    setShowDeviceDialog(true);
  };

  // 添加按类型计数的函数，用于生成设备名称
  const getDeviceNumberByType = (nodes: Node[], typePrefix: string): number => {
    // 获取指定类型的所有设备
    const sameTypeNodes = nodes.filter(node => {
      // 检查设备名称是否以给定前缀开头
      const namePattern = new RegExp(`^${typePrefix}-\\d+$`);
      return namePattern.test(node.data.label);
    });
    
    if (sameTypeNodes.length === 0) {
      return 1; // 如果没有同类型设备，从1开始
    }
    
    // 提取现有编号
    const numbers = sameTypeNodes.map(node => {
      const match = node.data.label.match(/-(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    });
    
    // 找出最大编号
    const maxNumber = Math.max(...numbers);
    return maxNumber + 1; // 返回下一个可用编号
  };

  // 更新所有设备的编号
  const updateAllDeviceNumbers = () => {
    // 保存历史状态
    saveToHistory();
    
    // 按类型分组设备
    const devicesByType: Record<string, Node[]> = {};
    
    // 先按类型分组
    nodes.forEach(node => {
      const type = node.data.type || 'unknown';
      if (!devicesByType[type]) {
        devicesByType[type] = [];
      }
      devicesByType[type].push(node);
    });
    
    // 创建更新后的节点列表
    const updatedNodes: Node[] = [];
    
    // 按类型重新编号
    Object.entries(devicesByType).forEach(([type, typeNodes]) => {
      // 获取类型对应的显示名称前缀
      let typePrefix = type;
      if (type === 'DavidV100') typePrefix = 'NPU';
      else if (type === 'Hi1650V100') typePrefix = 'CPU';
      else if (type === 'UnionsV100') typePrefix = 'Switch';
      
      // 按ID排序，以保持相对顺序
      typeNodes.sort((a, b) => a.id.localeCompare(b.id));
      
      // 重新编号
      typeNodes.forEach((node, index) => {
        updatedNodes.push({
          ...node,
          data: {
            ...node.data,
            label: `${typePrefix}-${index + 1}`
          }
        });
      });
    });
    
    // 更新所有节点
    if (updatedNodes.length > 0) {
      setNodes(updatedNodes);
    }
  };

  const handleAddDeviceFromTemplate = (template: DeviceTemplate) => {
    // 保存历史记录，以便撤销
    saveToHistory();
    
    // 获取要添加的设备数量
    const countToAdd = Math.max(1, Math.min(20, deviceCount || 1));
    console.log(`准备添加 ${countToAdd} 个 ${template.name} 设备`);
    
    // 创建新设备的数组
    const newDevices: Node[] = [];
    
    // 获取类型对应的显示名称前缀
    let typePrefix = template.id;
    if (template.id === 'DavidV100') typePrefix = 'NPU';
    else if (template.id === 'Hi1650V100') typePrefix = 'CPU';
    else if (template.id === 'UnionsV100') typePrefix = 'Switch';
    
    // 生成设备
    for (let i = 0; i < countToAdd; i++) {
      const uniqueId = `device-${Date.now()}-${i}`;
      const position = findNewNodePosition(template.id);
      
      // 获取下一个可用的设备编号
      const deviceNumber = getDeviceNumberByType(nodes, typePrefix) + i;
      
      const newDevice: Node = {
        id: uniqueId,
        type: 'device',
        data: createDeviceFromTemplate(template, `${typePrefix}-${deviceNumber}`),
        position
      };
      
      // 添加到新设备数组
      newDevices.push(newDevice);
      console.log(`创建设备: ${uniqueId}, 名称: ${typePrefix}-${deviceNumber}`);
    }
    
    // 使用addNodes批量添加所有设备
    if (newDevices.length > 0) {
      console.log(`批量添加 ${newDevices.length} 个设备`);
      
      // 如果添加多个设备，设置布局标志
      if (countToAdd > 1) {
        setShouldLayoutAfterAdd(true);
      }
      
      // 添加设备
      addNodes(newDevices);
      
      // 设置布局触发器
      setLayoutTrigger(prev => prev + 1);
      
      // 关闭对话框
      setShowDeviceDialog(false);
      
      // 显示消息
      setErrorMessage(`已添加 ${countToAdd} 个 ${template.name} 设备`);
    }
  };
  
  // 使用useEffect监听布局触发器的变化
  useEffect(() => {
    if (layoutTrigger > 0 && shouldLayoutAfterAdd) {
      // 重置标志
      setShouldLayoutAfterAdd(false);
      
      // 延迟执行布局，确保节点已渲染
      setTimeout(() => {
        console.log(`执行布局，当前设备总数: ${nodes.length}`);
        handleAutoLayout();
      }, 200);
    } else if (layoutTrigger > 0) {
      // 如果不需要布局但是添加了设备，只调整视图
      setTimeout(() => {
        console.log(`调整视图，当前设备总数: ${nodes.length}`);
        fitView({ padding: 0.2 });
      }, 200);
    }
  }, [layoutTrigger, shouldLayoutAfterAdd]);

  const handleSaveTemplate = () => {
    if (newTemplate.id && newTemplate.name) {
      setDeviceTemplates([...deviceTemplates, newTemplate]);
      setNewTemplate({
        id: '',
        name: '',
        description: '',
        portGroups: []
      });
    }
  };

  const handleDeleteNode = useCallback(() => {
    if (selectedNode) {
      saveToHistory();
      deleteNode(selectedNode);
      setSelectedNode(null);
      
      // 延迟更新编号，确保删除操作完成
      setTimeout(() => {
        updateAllDeviceNumbers();
      }, 100);
    }
  }, [selectedNode, deleteNode, saveToHistory]);

  // 更新边的属性
  const updateEdgeProperties = useCallback(() => {
    if (selectedEdge) {
      const changes: EdgeChange[] = [
        {
          id: selectedEdge.id,
          type: 'select',
          selected: false
        },
        {
          id: selectedEdge.id,
          type: 'remove'
        },
        {
          type: 'add',
          item: {
            ...selectedEdge,
            type: 'custom',
            data: {
              ...selectedEdge.data,
              color: selectedColor,
              label: edgeLabel,
            },
            style: {
              ...selectedEdge.style,
              stroke: selectedColor,
              strokeWidth: 2,
            },
          },
        },
      ];
      
      onEdgesChange(changes);
      setSelectedEdge(null);
    }
  }, [selectedEdge, selectedColor, edgeLabel, onEdgesChange]);

  // 处理框选
  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      setSelectedNodes(params.nodes);
      setSelectedEdges(params.edges);
      setSelectedNode(params.nodes.length === 1 ? params.nodes[0].id : null);
      setSelectedEdge(params.edges.length === 1 ? params.edges[0] : null);
    },
    []
  );

  // 复制选中的节点
  const handleCopy = useCallback(() => {
    if (selectedNodes.length > 0) {
      const nodesToCopy = selectedNodes.map(node => ({
        ...node,
        id: `${node.id}-copy`,
        position: { ...node.position },
        data: { ...node.data }
      }));
      setCopiedNodes(nodesToCopy);
      setErrorMessage('已复制选中的设备');
    }
  }, [selectedNodes]);

  // 粘贴复制的节点
  const handlePaste = useCallback(() => {
    if (copiedNodes.length > 0) {
      saveToHistory();
      
      // 计算选中节点的边界框
      const minX = Math.min(...copiedNodes.map(node => node.position.x));
      const minY = Math.min(...copiedNodes.map(node => node.position.y));
      
      // 创建新节点，位置偏移一定距离
      const offset = 100;
      const newNodes = copiedNodes.map(node => ({
        ...node,
        id: `${node.id}-${Date.now()}`,
        position: {
          x: node.position.x - minX + offset,
          y: node.position.y - minY + offset
        },
        data: {
          ...node.data,
          name: `${node.data.name} 副本`
        }
      }));

      setNodes([...nodes, ...newNodes]);
      setCopiedNodes(newNodes); // 更新复制的节点，这样下次粘贴会基于新位置
      setErrorMessage('已粘贴设备');
    }
  }, [copiedNodes, nodes, setNodes, saveToHistory]);

  // 批量删除选中的节点和边
  const handleBatchDelete = useCallback(() => {
    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      saveToHistory();
      
      // 删除选中的边
      if (selectedEdges.length > 0) {
        const edgeIdsToDelete = new Set(selectedEdges.map(edge => edge.id));
        const remainingEdges = edges.filter(edge => !edgeIdsToDelete.has(edge.id));
        setEdges(remainingEdges);
      }

      // 删除选中的节点
      if (selectedNodes.length > 0) {
        const nodeIdsToDelete = new Set(selectedNodes.map(node => node.id));
        const remainingNodes = nodes.filter(node => !nodeIdsToDelete.has(node.id));
        setNodes(remainingNodes);
        
        // 延迟更新所有设备的编号
        setTimeout(() => {
          updateAllDeviceNumbers();
        }, 100);
      }

      // 清除选中状态
      setSelectedNodes([]);
      setSelectedEdges([]);
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  }, [selectedNodes, selectedEdges, nodes, edges, setNodes, setEdges, saveToHistory]);

  // 添加全局键盘事件监听
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 当焦点在输入框或文本区域时不处理快捷键
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Ctrl+Z 撤销
      if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        undo();
      }
      // Ctrl+Y 重做
      else if (event.ctrlKey && event.key === 'y') {
        event.preventDefault();
        redo();
      }
      // Ctrl+C 复制
      else if (event.ctrlKey && event.key === 'c') {
        event.preventDefault();
        if (selectedNodes.length > 0) {
          handleCopy();
        }
      }
      // Ctrl+V 粘贴
      else if (event.ctrlKey && event.key === 'v') {
        event.preventDefault();
        if (copiedNodes.length > 0) {
          handlePaste();
        }
      }
      // Ctrl+A 全选
      else if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
        setSelectedNodes(nodes);
        setSelectedEdges(edges);
        setSelectedNode(null);
        setSelectedEdge(null);
      }
      // Delete 删除
      else if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          event.preventDefault();
          handleBatchDelete();
        } else if (selectedEdge) {
          event.preventDefault();
          onEdgesDelete([selectedEdge]);
          setSelectedEdge(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [nodes, edges, selectedNodes, selectedEdges, copiedNodes, undo, redo, handleCopy, handlePaste, handleBatchDelete, onEdgesDelete]);

  // 切换选择模式
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(mode => mode === 'drag' ? 'select' : 'drag');
  }, []);

  return (
    <div className={`w-screen h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgesDelete={onEdgesDelete}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        selectionMode={SelectionMode.Full}
        selectionOnDrag={selectionMode === 'select'}
        selectNodesOnDrag={false}
        panOnDrag={selectionMode === 'drag'}
        multiSelectionKeyCode="Control"
        snapToGrid={true}
        snapGrid={[15, 15]}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: {
            strokeWidth: 2,
          }
        }}
        connectionRadius={30}
        connectionLineStyle={{ stroke: selectedColor, strokeWidth: 3 }}
        connectionLineType={ConnectionLineType.Bezier}
        connectOnClick={true}
        fitView
        fitViewOptions={{
          padding: 0.1,
          maxZoom: 1,
        }}
      >
        {errorMessage && (
          <div
            className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg ${
              isDarkMode ? 'bg-red-900 text-white' : 'bg-red-100 text-red-800'
            } transition-opacity duration-300 text-base`}
          >
            {errorMessage}
          </div>
        )}

        <Background color={isDarkMode ? '#444' : '#aaa'} />
        <Controls 
          className={`${isDarkMode ? 'text-white' : 'text-black'} !translate-y-[100px]`} 
          showZoom={true}
          showFitView={true}
          showInteractive={false}
        />
        
        {/* 添加标题面板 */}
        <Panel position="top-center" className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-2 rounded shadow`}>
          <h1 className="text-xl font-bold">uCluster</h1>
        </Panel>
        
        {/* 添加工具栏面板 */}
        <Panel position="top-right" className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-2 rounded shadow flex gap-2`}>
          <button
            onClick={toggleSelectionMode}
            className={`flex items-center gap-2 px-4 py-2 rounded text-base ${
              selectionMode === 'select'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
            title={selectionMode === 'select' ? '当前模式：框选' : '当前模式：拖拽'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              {selectionMode === 'select' ? (
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm10 0H6v12h8V4z" clipRule="evenodd" />
              )}
            </svg>
            {selectionMode === 'select' ? '框选模式' : '拖拽模式'}
          </button>
        </Panel>

        {/* 操作工具栏 */}
        <Panel position="top-left" className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-2 rounded shadow flex gap-2 flex-wrap`}>
          <button
            onClick={handleAddDeviceClick}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-base"
          >
            添加设备
          </button>
          <button
            onClick={handleDeleteNode}
            disabled={!selectedNode}
            className={`${
              selectedNode
                ? 'bg-red-500 hover:bg-red-700'
                : 'bg-gray-300 cursor-not-allowed'
            } text-white font-bold py-2 px-4 rounded text-base`}
          >
            删除设备
          </button>
          <button
            onClick={handleExport}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-base"
          >
            导出JSON
          </button>
          <button
            onClick={handleImport}
            className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded text-base"
          >
            导入JSON
          </button>
          <button
            onClick={toggleDarkMode}
            className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded text-base"
          >
            {isDarkMode ? '白天模式' : '夜间模式'}
          </button>
          <button
            onClick={handleAutoLayout}
            className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded text-base"
          >
            自动排布
          </button>
          <button
            onClick={undo}
            disabled={history.past.length === 0}
            className={`${
              history.past.length > 0
                ? 'bg-blue-500 hover:bg-blue-700'
                : 'bg-gray-300 cursor-not-allowed'
            } text-white font-bold py-2 px-4 rounded text-base`}
            title="撤销 (Ctrl+Z)"
          >
            撤销
          </button>
          <button
            onClick={redo}
            disabled={history.future.length === 0}
            className={`${
              history.future.length > 0
                ? 'bg-blue-500 hover:bg-blue-700'
                : 'bg-gray-300 cursor-not-allowed'
            } text-white font-bold py-2 px-4 rounded text-base`}
            title="重做 (Ctrl+Y)"
          >
            重做
          </button>
          <button
            onClick={handleCopy}
            disabled={selectedNodes.length === 0}
            className={`${
              selectedNodes.length > 0
                ? 'bg-blue-500 hover:bg-blue-700'
                : 'bg-gray-300 cursor-not-allowed'
            } text-white font-bold py-2 px-4 rounded text-base`}
            title="复制 (Ctrl+C)"
          >
            复制
          </button>
          <button
            onClick={handlePaste}
            disabled={copiedNodes.length === 0}
            className={`${
              copiedNodes.length > 0
                ? 'bg-blue-500 hover:bg-blue-700'
                : 'bg-gray-300 cursor-not-allowed'
            } text-white font-bold py-2 px-4 rounded text-base`}
            title="粘贴 (Ctrl+V)"
          >
            粘贴
          </button>
          <button
            onClick={handleBatchDelete}
            disabled={selectedNodes.length === 0 && selectedEdges.length === 0}
            className={`${
              selectedNodes.length > 0 || selectedEdges.length > 0
                ? 'bg-red-500 hover:bg-red-700'
                : 'bg-gray-300 cursor-not-allowed'
            } text-white font-bold py-2 px-4 rounded text-base`}
            title="删除 (Delete)"
          >
            删除
          </button>
        </Panel>

        {/* 选中提示 */}
        {(selectedNodes.length > 0 || selectedEdges.length > 0) && (
          <Panel position="top-center" className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-600'} p-3 rounded shadow mt-16`}>
            <div className="text-base">
              已选中 {selectedNodes.length} 个设备和 {selectedEdges.length} 条连线
              {selectionMode === 'select' ? 
                ' (拖动鼠标框选)' : 
                ' (按住Ctrl点选)'
              }
            </div>
          </Panel>
        )}

        {/* 当前模式提示 */}
        <Panel position="bottom-center" className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-600'} p-3 rounded shadow mb-4`}>
          <div className="text-base">
            当前模式：{selectionMode === 'select' ? '框选模式 (可拖动鼠标框选)' : '拖拽模式 (可拖动画布和设备)'}
          </div>
        </Panel>
      </ReactFlow>

      {/* 设备选择对话框 */}
      {showDeviceDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg p-6 max-w-2xl w-full mx-4`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">选择设备类型</h2>
              <div className="flex items-center gap-2">
                <label className="whitespace-nowrap text-sm font-medium">添加数量：</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={deviceCount}
                  onChange={(e) => setDeviceCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className={`border p-2 rounded w-16 text-center ${
                    isDarkMode 
                      ? 'bg-gray-700 text-white border-gray-600' 
                      : 'bg-white text-gray-900 border-gray-300'
                  }`}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {deviceTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} cursor-pointer`}
                  onClick={() => handleAddDeviceFromTemplate(template)}
                >
                  <h3 className="font-bold">{template.name}</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{template.description}</p>
                  <div className="mt-2 text-sm">
                    {template.portGroups.map((group, index) => (
                      <div key={index}>
                        {group.name}: {group.portCount}个端口
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 添加新设备类型表单 */}
            <div className="border-t pt-4">
              <h3 className="font-bold mb-2">添加新设备类型</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="设备类型ID"
                  className={`border p-2 rounded w-full ${
                    isDarkMode 
                      ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400' 
                      : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500'
                  }`}
                  value={newTemplate.id}
                  onChange={(e) => setNewTemplate({...newTemplate, id: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="设备名称"
                  className={`border p-2 rounded w-full ${
                    isDarkMode 
                      ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400' 
                      : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500'
                  }`}
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="设备描述"
                  className={`border p-2 rounded w-full ${
                    isDarkMode 
                      ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400' 
                      : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500'
                  }`}
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewTemplate({
                      ...newTemplate,
                      portGroups: [...newTemplate.portGroups, { name: '新端口组', portCount: 1 }]
                    })}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    添加端口组
                  </button>
                </div>
                {newTemplate.portGroups.map((group, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="端口组名称"
                      className={`border p-2 rounded flex-1 ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400' 
                          : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500'
                      }`}
                      value={group.name}
                      onChange={(e) => {
                        const newGroups = [...newTemplate.portGroups];
                        newGroups[index].name = e.target.value;
                        setNewTemplate({...newTemplate, portGroups: newGroups});
                      }}
                    />
                    <input
                      type="number"
                      placeholder="端口数量"
                      className={`border p-2 rounded w-24 ${
                        isDarkMode 
                          ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400' 
                          : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500'
                      }`}
                      value={group.portCount}
                      onChange={(e) => {
                        const newGroups = [...newTemplate.portGroups];
                        newGroups[index].portCount = parseInt(e.target.value) || 1;
                        setNewTemplate({...newTemplate, portGroups: newGroups});
                      }}
                    />
                    <button
                      onClick={() => {
                        const newGroups = newTemplate.portGroups.filter((_, i) => i !== index);
                        setNewTemplate({...newTemplate, portGroups: newGroups});
                      }}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowDeviceDialog(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  disabled={!newTemplate.id || !newTemplate.name}
                >
                  保存设备类型
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 颜色和标签控制面板 */}
      <div className={`fixed bottom-0 left-0 right-0 z-10 ${
        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-700'
      } p-4 shadow-md flex items-center justify-center gap-8 border-t ${
        isDarkMode ? 'border-gray-600' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium whitespace-nowrap">
            选择连线颜色
          </label>
          <div className="flex gap-2">
            {EDGE_COLORS.map((color) => (
              <button
                key={color}
                className={`w-6 h-6 rounded-full border-2 ${
                  selectedColor === color 
                    ? isDarkMode ? 'border-white' : 'border-black' 
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium whitespace-nowrap">
            连线标签
          </label>
          <input
            type="text"
            value={edgeLabel}
            onChange={(e) => setEdgeLabel(e.target.value)}
            className={`px-3 py-1 border rounded w-40 ${
              isDarkMode 
                ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400' 
                : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500'
            }`}
            placeholder="输入连线标签"
          />
        </div>
        {selectedEdge && (
          <button
            onClick={updateEdgeProperties}
            className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
          >
            更新连线属性
          </button>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}

export default App;


