import { expect, test } from '@playwright/test';

test('home actions are vertical and contained on compact screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const send = page.getByRole('button', { name: '发送' });
  const receive = page.getByRole('button', { name: '接收' });
  await expect(send).toBeVisible();
  await expect(receive).toBeVisible();

  const sendBox = await send.boundingBox();
  const receiveBox = await receive.boundingBox();
  expect(sendBox).not.toBeNull();
  expect(receiveBox).not.toBeNull();
  expect(sendBox!.x).toBeGreaterThanOrEqual(16);
  expect(sendBox!.x + sendBox!.width).toBeLessThanOrEqual(374);
  expect(receiveBox!.x).toBeCloseTo(sendBox!.x, 0);
  expect(receiveBox!.y).toBeGreaterThan(sendBox!.y + sendBox!.height);
});

test('sender session and pairing code survive a refresh', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '发送' }).click();

  const code = page.getByLabel('配对码');
  await expect(code).toHaveText(/^\d{6}$/);
  const originalCode = await code.textContent();

  const storedSession = await page.evaluate(() => sessionStorage.getItem('p2-transfer:session'));
  expect(storedSession).toContain(originalCode);

  await page.reload();

  await expect(page.getByRole('heading', { name: '发送文件' })).toBeVisible();
  await expect(page.getByLabel('配对码')).toHaveText(originalCode!);
  await expect(page.getByRole('status').last()).toHaveText(/配对中|等待对方重新连接|已配对|已连接/);
});

test('both peers reconnect after the sender refreshes', async ({ browser }) => {
  const senderContext = await browser.newContext();
  const receiverContext = await browser.newContext();
  const sender = await senderContext.newPage();
  const receiver = await receiverContext.newPage();

  await sender.goto('/');
  await sender.getByRole('button', { name: '发送' }).click();
  const code = sender.getByLabel('配对码');
  await expect(code).toHaveText(/^\d{6}$/);
  const pairCode = await code.textContent();

  await receiver.goto('/');
  await receiver.getByRole('button', { name: '接收' }).click();
  await receiver.getByLabel('配对码').fill(pairCode!);
  await receiver.getByRole('button', { name: '连接' }).click();

  await expect(sender.getByRole('status').first()).toHaveText('已连接', { timeout: 15_000 });
  await expect(receiver.getByRole('status').first()).toHaveText('已连接', { timeout: 15_000 });

  await sender.reload();

  await expect(sender.getByLabel('配对码')).toHaveText(pairCode!);
  await expect(sender.getByRole('status').first()).toHaveText('已连接', { timeout: 15_000 });
  await expect(receiver.getByRole('status').first()).toHaveText('已连接', { timeout: 15_000 });

  await senderContext.close();
  await receiverContext.close();
});
