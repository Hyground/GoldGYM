function toggleTheme() {
  const currentTheme = document.body.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme-preference', newTheme);
}

function applyInitialTheme() {
  const savedTheme = localStorage.getItem('theme-preference') || 'dark'; // Default to dark
  document.body.setAttribute('data-theme', savedTheme);
}

document.addEventListener('DOMContentLoaded', applyInitialTheme);
