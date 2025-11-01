import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';

const MODULE_PATH = '../../main';

let mod: any;

const localStorageMock = (() => {
    let store: { [key: string]: string } = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

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
        <button id="clear-all"></button>
        <button id="export-json"></button>
        <button id="import-json"></button>
    </div>

    <div class="filter-buttons">
        <button id="filter-all" class="filter-btn"></button>
        <button id="filter-active" class="filter-btn"></button>
        <button id="filter-completed" class="filter-btn"></button>
    </div>
    <input type="file" id="import-file" accept="application/json" style="display:none" />
    <ul id="todo-list"></ul>
    <input id="colorPicker" />
  `;

    vi.resetModules();
    vi.clearAllMocks();

    vi.spyOn(Date, 'now').mockReturnValue(1600000000000);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {
    });

    mod = await import(MODULE_PATH);

    mod.todos.length = 0;
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

describe('updateProgressBar', () => {
    let progressBar: HTMLDivElement;
    let progressText: HTMLSpanElement;

    beforeEach(() => {
        progressBar = document.getElementById('progress-bar') as HTMLDivElement;
        progressText = document.getElementById('progress-text') as HTMLSpanElement;
        mod.todos.length = 0;
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
        expect(progressBar.style.width).toBe('33%');
        expect(progressText.textContent).toBe('1 / 3 completed (33%)');
    });
});

describe('clearAllTodos', () => {
    it('should clear all todos, call render, and save to storage if confirmed', () => {
        const {addTodo, clearAllTodos} = mod;
        addTodo('Test todo');

        expect(mod.todos.length).toBe(1);

        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const setItemSpy = vi.spyOn(localStorageMock, 'setItem');

        clearAllTodos();

        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to clear all todos? This cannot be undone.');

        expect(mod.todos.length).toBe(0);

        expect(setItemSpy).toHaveBeenCalledWith('todos', '[]');
    });

    it('should not clear todos or call renderTodos if not confirmed', () => {
        const {addTodo, clearAllTodos} = mod;
        addTodo('Test todo');
        expect(mod.todos.length).toBe(1);

        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const setItemSpy = vi.spyOn(localStorageMock, 'setItem');
        const alertSpy = vi.spyOn(window, 'alert');

        clearAllTodos();

        expect(window.confirm).toHaveBeenCalled();
        expect(mod.todos.length).toBe(1);
        expect(setItemSpy).not.toHaveBeenCalled();
        expect(alertSpy).not.toHaveBeenCalled();
    });

    it('should show alert and not confirm if no todos exist', () => {
        const {clearAllTodos} = mod;
        expect(mod.todos.length).toBe(0);

        const confirmSpy = vi.spyOn(window, 'confirm');
        const alertSpy = vi.spyOn(window, 'alert');
        const setItemSpy = vi.spyOn(localStorageMock, 'setItem');

        clearAllTodos();

        expect(alertSpy).toHaveBeenCalledWith('No todos to clear');
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(setItemSpy).not.toHaveBeenCalled();
    });
});

describe('LocalStorage functions', () => {
    it('saveTodosToStorage() should stringify and save todos to localStorage', () => {
        const {addTodo, saveTodosToStorage, todos} = mod;
        addTodo('Save me');

        saveTodosToStorage();

        const expectedJSON = JSON.stringify(todos);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('todos', expectedJSON);
    });

    it('loadTodosFromStorage() should load and parse todos from localStorage', () => {
        const sampleTodos = [{id: 1, text: 'Loaded todo', completed: false, priority: 'medium'}];
        localStorageMock.getItem.mockReturnValue(JSON.stringify(sampleTodos));

        mod.loadTodosFromStorage();

        expect(localStorageMock.getItem).toHaveBeenCalledWith('todos');
        expect(mod.todos).toEqual(sampleTodos);
    });

    it('loadTodosFromStorage() should handle empty storage', () => {
        localStorageMock.getItem.mockReturnValue(null);
        mod.loadTodosFromStorage();
        expect(mod.todos).toEqual([]);
    });

    it('loadTodosFromStorage() should handle invalid JSON', () => {
        localStorageMock.getItem.mockReturnValue('invalid json');
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        });

        mod.loadTodosFromStorage();

        expect(mod.todos).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});

describe('Import/Export', () => {
    afterEach(() => {
        if ((global as any).__ORIG_FileReader) {
            global.FileReader = (global as any).__ORIG_FileReader;
            delete (global as any).__ORIG_FileReader;
        }
        vi.restoreAllMocks();
    });

    it('exportTodos shows alert when no todos', () => {
        const {exportTodos} = mod;
        mod.todos.length = 0;

        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {
        });
        exportTodos();
        expect(alertSpy).toHaveBeenCalledWith('No todos to export.');
        alertSpy.mockRestore();
    });

    it('importTodos returns early if no file selected', () => {
        const {importTodos} = mod;
        const event = {target: {files: []}} as unknown as Event;
        expect(() => importTodos(event)).not.toThrow();
    });
});

describe('Filtering functions', () => {
    let filterAllBtn: HTMLButtonElement;
    let filterActiveBtn: HTMLButtonElement;
    let filterCompletedBtn: HTMLButtonElement;
    let todoList: HTMLUListElement;

    beforeEach(() => {
        filterAllBtn = document.getElementById('filter-all') as HTMLButtonElement;
        filterActiveBtn = document.getElementById('filter-active') as HTMLButtonElement;
        filterCompletedBtn = document.getElementById('filter-completed') as HTMLButtonElement;
        todoList = document.getElementById('todo-list') as HTMLUListElement;

        vi.spyOn(mod, 'renderTodos').mockImplementation(() => {});

        mod.setFilter('all');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('updateFilterButtons() correctly toggles "active" class', () => {
        mod.setFilter('all');
        mod.updateFilterButtons();
        expect(filterAllBtn.classList.contains('active')).toBe(true);
        expect(filterActiveBtn.classList.contains('active')).toBe(false);
        expect(filterCompletedBtn.classList.contains('active')).toBe(false);

        mod.setFilter('active');
        mod.updateFilterButtons();
        expect(filterAllBtn.classList.contains('active')).toBe(false);
        expect(filterActiveBtn.classList.contains('active')).toBe(true);
        expect(filterCompletedBtn.classList.contains('active')).toBe(false);

        mod.setFilter('completed');
        mod.updateFilterButtons();
        expect(filterAllBtn.classList.contains('active')).toBe(false);
        expect(filterActiveBtn.classList.contains('active')).toBe(false);
        expect(filterCompletedBtn.classList.contains('active')).toBe(true);
    });

    describe('renderTodos filtering logic', () => {
        beforeEach(() => {
            vi.restoreAllMocks();

            vi.spyOn(localStorageMock, 'setItem');

            mod.todos.length = 0;
            mod.addTodo('Active Item');
            const completedTodo = mod.addTodo('Completed Item');
            mod.toggleTodoCompletion(completedTodo.id);
        });

        it('renders all todos when filter is "all"', () => {
            mod.setFilter('all');

            const items = todoList.querySelectorAll('.todo-item');
            expect(items.length).toBe(2);
        });

        it('renders only active todos when filter is "active"', () => {
            mod.setFilter('active');

            const items = todoList.querySelectorAll('.todo-item');
            expect(items.length).toBe(1);
        });

        it('renders only completed todos when filter is "completed"', () => {
            mod.setFilter('completed');

            const items = todoList.querySelectorAll('.todo-item');
            expect(items.length).toBe(1);
        });
    });
});