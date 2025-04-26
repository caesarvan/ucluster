import { DeviceData, PortGroup, Port } from '../types/device';

// 模拟API调用延迟
const simulateApiDelay = () => new Promise(resolve => setTimeout(resolve, 800));

// 启动设备接口
export const startDevice = async (device: DeviceData): Promise<{ success: boolean; message: string }> => {
  console.log('调用启动设备API', device);
  
  // 模拟API延迟
  await simulateApiDelay();
  
  // 模拟成功响应
  return {
    success: true,
    message: `设备 ${device.label} (${device.type}) 启动成功`
  };
};

// 启动端口组接口
export const startPortGroup = async (device: DeviceData, portGroup: PortGroup): Promise<{ success: boolean; message: string }> => {
  console.log('调用启动端口组API', {
    device: device.label,
    portGroup: portGroup.name,
    portGroupId: portGroup.id
  });
  
  // 模拟API延迟
  await simulateApiDelay();
  
  // 模拟成功响应
  return {
    success: true,
    message: `设备 ${device.label} 的端口组 ${portGroup.name} 启动成功`
  };
};

// 启动端口接口
export const startPort = async (device: DeviceData, portGroup: PortGroup, port: Port): Promise<{ success: boolean; message: string }> => {
  console.log('调用启动端口API', {
    device: device.label,
    portGroup: portGroup.name,
    port: port.name,
    portId: port.id
  });
  
  // 模拟API延迟
  await simulateApiDelay();
  
  // 模拟成功响应
  return {
    success: true,
    message: `设备 ${device.label} 的端口组 ${portGroup.name} 中的端口 ${port.name} 启动成功`
  };
}; 