import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取当前日期和时间
const getDateTime = () => {
  const now = new Date();
  return now.toLocaleString().replace(/[/,:]/g, '-');
};

// 执行Git命令
const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(`执行命令出错: ${error}`);
        return reject(error);
      }
      if (stderr) {
        console.log(`命令输出(stderr): ${stderr}`);
      }
      console.log(`命令输出(stdout): ${stdout}`);
      resolve(stdout);
    });
  });
};

// 检测更改并提交
const autoCommit = async () => {
  try {
    // 检查是否有更改
    const status = await execCommand('git status --porcelain');
    
    if (status.trim() === '') {
      console.log('没有检测到更改，跳过提交');
      return;
    }
    
    // 添加所有更改
    await execCommand('git add .');
    
    // 提交更改
    const dateTime = getDateTime();
    await execCommand(`git commit -m "自动提交: ${dateTime}"`);
    
    console.log('自动提交完成');
    
  } catch (error) {
    console.error('自动提交过程中发生错误:', error);
  }
};

// 执行自动提交
autoCommit(); 