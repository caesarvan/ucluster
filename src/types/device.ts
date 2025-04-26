export interface Port {
  id: string;
  name: string;
  status: 'connected' | 'disconnected';
  speed?: string;
}

export interface PortGroup {
  id: string;
  name: string;
  ports: Port[];
}

export interface DeviceData {
  label: string;
  type: string;
  portGroups: PortGroup[];
}

export interface DeviceTemplate {
  id: string;
  name: string;
  description: string;
  portGroups: {
    name: string;
    portCount: number;
  }[];
}

export const createDefaultPort = (id: string, name: string): Port => ({
  id,
  name,
  status: 'disconnected',
});

export const createDefaultPortGroup = (id: string, name: string): PortGroup => ({
  id,
  name,
  ports: Array.from({ length: 9 }, (_, i) => 
    createDefaultPort(`${id}-port-${i + 1}`, `端口 ${i + 1}`)
  ),
});

export const createDefaultDeviceData = (label: string): DeviceData => ({
  label,
  portGroups: [
    {
      id: 'group-1',
      name: '端口组1',
      ports: Array.from({ length: 9 }, (_, i) => ({
        id: `group-1-port-${i + 1}`,
        name: `端口 ${i + 1}`,
        status: 'disconnected'
      }))
    },
    {
      id: 'group-2',
      name: '端口组2',
      ports: Array.from({ length: 9 }, (_, i) => ({
        id: `group-2-port-${i + 1}`,
        name: `端口 ${i + 1}`,
        status: 'disconnected'
      }))
    }
  ]
});

// 创建端口组
export const createPortGroup = (groupId: string, name: string, portCount: number): PortGroup => ({
  id: groupId,
  name,
  ports: Array.from({ length: portCount }, (_, i) => ({
    id: `${groupId}-port-${i + 1}`,
    name: `端口 ${i + 1}`,
    status: 'disconnected'
  }))
});

// 根据模板创建设备数据
export const createDeviceFromTemplate = (template: DeviceTemplate, label: string): DeviceData => ({
  label,
  type: template.id,
  portGroups: template.portGroups.map((group, index) => 
    createPortGroup(`group-${index + 1}`, group.name, group.portCount)
  )
});

// 默认设备模板
export const defaultDeviceTemplates: DeviceTemplate[] = [
  {
    id: 'DavidV100',
    name: 'NPU芯片',
    description: 'NPU芯片，具有两组端口',
    portGroups: [
      { name: '端口组1', portCount: 9 },
      { name: '端口组2', portCount: 9 }
    ]
  },
  {
    id: 'Hi1650V100',
    name: 'CPU芯片',
    description: 'CPU芯片，具有两组端口',
    portGroups: [
      { name: '端口组1', portCount: 9 },
      { name: '端口组2', portCount: 9 }
    ]
  },
  {
  id: 'UnionsV100',
  name: 'Switch芯片',
  description: 'Switch芯片，具有两组端口',
  portGroups: [
    { name: '端口组1', portCount: 9 },
    { name: '端口组2', portCount: 9 }
  ]
},
  
  // {
  //   id: 'router',
  //   name: '路由器',
  //   description: '标准路由器，具有四组端口',
  //   portGroups: [
  //     { name: '端口组1', portCount: 4 },
  //     { name: '端口组2', portCount: 4 },
  //     { name: '端口组3', portCount: 4 },
  //     { name: '端口组4', portCount: 4 }
  //   ]
  // },
  // {
  //   id: 'server',
  //   name: '服务器',
  //   description: '标准服务器，具有一组端口',
  //   portGroups: [
  //     { name: '网络端口', portCount: 4 }
  //   ]
  // }
]; 