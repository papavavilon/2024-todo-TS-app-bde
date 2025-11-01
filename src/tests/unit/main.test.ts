import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';

const MODULE_PATH = '../../main';

let mod: any;

beforeEach(async () => {
    document.body.innerHTML = `
    <div class="progress-container">
        <div class="progress-bar-fill" id="progress-bar"></div>
        <span class="progress-text" id="progress-text"></span>
    </div>
    <form class="todo-form">
      <input id="todo-input" />
      <input id="due-date" />
      <select id="priority">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
      </select>
      <p id="error-message" style="display:none"></p>
    </form>
    <div class="action-buttons">
        <button id="sort-priority"></button>
    </div>
    <ul id="todo-list"></ul>
    <input id="colorPicker" />
  `;

    vi.resetModules();

    vi.spyOn(Date, 'now').mockReturnValue(1600000000000);

    mod = await import(MODULE_PATH);
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
});

describe('core todo functions (non-DOM logic)', () => {
    it('addTodo() adds a todo with default priority', () => {
        const {addTodo, todos} = mod;
        expect(Array.isArray(todos)).toBe(true);
        expect(todos.length).toBe(0);

        const todo = addTodo('Buy milk');

        expect(todos.length).toBe(1);
        const t = todos[0];
        expect(todo).toBe(t);
        expect(t.text).toBe('Buy milk');
        expect(t.id).toBe(1600000000000);
        expect(t.completed).toBe(false);
        expect(t.dueDate).toBe(undefined);
        expect(t.priority).toBe('medium');
    });

    it('addTodo() adds a todo with due date and specific priority', () => {
        const {addTodo, todos} = mod;

        vi.spyOn(Date, 'now').mockReturnValue(1600000000001);

        const todo = addTodo('  Buy bread  ', '2025-12-25', 'high');

        expect(todos.length).toBe(1);
        const t = todos[0];
        expect(todo).toBe(t);
        expect(t.text).toBe('Buy bread');
        expect(t.id).toBe(1600000000001);
        expect(t.completed).toBe(false);
        expect(t.dueDate).toBe('2025-12-25');
        expect(t.priority).toBe('high');
    });

    it('removeTodo() removes the todo with the given id', () => {
        const {addTodo, removeTodo} = mod;

        addTodo('First');

        vi.spyOn(Date, 'now').mockReturnValue(1600000000001);
        addTodo('Second');

        expect(mod.todos.length).toBe(2);
        const idToRemove = mod.todos[0].id;

        expect(removeTodo(idToRemove)).toBeTruthy();

        expect(mod.todos.find((x: any) => x.id === idToRemove)).toBeUndefined();
        expect(mod.todos.length).toBe(1);
        expect(mod.todos[0].text).toBe('Second');
    });


    it('toggleTodoCompletion() toggles completed flag and returns true when id found', () => {
        const {addTodo, toggleTodoCompletion, todos} = mod;

        addTodo('Toggle me');

        const id = todos[0].id;
        const r1 = toggleTodoCompletion(id);
        expect(r1).toBe(true);
        expect(todos[0].completed).toBe(true);

        const r2 = toggleTodoCompletion(id);
        expect(r2).toBe(true);
        expect(todos[0].completed).toBe(false);
    });

    it('toggleTodoCompletion() returns false when id not found', () => {
        const {toggleTodoCompletion} = mod;
        expect(toggleTodoCompletion(999999)).toBe(false);
    });
});

describe('isOverdue', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-11-10T10:00:00Z'));
    });

    it('returns false if no due date is provided', () => {
        const {isOverdue} = mod;
        expect(isOverdue(undefined)).toBe(false);
    });

    it('returns false for a future date', () => {
        const {isOverdue} = mod;
        expect(isOverdue('2025-11-11')).toBe(false);
    });

    it('returns false for today', () => {
        const {isOverdue} = mod;
        expect(isOverdue('2025-11-10')).toBe(false);
    });

    it('returns true for a past date', () => {
        const {isOverdue} = mod;
        expect(isOverdue('2025-11-09')).toBe(true);
    });

    it('returns true for a much older date', () => {
        const {isOverdue} = mod;
        expect(isOverdue('2020-01-01')).toBe(true);
    });
});


