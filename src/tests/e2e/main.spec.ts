import {test, expect} from '@playwright/test';

const APP_URL = 'http://localhost:5173';

test.beforeEach(async ({page}) => {
    await page.goto(APP_URL);
});

test('Add, toggle, edit and remove a todo', async ({page}) => {
    const input = page.locator('#todo-input');
    const todoList = page.locator('#todo-list');
    const todoItem = (text: string) => todoList.locator('.todo-item', {hasText: text});

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

test('Color picker changes page background', async ({page}) => {
    await page.evaluate(() => {
        const cp = document.getElementById('colorPicker') as HTMLInputElement | null;
        if (cp) {
            cp.value = '#ff0000';
            cp.dispatchEvent(new Event('input', {bubbles: true}));
        }
    });

    const bodyBg = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
    });

    expect(bodyBg).toBe('rgb(255, 0, 0)');
});

test('Form validation shows error for empty submit', async ({page}) => {
    const input = page.locator('#todo-input');
    const errorMessage = page.locator('#error-message');

    await input.fill('');
    await input.press('Enter');

    await expect(errorMessage).toBeVisible();
    await expect(input).toHaveClass(/input-error/);
});

test('Add a todo with a due date', async ({page}) => {
    const input = page.locator('#todo-input');
    const dueDateInput = page.locator('#due-date');
    const todoList = page.locator('#todo-list');

    await input.fill('Todo with due date');
    await dueDateInput.fill('2025-12-25');

    await input.press('Enter');

    const item = todoList.locator('.todo-item', {hasText: 'Todo with due date'});
    await expect(item).toBeVisible();

    const dueDateSpan = item.locator('.due-date');
    await expect(dueDateSpan).toBeVisible();

    await expect(dueDateSpan).toHaveText(/12/);
    await expect(dueDateSpan).toHaveText(/25/);
    await expect(dueDateSpan).toHaveText(/2025/);
});

test.describe('Overdue item styling', () => {
    test.beforeEach(async ({page}) => {
        const FAKE_NOW = new Date('2025-11-10T10:00:00Z').getTime();

        await page.addInitScript((fakeTime) => {
            let mockTime = fakeTime;
            const todayTime = fakeTime;

            Date.now = () => {
                mockTime += 1;
                return mockTime;
            };

            const OriginalDate = Date;

            class MockDate extends OriginalDate {
                constructor(...args: any[]) {
                    if (args.length === 0) {
                        super(todayTime);
                    } else {
                        // @ts-ignore
                        super(...args);
                    }
                }
            }

            // @ts-ignore
            Date = MockDate;
        }, FAKE_NOW);

        await page.goto(APP_URL);
    });

    test('overdue todo has .overdue class', async ({page}) => {
        const input = page.locator('#todo-input');
        const dueDateInput = page.locator('#due-date');
        const todoList = page.locator('#todo-list');

        await input.fill('Overdue item');
        await dueDateInput.fill('2025-11-09');

        await page.locator('button[type="submit"]').click();

        const overdueItem = todoList.locator('.todo-item', {hasText: 'Overdue item'});
        await expect(overdueItem).toBeVisible();
        await expect(overdueItem).toHaveClass(/overdue/);

        await input.fill('Item due today');
        await dueDateInput.fill('2025-11-10');
        await page.locator('button[type="submit"]').click();

        const todayItem = todoList.locator('.todo-item', {hasText: 'Item due today'});
        await expect(todayItem).toBeVisible();
        await expect(todayItem).not.toHaveClass(/overdue/);

        await input.fill('Future item');
        await dueDateInput.fill('2025-11-11');
        await page.locator('button[type="submit"]').click();

        const futureItem = todoList.locator('.todo-item', {hasText: 'Future item'});
        await expect(futureItem).toBeVisible();
        await expect(futureItem).not.toHaveClass(/overdue/);
    });
});