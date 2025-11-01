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

test('Add a todo with a due date', async ({ page }) => {
    const input = page.locator('#todo-input');
    const dueDateInput = page.locator('#due-date');
    const todoList = page.locator('#todo-list');

    await input.fill('Todo with due date');
    await dueDateInput.fill('2025-12-25');

    await input.press('Enter');

    const item = todoList.locator('.todo-item', { hasText: 'Todo with due date' });
    await expect(item).toBeVisible();

    const dueDateSpan = item.locator('.due-date');
    await expect(dueDateSpan).toBeVisible();
    await expect(dueDateSpan).toHaveText(/Due in \d+ day\(s\)/);
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


test('Add a todo with a specific priority', async ({ page }) => {
    const input = page.locator('#todo-input');
    const prioritySelect = page.locator('#priority');
    const todoList = page.locator('#todo-list');
    const submitBtn = page.locator('button[type="submit"]');

    await input.fill('High priority item');
    await prioritySelect.selectOption('high');
    await submitBtn.click();

    const highItem = todoList.locator('.todo-item', { hasText: 'High priority item' });
    await expect(highItem).toBeVisible();
    await expect(highItem.locator('.priority-badge')).toHaveClass(/priority-high/);

    await input.fill('Low priority item');
    await prioritySelect.selectOption('low');
    await submitBtn.click();

    const lowItem = todoList.locator('.todo-item', { hasText: 'Low priority item' });
    await expect(lowItem).toBeVisible();
    await expect(lowItem.locator('.priority-badge')).toHaveClass(/priority-low/);

    await input.fill('Medium priority item');
    await prioritySelect.selectOption('medium');
    await submitBtn.click();

    const mediumItem = todoList.locator('.todo-item', { hasText: 'Medium priority item' });
    await expect(mediumItem).toBeVisible();
    await expect(mediumItem.locator('.priority-badge')).toHaveClass(/priority-medium/);
});

test('Sort todos by priority', async ({ page }) => {
    const input = page.locator('#todo-input');
    const prioritySelect = page.locator('#priority');
    const todoList = page.locator('#todo-list');
    const submitBtn = page.locator('button[type="submit"]');
    const sortBtn = page.locator('#sort-priority');

    await input.fill('Medium item');
    await prioritySelect.selectOption('medium');
    await submitBtn.click();

    await input.fill('High item');
    await prioritySelect.selectOption('high');
    await submitBtn.click();

    await input.fill('Low item');
    await prioritySelect.selectOption('low');
    await submitBtn.click();

    const items = todoList.locator('.todo-item');
    await expect(items.nth(0)).toContainText('Medium item');
    await expect(items.nth(1)).toContainText('High item');
    await expect(items.nth(2)).toContainText('Low item');

    await sortBtn.click();

    await expect(items.nth(0)).toContainText('High item');
    await expect(items.nth(1)).toContainText('Medium item');
    await expect(items.nth(2)).toContainText('Low item');
});

test.describe('Progress Bar', () => {
    test('updates correctly when adding, toggling, and removing todos', async ({ page }) => {
        const input = page.locator('#todo-input');
        const todoList = page.locator('#todo-list');
        const progressBar = page.locator('#progress-bar');
        const progressText = page.locator('#progress-text');
        const submitBtn = page.locator('button[type="submit"]');

        await expect(progressText).toHaveText('0 / 0 completed (0%)');
        await expect(progressBar).toHaveAttribute('style', 'width: 0%;');

        await input.fill('Item 1');
        await submitBtn.click();
        await expect(progressText).toHaveText('0 / 1 completed (0%)');
        await expect(progressBar).toHaveAttribute('style', 'width: 0%;');

        await input.fill('Item 2');
        await submitBtn.click();
        await expect(progressText).toHaveText('0 / 2 completed (0%)');
        await expect(progressBar).toHaveAttribute('style', 'width: 0%;');

        const item1 = todoList.locator('.todo-item', { hasText: 'Item 1' });
        await item1.locator('.todo-checkbox').click();
        await expect(progressText).toHaveText('1 / 2 completed (50%)');
        await expect(progressBar).toHaveAttribute('style', 'width: 50%;');

        const item2 = todoList.locator('.todo-item', { hasText: 'Item 2' });
        await item2.locator('.todo-checkbox').click();
        await expect(progressText).toHaveText('2 / 2 completed (100%)');
        await expect(progressBar).toHaveAttribute('style', 'width: 100%;');

        await item1.locator('.todo-checkbox').click();
        await expect(progressText).toHaveText('1 / 2 completed (50%)');
        await expect(progressBar).toHaveAttribute('style', 'width: 50%;');

        await item2.locator('.remove-btn').click();
        await expect(progressText).toHaveText('0 / 1 completed (0%)');
        await expect(progressBar).toHaveAttribute('style', 'width: 0%;');

        await item1.locator('.remove-btn').click();
        await expect(progressText).toHaveText('0 / 0 completed (0%)');
        await expect(progressBar).toHaveAttribute('style', 'width: 0%;');
    });
});