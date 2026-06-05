const https = require('https');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function main() {
  console.log('==========================================');
  console.log('  林一设计网站 · GitHub 仓库创建脚本');
  console.log('==========================================\n');
  console.log('使用方式：');
  console.log('1. 打开 https://github.com/settings/tokens');
  console.log('2. 点击 "Generate new token (classic)"');
  console.log('3. Note 填 "deploy-token"，勾选 "repo" 权限');
  console.log('4. 点击 Generate token，复制生成的 token');
  console.log('5. 把 token 粘贴到下方\n');

  const GITHUB_USER = await question('请输入你的 GitHub 用户名: ');
  const GITHUB_TOKEN = await question('请输入你的 GitHub Token: ');
  const REPO_NAME = (await question('请输入仓库名称（默认: linyi-designer）: ')) || 'linyi-designer';

  if (!GITHUB_USER || !GITHUB_TOKEN) {
    console.log('\n错误：用户名和 Token 不能为空。');
    rl.close();
    return;
  }

  console.log('\n正在创建 GitHub 仓库...');

  const postData = JSON.stringify({
    name: REPO_NAME,
    private: false,
    description: '林一室内设计个人网站'
  });

  const req = https.request({
    hostname: 'api.github.com',
    path: '/user/repos',
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'linyi-designer'
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.name === REPO_NAME) {
          console.log('仓库创建成功！');
          pushCode(GITHUB_USER, GITHUB_TOKEN, REPO_NAME);
        } else if (json.message && json.message.includes('already exists')) {
          console.log('仓库已存在，直接推送代码...');
          pushCode(GITHUB_USER, GITHUB_TOKEN, REPO_NAME);
        } else {
          console.log('创建失败:', json.message || json);
          rl.close();
        }
      } catch (e) {
        console.log('解析响应失败:', e.message);
        rl.close();
      }
    });
  });

  req.on('error', (err) => {
    console.log('请求失败:', err.message);
    rl.close();
  });

  req.write(postData);
  req.end();
}

function pushCode(user, token, repo) {
  try {
    console.log('正在推送代码...');
    execSync('git remote remove origin', { stdio: 'ignore' });
    execSync(`git remote add origin https://${user}:${token}@github.com/${user}/${repo}.git`, { stdio: 'inherit' });
    execSync('git branch -m main', { stdio: 'ignore' });
    execSync('git push -u origin main', { stdio: 'inherit' });
    console.log('\n代码推送成功！');
    console.log(`仓库地址: https://github.com/${user}/${repo}`);
  } catch (err) {
    console.log('\n推送失败，请检查网络连接或 Token 权限。');
  }
  rl.close();
}

main();