describe('sortTodosByPriority', () => {

    beforeEach(() => {
        mod.todos.length = 0;
    });

    it('sorts todos correctly: high > medium > low', () => {
        const {addTodo, sortTodosByPriority} = mod;

        addTodo('Medium item', undefined, 'medium');
        addTodo('High item', undefined, 'high');
        addTodo('Low item', undefined, 'low');

        let texts = mod.todos.map((t: any) => t.text);
        expect(texts).toEqual(['Medium item', 'High item', 'Low item']);

        sortTodosByPriority();

        texts = mod.todos.map((t: any) => t.text);
        expect(texts).toEqual(['High item', 'Medium item', 'Low item']);
    });

    it('maintains order for items with the same priority (stable sort)', () => {
        const {addTodo, sortTodosByPriority} = mod;

        addTodo('Medium 1', undefined, 'medium');
        addTodo('High 1', undefined, 'high');
        addTodo('Medium 2', undefined, 'medium');
        addTodo('Low 1', undefined, 'low');
        addTodo('High 2', undefined, 'high');

        sortTodosByPriority();

        const texts = mod.todos.map((t: any) => t.text);
        expect(texts).toEqual([
            'High 1',
            'High 2',
            'Medium 1',
            'Medium 2',
            'Low 1'
        ]);
    });

    it('handles an empty list', () => {
        const {sortTodosByPriority} = mod;
        expect(mod.todos.length).toBe(0);
        sortTodosByPriority();
        expect(mod.todos.length).toBe(0);
    });
});

// New test suite for the progress bar
describe('updateProgressBar', () => {
    let progressBar: HTMLDivElement;
    let progressText: HTMLSpanElement;

    beforeEach(() => {
        progressBar = document.getElementById('progress-bar') as HTMLDivElement;
        progressText = document.getElementById('progress-text') as HTMLSpanElement;
        mod.todos.length = 0; // Clear todos array
    });

    it('shows 0% for an empty list (0 / 0)', () => {
        mod.updateProgressBar();
        expect(progressBar.style.width).toBe('0%');
        expect(progressText.textContent).toBe('0 / 0 completed (0%)');
    });

    it('shows 0% when no items are completed (0 / 2)', () => {
        mod.todos.push({id: 1, text: 'a', completed: false});
        mod.todos.push({id: 2, text: 'b', completed: false});

        mod.updateProgressBar();
        expect(progressBar.style.width).toBe('0%');
        expect(progressText.textContent).toBe('0 / 2 completed (0%)');
    });

    it('shows 50% when half of items are completed (1 / 2)', () => {
        mod.todos.push({id: 1, text: 'a', completed: true});
        mod.todos.push({id: 2, text: 'b', completed: false});

        mod.updateProgressBar();
        expect(progressBar.style.width).toBe('50%');
        expect(progressText.textContent).toBe('1 / 2 completed (50%)');
    });

    it('shows 100% when all items are completed (2 / 2)', () => {
        mod.todos.push({id: 1, text: 'a', completed: true});
        mod.todos.push({id: 2, text: 'b', completed: true});

        mod.updateProgressBar();
        expect(progressBar.style.width).toBe('100%');
        expect(progressText.textContent).toBe('2 / 2 completed (100%)');
    });

    it('correctly rounds percentages (1 / 3)', () => {
        mod.todos.push({id: 1, text: 'a', completed: true});
        mod.todos.push({id: 2, text: 'b', completed: false});
        mod.todos.push({id: 3, text: 'c', completed: false});

        mod.updateProgressBar();
        expect(progressBar.style.width).toBe('33%'); // Math.round(33.3...)
        expect(progressText.textContent).toBe('1 / 3 completed (33%)');
    });
});