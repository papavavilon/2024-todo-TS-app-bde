import {Selector, ClientFunction} from 'testcafe';

const APP_URL = 'http://localhost:5173';

fixture`Todo App E2E`
    .page(APP_URL)
    .beforeEach(async t => {
        await t.navigateTo(APP_URL);
    });

const getBodyBg = ClientFunction(() => window.getComputedStyle(document.body).backgroundColor);


test('Add, toggle, edit and remove a todo', async t => {
    const input = Selector('#todo-input');
    const todoList = Selector('#todo-list');
    const todoItem = (text: string) => todoList.find('.todo-item').withText(text);

    await t.typeText(input, 'E2E item').pressKey('enter');

    await t.expect(todoItem('E2E item').exists).ok();
    const item = todoItem('E2E item');

    const checkbox = item.find('.todo-checkbox');
    await t.click(checkbox);
    await t.expect(item.hasClass('completed')).ok();

    await t.click(checkbox);
    await t.expect(item.hasClass('completed')).notOk();

    await t.setNativeDialogHandler(() => 'E2E item (edited)');
    const editBtn = item.find('.edit-btn');
    await t.click(editBtn);

    await t.expect(todoItem('E2E item (edited)').exists).ok();

    const removedItem = todoItem('E2E item (edited)');
    const removeBtn = removedItem.find('.remove-btn');
    await t.click(removeBtn);

    await t.expect(todoItem('E2E item (edited)').exists).notOk();
});

test('Color picker changes page background', async t => {
    await ClientFunction(() => {
        const cp = document.getElementById('colorPicker') as HTMLInputElement | null;
        if (cp) {
            cp.value = '#ff0000';
            cp.dispatchEvent(new Event('input', {bubbles: true}));
        }
    })();

    await t.expect(getBodyBg()).eql('rgb(255, 0, 0)');
});

test('Form validation shows error for empty submit', async t => {
    const input = Selector('#todo-input');
    const errorMessage = Selector('#error-message');

    await t.selectText(input).pressKey('delete');

    await t.click(input).pressKey('enter');

    await t.expect(errorMessage.visible).ok();
    await t.expect(input.hasClass('input-error')).ok();
});
