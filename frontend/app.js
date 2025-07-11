// Toggle between login and registration forms
const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
const registerLink = document.getElementById('register-link');
const loginLink = document.getElementById('login-link');

if (registerLink && loginLink && loginSection && registerSection) {
    registerLink.addEventListener('click', function(e) {
        e.preventDefault();
        loginSection.style.display = 'none';
        registerSection.style.display = 'block';
    });
    loginLink.addEventListener('click', function(e) {
        e.preventDefault();
        registerSection.style.display = 'none';
        loginSection.style.display = 'block';
    });
}

function loadTodosForUser(username) {
    fetch(`http://127.0.0.1:8000/todos?username=${encodeURIComponent(username)}`)
        .then(response => response.json())
        .then(todos => {
            const ul = document.getElementById('todos');
            ul.innerHTML = '';
            todos.forEach(todo => {
                const li = document.createElement('li');
                li.style.display = 'flex';
                li.style.alignItems = 'center';
                li.style.justifyContent = 'space-between';

                // Text links (wird ggf. ersetzt durch Input)
                const textSpan = document.createElement('span');
                textSpan.textContent = todo.text + (todo.completed ? " (done)" : "");
                textSpan.style.flex = '1';
                textSpan.style.marginLeft = '10px';

                // Bearbeiten-Button
                const editBtn = document.createElement('button');
                editBtn.textContent = '✏️';
                editBtn.className = 'edit-btn';
                editBtn.style.marginRight = '10px';
                editBtn.onclick = function() {
                    // Editiermodus: Text durch Input ersetzen
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = todo.text;
                    input.style.flex = '1';
                    input.style.marginLeft = '10px';
                    const saveBtn = document.createElement('button');
                    saveBtn.textContent = '💾';
                    saveBtn.className = 'save-btn';
                    saveBtn.onclick = function() {
                        const newText = input.value.trim();
                        if (newText && newText !== todo.text) {
                            fetch(`http://127.0.0.1:8000/todos/${todo.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: newText })
                            })
                            .then(() => loadTodosForUser(username));
                        } else {
                            loadTodosForUser(username); // Abbrechen oder kein Text geändert
                        }
                    };
                    // Enter speichert, Escape bricht ab
                    input.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') saveBtn.click();
                        if (e.key === 'Escape') loadTodosForUser(username);
                    });
                    // Ersetze Text und Edit-Button durch Input und Save
                    li.replaceChild(input, textSpan);
                    li.replaceChild(saveBtn, editBtn);
                    input.focus();
                };

                // Checkbox rechts neben dem Eimer
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = todo.completed;
                checkbox.className = 'todo-checkbox';
                checkbox.style.marginRight = '10px';
                checkbox.onchange = function() {
                    fetch(`http://127.0.0.1:8000/todos/${todo.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ completed: checkbox.checked })
                    })
                    .then(() => loadTodosForUser(username));
                };

                // Mülleimer-Button ganz rechts
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.className = 'delete-btn';
                deleteBtn.onclick = function() {
                    deleteTodo(todo.id, username);
                };

                li.appendChild(textSpan);
                li.appendChild(editBtn);
                li.appendChild(checkbox);
                li.appendChild(deleteBtn);
                ul.appendChild(li);
            });
        });
}

function deleteTodo(todoId, username) {
    fetch(`http://127.0.0.1:8000/todos/${todoId}`, {
        method: 'DELETE'
    })
    .then(() => {
        loadTodosForUser(username);
    });
}

// Hilfsfunktion: Sichtbarkeit der Bereiche steuern
function showSection(section) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('todo-section').style.display = 'none';
    document.getElementById(section).style.display = 'block';
}

// Login-Handler
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) errorDiv.textContent = '';
        fetch('http://127.0.0.1:8000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === "Login successful") {
                localStorage.setItem('username', username);
                showSection('todo-section');
                loadTodosForUser(username);
            } else {
                if (errorDiv) errorDiv.textContent = data.detail || "Login fehlgeschlagen";
            }
        })
        .catch(() => {
            if (errorDiv) errorDiv.textContent = "Serverfehler beim Login.";
        });
    });
}

// Registrierungs-Handler
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const errorDiv = document.getElementById('register-error');
        if (errorDiv) errorDiv.textContent = '';
        fetch('http://127.0.0.1:8000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === "User registered successfully") {
                localStorage.setItem('username', username);
                showSection('todo-section');
                loadTodosForUser(username);
            } else {
                if (errorDiv) errorDiv.textContent = data.detail || "Registrierung fehlgeschlagen";
            }
        })
        .catch(() => {
            if (errorDiv) errorDiv.textContent = "Serverfehler bei der Registrierung.";
        });
    });
}

// Beim Laden der Seite prüfen, ob ein User eingeloggt ist
window.addEventListener('DOMContentLoaded', function() {
    const username = localStorage.getItem('username');
    if (username) {
        showSection('todo-section');
        loadTodosForUser(username);
    } else {
        showSection('login-section');
    }
});


document.getElementById('todo-form').addEventListener('submit', function(e) {
    e.preventDefault(); // Verhindert das Neuladen der Seite
    const text = document.getElementById('todo-title').value;
    const username = localStorage.getItem('username'); // Username aus Login oder als Platzhalter

    fetch('http://127.0.0.1:8000/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, username })
    })
    .then(response => response.json())
    .then(todo => {
        document.getElementById('todo-title').value = ''; // Eingabefeld leeren
        loadTodosForUser(username); // Liste neu laden
    });
});

// Logout-Handler
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('username');
        showSection('login-section');
        // Todo-Liste leeren
        const ul = document.getElementById('todos');
        if (ul) ul.innerHTML = '';
    });
}
