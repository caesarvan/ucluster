import { create } from 'zustand';
import { Node, Edge, Connection } from 'reactflow';
import { createDefaultDeviceData, Port, PortGroup, DeviceData } from '../types/device';

// 将初始节点设置为空数组，不放置默认设备
const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  addNode: (node: Node) => void;
  addNodes: (nodesToAdd: Node[]) => void;
  deleteNode: (nodeId: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  updatePortStatus: (nodeId: string, portId: string, status: Port['status']) => void;
  updateNodeData: (nodeId: string, data: DeviceData) => void;
}

const useStore = create<FlowState>((set) => {
  return {
    nodes: initialNodes,
    edges: initialEdges,
    addNode: (node) => set((state) => {
      console.log(`添加单个节点: ${node.id}`, node);
      return { nodes: [...state.nodes, node] };
    }),
    addNodes: (nodesToAdd) => set((state) => {
      console.log(`批量添加 ${nodesToAdd.length} 个节点`);
      const allNodes = [...state.nodes, ...nodesToAdd];
      console.log(`节点总数: ${allNodes.length}`);
      return { nodes: allNodes };
    }),
    deleteNode: (nodeId) =>
      set((state) => ({
        nodes: state.nodes.filter((node) => node.id !== nodeId),
        edges: state.edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        ),
      })),
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    updatePortStatus: (nodeId, portId, status) =>
      set((state) => ({
        nodes: state.nodes.map((node) => {
          if (node.id === nodeId) {
            console.log('Updating node:', {
              nodeId,
              portId,
              status,
              currentPorts: node.data.portGroups.flatMap((g: PortGroup) => g.ports)
            });
            
            return {
              ...node,
              data: {
                ...node.data,
                portGroups: node.data.portGroups.map((group: PortGroup) => ({
                  ...group,
                  ports: group.ports.map((port: Port) => {
                    // 从传入的portId中提取端口号
                    const incomingPortNumber = portId.split('-').pop();
                    // 从当前端口ID中提取端口号
                    const currentPortNumber = port.id.split('-').pop();
                    
                    // 检查端口组ID和端口号是否匹配
                    const isMatchingGroup = portId.startsWith(group.id);
                    const isMatchingPort = incomingPortNumber === currentPortNumber;
                    
                    console.log('Checking port:', {
                      portId,
                      groupId: group.id,
                      incomingPortNumber,
                      currentPortNumber,
                      isMatchingGroup,
                      isMatchingPort
                    });
                    
                    return (isMatchingGroup && isMatchingPort) ? { ...port, status } : port;
                  }),
                })),
              },
            };
          }
          return node;
        }),
      })),
    updateNodeData: (nodeId, data) =>
      set((state) => ({
        nodes: state.nodes.map((node) => {
          if (node.id === nodeId) {
            console.log('Updating node data:', {
              nodeId,
              data,
              currentData: node.data
            });
            
            return {
              ...node,
              data: {
                ...node.data,
                ...data
              },
            };
          }
          return node;
        }),
      })),
  };
});

export default useStore; 