# 网络拓扑图编辑器

这是一个基于 React 和 ReactFlow 开发的网络拓扑图编辑器，支持设备管理、端口连接、自动布局等功能。

## 功能特性

- 🎨 设备管理
  - 支持添加、删除、复制设备
  - 自定义设备类型和端口组
  - 设备模板管理
- 🔌 端口连接
  - 可视化端口连接
  - 支持连线标签和颜色设置
  - 智能连线路径规划
- 🎯 交互功能
  - 框选和拖拽模式切换
  - 批量操作（复制、删除）
  - 撤销/重做功能
- 🖥️ 界面特性
  - 支持明暗主题切换
  - 自动布局功能
  - 缩放和平移控制
- 📦 数据管理
  - JSON 导入/导出
  - 设备模板保存
  - 历史记录管理

## 技术栈

- React 18
- ReactFlow
- TypeScript
- Tailwind CSS
- Zustand (状态管理)

## 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0

## 安装部署

### 1. 克隆项目

```bash
git clone https://github.com/your-username/network-topology.git
cd network-topology
```

### 2. 安装依赖

```bash
npm install
```

### 3. 开发环境运行

```bash
npm run dev
```

访问 http://localhost:5173 查看项目

### 4. 生产环境构建

```bash
npm run build
```

构建后的文件将位于 `dist` 目录中

### 5. 部署到服务器

#### 使用 Nginx 部署

1. 安装 Nginx
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS
sudo yum install nginx
```

2. 配置 Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/network-topology/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 启用 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

3. 启动 Nginx
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 使用 Docker 部署

1. 创建 Dockerfile
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. 构建和运行 Docker 镜像
```bash
docker build -t network-topology .
docker run -d -p 80:80 network-topology
```

## 使用说明

### 基本操作

1. **添加设备**
   - 点击"添加设备"按钮
   - 选择设备模板或创建新模板
   - 设置设备名称和端口组

2. **连接设备**
   - 点击源设备的端口
   - 拖动到目标设备的端口
   - 设置连线标签和颜色

3. **编辑连线**
   - 点击连线选择
   - 在底部面板修改颜色和标签
   - 点击"更新连线属性"保存

### 快捷键

- `Ctrl + Z`: 撤销
- `Ctrl + Y`: 重做
- `Ctrl + C`: 复制选中设备
- `Ctrl + V`: 粘贴设备
- `Delete`: 删除选中项
- `Ctrl + A`: 全选

### 模式切换

- **拖拽模式**: 可以拖动画布和设备
- **框选模式**: 可以拖动鼠标框选多个设备

## 项目结构

```
network-topology/
├── src/
│   ├── components/     # 组件目录
│   ├── store/         # 状态管理
│   ├── types/         # 类型定义
│   ├── App.tsx        # 主应用
│   └── main.tsx       # 入口文件
├── public/            # 静态资源
├── package.json       # 项目配置
└── vite.config.ts     # Vite 配置
```

## 开发指南

### 添加新功能

1. 创建新组件
```bash
mkdir src/components/NewComponent
touch src/components/NewComponent/index.tsx
```

2. 添加类型定义
```bash
touch src/types/newFeature.ts
```

3. 更新状态管理
```bash
touch src/store/useNewFeatureStore.ts
```

### 调试技巧

1. 使用 React Developer Tools 检查组件状态
2. 使用 Redux DevTools 查看状态变化
3. 使用 Chrome DevTools 调试网络请求

## 常见问题

### 1. 端口连接失败

- 检查端口是否已被占用
- 确保源端口和目标端口类型匹配
- 检查设备 ID 是否正确

### 2. 自动布局不生效

- 检查设备位置是否被锁定
- 确保设备之间有足够的空间
- 尝试调整布局参数

### 3. 性能问题

- 减少同时显示的设备数量
- 优化连线计算逻辑
- 使用虚拟滚动处理大量数据

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License
