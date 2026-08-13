import React, { useEffect, useState } from 'react';

const DarkModeToggle = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Default to dark mode unless explicitly saved as light
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.body.classList.remove('dark-theme');
    } else {
      setIsDarkMode(true);
      document.body.classList.add('dark-theme');
      if (!savedTheme) {
        localStorage.setItem('theme', 'dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn btn shadow-sm me-2 d-flex align-items-center justify-content-center"
      type="button"
      title="Toggle Dark Mode"
      aria-label="Toggle Dark Mode"
    >
      {isDarkMode ? (
        <i className="bi bi-sun-fill text-warning"></i>
      ) : (
        <i className="bi bi-moon-fill text-secondary"></i>
      )}
    </button>
  );
};

export default DarkModeToggle;
