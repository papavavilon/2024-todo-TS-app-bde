/**
 * Todo Application
 * Features: Completion toggle, Due Dates, Priority, Progress Bar, Local Storage
 */


// 1 Import the CSS file: This ensures that the styles are applied to the HTML elements.
import './style.css';

// Step 2: Define the Todo interface
// Define the Todo interface: This interface defines the structure of a todo item.

export type priority = 'low' | 'medium' | 'high';

export interface Todo {
    id: number;
    text: string;
    dueDate?: string;
    completed: boolean;
    priority: priority;
}

// Step 3: Initialize an empty array to store todos
// Initialize an empty array: This array will store the list of todos.
export let todos: Todo[] = [];

// Step 4: Get references to the HTML elements
// Get references to the HTML elements: These references will be used to interact with the DOM
const todoInput = document.getElementById('todo-input') as HTMLInputElement; // exist in HTML file
const todoForm = document.querySelector('.todo-form') as HTMLFormElement;    // exist in HTML file
const todoList = document.getElementById('todo-list') as HTMLUListElement;   // exist in HTML file
const errorMessage = document.getElementById('error-message') as HTMLParagraphElement; // Should be moved to the top + added to the HTML file
const dueDateInput = document.getElementById('due-date') as HTMLInputElement;
const prioritySelect = document.getElementById('priority') as HTMLSelectElement;
const sortButton = document.getElementById('sort-priority') as HTMLButtonElement;
const progressBar = document.getElementById('progress-bar') as HTMLDivElement;
const progressText = document.getElementById('progress-text') as HTMLSpanElement;
const clearAllButton = document.getElementById('clear-all') as HTMLButtonElement;

const STORAGE_KEY = 'todos';

export const loadTodosFromStorage = (): void => {
    try {
        const storedTodos = localStorage.getItem(STORAGE_KEY);
        if (storedTodos) {
            todos = JSON.parse(storedTodos);
            console.log('Todos loaded from storage:', todos);
        }
    } catch (error) {
        console.error('Error loading todos from storage:', error);
        errorMessage.textContent = 'Error loading saved todos';
        errorMessage.style.display = 'block';
    }
};


export const saveTodosToStorage = (): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
        console.log('Todos saved to storage');
    } catch (error) {
        console.error('Error saving todos to storage:', error);
    }
};


// Step 5: Function to add a new todo
// Function to add a new todo: This function creates a new todo object and adds it to the array.
export const addTodo = (text: string, dueDate?: string, priority: priority = 'medium'): Todo => {
    const newTodo: Todo = {
        id: Date.now(), // Generate a unique ID based on the current timestamp
        text: text.trim(),
        dueDate: dueDate || undefined,
        completed: false,
        priority: priority,
    };
    todos.push(newTodo);
    console.log("Todo added: ", todos); // Log the updated list of todos to the console
    renderTodos(); // Render the updated list of todos => create the function next
    return newTodo;
};

// Step 6: Function to render the list of todos
// Function to render the list of todos: This function updates the DOM to display the current list of todos.
const renderTodos = (): void => { // void because no return - what we are doing is updating the DOM
    saveTodosToStorage();

    // Clear the current list
    todoList.innerHTML = '';

    // Iterate over the todos array and create list items for each todo
    todos.forEach(todo => { // In this specific case, .forEach is more suitable because we are directly modifying the DOM for each todo item.
        const li = document.createElement('li');
        li.className = 'todo-item'; // Add a class to the list item
        // Use template literals to create the HTML content for each list item

        if (isOverdue(todo.dueDate) && !todo.completed) {
            li.classList.add('overdue');
        }

        if (todo.completed) {
            li.classList.add('completed');
        }

        let dueDateDisplay = '';
        if (todo.dueDate) {
            const now = new Date();
            const due = new Date(todo.dueDate);
            const diffMs = due.getTime() - now.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMs < 0) {
                dueDateDisplay = `<span class="due-date overdue">Overdue by ${Math.abs(diffDays)} day(s)</span>`;
            } else {
                dueDateDisplay = `<span class="due-date">Due in ${diffDays} day(s)</span>`;
            }
        }

        const priorityBadge = `<span class="priority-badge priority-${todo.priority}">${todo.priority}</span>`;

        li.innerHTML = `
            <div class="todo-content">
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} />
                <span class="todo-text">${todo.text}</span>
                ${priorityBadge}
                ${dueDateDisplay}
                <div class="todo-actions">
                    <button class="edit-btn">Edit</button>
                    <button class="remove-btn">Remove</button>
                </div>
            </div>
        `;
        addCheckboxListener(li, todo.id);

        // addRemoveButtonListener is further down in the code. We have onclick in the function instead of template literals. More safe to use addEventListener.
        addRemoveButtonListener(li, todo.id); // Add event listener to the remove button. li is the parent element, and todo.id is the ID of the todo.
        addEditButtonListener(li, todo.id); // Add event listener to the remove button. li is the parent element, and todo.id is the ID of the todo.
        todoList.appendChild(li); // Append the list item to the ul element
    });

    updateProgressBar();
};

