import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const MODULE_PATH = '../../main';

let mod: any;

beforeEach(async () => {
  document.body.innerHTML = `
    <form class="todo-form">
      <input id="todo-input" />
      <p id="error-message" style="display:none"></p>
    </form>
    <ul id="todo-list"></ul>
    <input id="colorPicker" />
  `;

  vi.resetModules();

  vi.spyOn(Date, 'now').mockReturnValue(1600000000000);

  mod = await import(MODULE_PATH);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('core todo functions (non-DOM logic)', () => {
  it('addTodo() adds a todo with correct shape and deterministic id', () => {
    const { addTodo, todos } = mod;
    expect(Array.isArray(todos)).toBe(true);
    expect(todos.length).toBe(0);

    const todo = addTodo('Buy milk');

    expect(todos.length).toBe(1);
    const t = todos[0];
    expect(todo).toBe(t)
    expect(t.text).toBe('Buy milk');
    expect(t.id).toBe(1600000000000);
    expect(t.completed).toBe(false);
  });

  it('removeTodo() removes the todo with the given id', () => {
    const { addTodo, removeTodo } = mod;

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
    const { addTodo, toggleTodoCompletion, todos } = mod;

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
    const { toggleTodoCompletion } = mod;
    expect(toggleTodoCompletion(999999)).toBe(false);
  });
});
