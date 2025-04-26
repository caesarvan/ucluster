import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 启动开发服务器
const startDevServer = () => {
  const child = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  child.on('error', (error) => {
    console.error(`启动开发服务器时出错: ${error}`);
  });
  
  return child;
};

// 设置自动提交
const setupAutoCommit = () => {
  // 设置钩子脚本为可执行
  try {
    const hookPath = path.join(__dirname, '.git', 'hooks', 'post-commit');
    if (fs.existsSync(hookPath)) {
      fs.chmodSync(hookPath, '755');
      console.log('post-commit 钩子已设置为可执行');
    }
  } catch (error) {
    console.error(`设置钩子脚本权限时出错: ${error}`);
  }
  
  // 设置定时自动提交
  const autoCommitInterval = 10 * 60 * 1000; // 10分钟
  
  console.log(`已设置自动提交，间隔为 ${autoCommitInterval / 60000} 分钟`);
  
  setInterval(() => {
    console.log('\n--- 开始自动提交检查 ---');
    exec('node auto-commit.js', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(`执行自动提交时出错: ${error}`);
        return;
      }
      if (stderr) {
        console.log(stderr);
      }
      console.log(stdout);
      console.log('--- 自动提交检查完成 ---\n');
    });
  }, autoCommitInterval);
};

// 主函数
const main = () => {
  console.log('==== uCluster 开发环境启动 ====');
  console.log('正在启动开发服务器...');
  
  const devServer = startDevServer();
  
  console.log('正在设置自动提交...');
  setupAutoCommit();
  
  console.log('==== 环境启动完成 ====');
  
  // 处理进程退出
  process.on('SIGINT', () => {
    console.log('\n正在关闭开发环境...');
    devServer.kill();
    process.exit(0);
  });
};

main(); 