// Step 8: Function to removes all a todo by ID
// Function to add event listener to the remove button - this function has an callback function that removes the todo item from the array.
const addRemoveButtonListener = (li: HTMLLIElement, id: number): void => {
    const removeButton = li.querySelector('.remove-btn');
    removeButton?.addEventListener('click', () => removeTodo(id)); // We have an optional chaining operator here to avoid errors if the button is not found - for example, if the button is removed from the DOM.
};
/*
example of explicit null checking - without optional chaining operator, but basically the same as above
const addRemoveButtonListener = (li: HTMLLIElement, id: number): void => {
  const removeButton = li.querySelector('button');
  if (removeButton) {
    removeButton.addEventListener('click', () => removeTodoById(id));
  } else {
    console.error(`Remove button not found for todo item with ID: ${id}`);
  }
};
*/


// Step 8: Function to remove a todo by ID
// Function to remove a todo by ID: This function removes a todo from the array based on its ID.
export const removeTodo = (id: number): boolean => {
    const initialLength = todos.length;
    todos = todos.filter(todo => todo.id !== id);
    if (todos.length < initialLength) {
        renderTodos();  // Re-render the updated list of todos
        return true;
    }
    return false;
};


// Edit event listener - make button and add button to each todo
const addEditButtonListener = (li: HTMLLIElement, id: number) => {
    // make use of the editBtn id to edit the todo
    const editButton = li.querySelector('.edit-btn');
    editButton?.addEventListener('click', () => editTodo(id))
}

// Edit function - prompt user to edit the todo : editTodo
const editTodo = (id: number) => {
    const todo = todos.find(todo => todo.id === id)
    if (todo) {
        const text = prompt('Edit todo', todo.text)
        if (text) {
            todo.text = text
            renderTodos()
        }
    }
}

/**
 * color picker
 */

// Function to change the background color of the page based on the color picker value
const changeBackgroundColor = (color: string): void => {
    document.body.style.backgroundColor = color;
};

// Function to initialize the color picker event listener
const initializeColorPicker = (): void => {
    const colorPicker = document.getElementById('colorPicker') as HTMLInputElement; // encapsulate the color picker element to this function
    if (colorPicker) {
        colorPicker.addEventListener('input', (event: Event) => {
            const target = event.target as HTMLInputElement;
            changeBackgroundColor(target.value);
        });
    } else {
        console.error('Color picker element not found');
    }
};

export const toggleTodoCompletion = (id: number): boolean => {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        console.log(`Todo ${id} completion toggled to:`, todo.completed);
        renderTodos();
        return true;
    }
    return false;
};


const addCheckboxListener = (li: HTMLLIElement, id: number): void => {
    const checkbox = li.querySelector('.todo-checkbox') as HTMLInputElement;
    checkbox?.addEventListener('change', () => toggleTodoCompletion(id));
};

export const isOverdue = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    return due < today;
};

export const sortTodosByPriority = (): void => {
    const priorityOrder = {high: 1, medium: 2, low: 3};
    todos.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    renderTodos();
    console.log('Todos sorted by priority');
};

export const updateProgressBar = (): void => {
    if (!progressBar || !progressText) return;

    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${completed} / ${total} completed (${percentage}%)`;
};


export const clearAllTodos = (): void => {
    if (todos.length === 0) {
        alert('No todos to clear');
        return;
    }

    if (confirm('Are you sure you want to clear all todos? This cannot be undone.')) {
        todos = [];
        renderTodos();
        console.log('All todos cleared');
    }
};


const initializeApp = (): void => {
    loadTodosFromStorage();
    renderTodos();
    initializeColorPicker();

    if (sortButton) {
        sortButton.addEventListener('click', sortTodosByPriority);
    }

    if (clearAllButton) {
        clearAllButton.addEventListener('click', clearAllTodos);
    }

    // Step 7: Event listener for the form submission
    // Event listener for the form submission: This listener handles the form submission, adds the new todo, and clears the input field.
    if (todoForm) {
        todoForm.addEventListener('submit', (event: Event) => {
            event.preventDefault(); // Prevent the default form submission behavior
            const text = todoInput.value.trim(); // Get the value of the input field and remove any leading or trailing whitespace
            const dueDate = dueDateInput.value;
            const priority = prioritySelect.value as priority;

            if (text === '') {
                console.log("Please enter a todo item"); // Provide feedback to the user
                todoInput.classList.add('input-error'); // Add a class to highlight the error
                errorMessage.style.display = 'block'; // Show the error message
                return;
            }

            todoInput.classList.remove('input-error'); // Remove the error highlight if present
            errorMessage.style.display = 'none'; // Hide the error message

            addTodo(text, dueDate, priority); // Add the todo item

            todoInput.value = ''; // Clear the input field
            dueDateInput.value = '';
        });
    }

    console.log('Todo app initialized');
};


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
