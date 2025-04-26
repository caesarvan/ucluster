import React from 'react';
import { Node, Edge } from 'reactflow';
import { Table, Typography, Card, Space, Tag, Divider } from 'antd';
import { LinkOutlined, InfoCircleOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface TopologyAnalysisProps {
  nodes: Node[];
  edges: Edge[];
  visible: boolean;
}

const TopologyAnalysis: React.FC<TopologyAnalysisProps> = ({ nodes, edges, visible }) => {
  if (!visible) return null;
  
  // 计算各种统计信息
  const deviceCount = nodes.length;
  const connectionCount = edges.length;
  
  // 按类型统计设备
  const devicesByType: Record<string, number> = {};
  nodes.forEach(node => {
    const type = node.data.type || 'unknown';
    devicesByType[type] = (devicesByType[type] || 0) + 1;
  });
  
  // 计算每个设备的连接数
  const connectionsPerDevice: Record<string, number> = {};
  edges.forEach(edge => {
    connectionsPerDevice[edge.source] = (connectionsPerDevice[edge.source] || 0) + 1;
    connectionsPerDevice[edge.target] = (connectionsPerDevice[edge.target] || 0) + 1;
  });
  
  // 筛选出可能存在问题的设备（孤立或者连接过多）
  const isolatedDevices = nodes.filter(node => !connectionsPerDevice[node.id]);
  const highlyConnectedDevices = nodes.filter(node => (connectionsPerDevice[node.id] || 0) > 5);
  
  // 准备连接信息表格数据
  const connectionData = edges.map(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    return {
      key: edge.id,
      sourceId: edge.source,
      sourceName: sourceNode?.data.label || edge.source,
      sourceType: sourceNode?.data.type || 'unknown',
      targetId: edge.target,
      targetName: targetNode?.data.label || edge.target,
      targetType: targetNode?.data.type || 'unknown',
      connectionType: edge.data?.type || '标准连接',
      bandwidth: edge.data?.bandwidth || '-',
      status: edge.data?.status || 'active'
    };
  });
  
  // 用于显示设备类型的表格列
  const deviceTypeColumns = [
    {
      title: '设备类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '数量',
      dataIndex: 'count',
      key: 'count',
    },
  ];
  
  // 设备类型统计表格数据
  const deviceTypeData = Object.entries(devicesByType).map(([type, count], index) => ({
    key: index,
    type,
    count,
  }));
  
  // 用于显示连接信息的表格列
  const connectionColumns = [
    {
      title: '源设备',
      dataIndex: 'sourceName',
      key: 'sourceName',
      render: (text: string, record: any) => (
        <span>
          {text} <Tag color="blue">{record.sourceType}</Tag>
        </span>
      )
    },
    {
      title: '目标设备',
      dataIndex: 'targetName',
      key: 'targetName',
      render: (text: string, record: any) => (
        <span>
          {text} <Tag color="green">{record.targetType}</Tag>
        </span>
      )
    },
    {
      title: '连接类型',
      dataIndex: 'connectionType',
      key: 'connectionType',
    },
    {
      title: '带宽',
      dataIndex: 'bandwidth',
      key: 'bandwidth',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'active') {
          return <Tag icon={<CheckCircleOutlined />} color="success">正常</Tag>;
        } else if (status === 'warning') {
          return <Tag icon={<WarningOutlined />} color="warning">警告</Tag>;
        } else if (status === 'error') {
          return <Tag icon={<WarningOutlined />} color="error">错误</Tag>;
        }
        return <Tag color="default">{status}</Tag>;
      }
    },
  ];
  
  // 检测列表 - 潜在的问题
  const issueItems = [
    {
      key: 'isolated',
      issue: '孤立设备',
      count: isolatedDevices.length,
      description: '未连接到任何其他设备的设备',
      devices: isolatedDevices.map(d => d.data.label || d.id).join(', '),
      severity: isolatedDevices.length > 0 ? 'warning' : 'success'
    },
    {
      key: 'highlyConnected',
      issue: '高连接设备',
      count: highlyConnectedDevices.length,
      description: '连接数超过5个的设备，可能会造成单点故障',
      devices: highlyConnectedDevices.map(d => d.data.label || d.id).join(', '),
      severity: highlyConnectedDevices.length > 0 ? 'info' : 'success'
    }
  ];
  
  return (
    <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(100vh - 64px)' }}>
      <Title level={3}>拓扑分析报告</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 摘要卡片 */}
        <Card title="拓扑摘要" bordered={false}>
          <Space size="large">
            <Statistic title="设备总数" value={deviceCount} prefix={<InfoCircleOutlined />} />
            <Statistic title="连接总数" value={connectionCount} prefix={<LinkOutlined />} />
          </Space>
        </Card>
        
        {/* 设备类型分布 */}
        <Card title="设备类型分布" bordered={false}>
          <Table 
            columns={deviceTypeColumns} 
            dataSource={deviceTypeData} 
            pagination={false}
            size="small"
          />
        </Card>
        
        {/* 潜在问题 */}
        <Card 
          title={
            <span>
              潜在问题检测
              {issueItems.some(item => item.severity === 'warning') && 
                <Tag color="warning" style={{ marginLeft: 8 }}>需要注意</Tag>
              }
            </span>
          } 
          bordered={false}
        >
          {issueItems.map(item => (
            <div key={item.key} style={{ marginBottom: 16 }}>
              <Space>
                <Text strong>{item.issue}</Text>
                <Tag color={
                  item.severity === 'warning' ? 'orange' : 
                  item.severity === 'info' ? 'blue' : 'green'
                }>
                  {item.count}
                </Tag>
              </Space>
              <div>
                <Text type="secondary">{item.description}</Text>
              </div>
              {item.count > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text>受影响设备: {item.devices}</Text>
                </div>
              )}
              <Divider style={{ margin: '12px 0' }} />
            </div>
          ))}
        </Card>
        
        {/* 连接详情 */}
        <Card title="连接详情" bordered={false}>
          <Table 
            columns={connectionColumns} 
            dataSource={connectionData} 
            pagination={{ pageSize: 5 }}
            size="small"
          />
        </Card>
      </Space>
    </div>
  );
};

// 定义一个简单的统计组件，用于显示摘要
const Statistic = ({ title, value, prefix }: { title: string, value: number, prefix: React.ReactNode }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: '32px', color: '#1890ff', marginBottom: '8px' }}>
      {prefix} {value}
    </div>
    <div style={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.45)' }}>{title}</div>
  </div>
);

export default TopologyAnalysis; 