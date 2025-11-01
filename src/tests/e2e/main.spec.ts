import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:5173';

test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
});

test('Add, toggle, edit and remove a todo', async ({ page }) => {
    const input = page.locator('#todo-input');
    const todoList = page.locator('#todo-list');
    const todoItem = (text: string) => todoList.locator('.todo-item', { hasText: text });

    await input.fill('E2E item');
    await input.press('Enter');

    await expect(todoItem('E2E item')).toBeVisible();
    const item = todoItem('E2E item');

    const checkbox = item.locator('.todo-checkbox');
    await checkbox.click();
    await expect(item).toHaveClass(/completed/);

    await checkbox.click();
    await expect(item).not.toHaveClass(/completed/);

    page.on('dialog', async dialog => {
        await dialog.accept('E2E item (edited)');
    });
    const editBtn = item.locator('.edit-btn');
    await editBtn.click();

    await expect(todoItem('E2E item (edited)')).toBeVisible();

    const removedItem = todoItem('E2E item (edited)');
    const removeBtn = removedItem.locator('.remove-btn');
    await removeBtn.click();

    await expect(todoItem('E2E item (edited)')).not.toBeVisible();
});

test('Color picker changes page background', async ({ page }) => {
    await page.evaluate(() => {
        const cp = document.getElementById('colorPicker') as HTMLInputElement | null;
        if (cp) {
            cp.value = '#ff0000';
            cp.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    const bodyBg = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
    });

    expect(bodyBg).toBe('rgb(255, 0, 0)');
});

test('Form validation shows error for empty submit', async ({ page }) => {
    const input = page.locator('#todo-input');
    const errorMessage = page.locator('#error-message');

    await input.fill('');
    await input.press('Enter');

    await expect(errorMessage).toBeVisible();
    await expect(input).toHaveClass(/input-error/);
});
