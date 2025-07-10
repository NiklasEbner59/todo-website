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
