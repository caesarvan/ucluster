import { create } from 'zustand';
import { Node, Edge, Connection } from 'reactflow';
import { createDefaultDeviceData, Port, PortGroup } from '../types/device';

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'device',
    data: createDefaultDeviceData('设备 1'),
    position: { x: 250, y: 25 },
  },
  {
    id: '2',
    type: 'device',
    data: createDefaultDeviceData('设备 2'),
    position: { x: 100, y: 125 },
  },
  {
    id: '3',
    type: 'device',
    data: createDefaultDeviceData('设备 3'),
    position: { x: 250, y: 250 },
  },
];

const initialEdges: Edge[] = [];

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  addNode: (node: Node) => void;
  deleteNode: (nodeId: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  updatePortStatus: (nodeId: string, portId: string, status: Port['status']) => void;
}

const useStore = create<FlowState>((set) => {
  return {
    nodes: initialNodes,
    edges: initialEdges,
    addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
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
  };
});

export default useStore; 