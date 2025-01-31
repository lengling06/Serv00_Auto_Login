const fs = require('fs');
const puppeteer = require('puppeteer');

function formatToISO(date) {
  return date.toISOString().replace('T', ' ').replace('Z', '').replace(/\.\d{3}Z/, '');
}

async function delayTime(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const accountsJson = fs.readFileSync('accounts.json', 'utf-8');
  const accounts = JSON.parse(accountsJson);

  for (const account of accounts) {
    const { username, password, panelnum } = account;

    // ✅ 关键修改：无头模式 & 关闭 sandbox
    const browser = await puppeteer.launch({
      headless: 'new',  
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    let url = `https://panel${panelnum}.serv00.com/login/?next=/`;

    try {
      await page.goto(url);

      // 清空并输入用户名
      const usernameInput = await page.$('#id_username');
      if (usernameInput) {
        await usernameInput.click({ clickCount: 3 });
        await usernameInput.press('Backspace');
      }
      await page.type('#id_username', username);
      await page.type('#id_password', password);

      // 点击登录按钮
      const loginButton = await page.$('#submit');
      if (loginButton) {
        await loginButton.click();
      } else {
        throw new Error('无法找到登录按钮');
      }

      await page.waitForNavigation();

      // 判断是否成功登录
      const isLoggedIn = await page.evaluate(() => {
        return document.querySelector('a[href="/logout/"]') !== null;
      });

      if (isLoggedIn) {
        const nowUtc = formatToISO(new Date());
        const nowBeijing = formatToISO(new Date(new Date().getTime() + 8 * 60 * 60 * 1000));
        console.log(`账号 ${username} 于北京时间 ${nowBeijing}（UTC时间 ${nowUtc}）登录成功！`);
      } else {
        console.error(`账号 ${username} 登录失败，请检查账号和密码。`);
      }
    } catch (error) {
      console.error(`账号 ${username} 登录时出现错误: ${error}`);
    } finally {
      await page.close();
      await browser.close();

      const delay = Math.floor(Math.random() * 8000) + 1000;
      await delayTime(delay);
    }
  }

  console.log('所有账号登录完成！');
})();
