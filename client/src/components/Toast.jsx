import React, { useEffect } from 'react';

const Toast = ({ id, message, type = 'primary', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 4500); // Automatically dismiss toast after 4.5 seconds
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const getBorderColor = () => {
    switch (type) {
      case 'success': return 'var(--secondary)';
      case 'danger': return 'var(--danger)';
      case 'warning': return 'var(--accent)';
      default: return 'var(--primary)';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return 'bi-check-circle-fill text-success';
      case 'danger': return 'bi-exclamation-triangle-fill text-danger';
      case 'warning': return 'bi-exclamation-circle-fill text-warning';
      default: return 'bi-info-circle-fill text-primary';
    }
  };

  return (
    <div
      className="toast-custom"
      style={{ borderLeft: `5px solid ${getBorderColor()}` }}
    >
      <i className={`bi ${getIcon()} me-3 fs-5`}></i>
      <div className="flex-grow-1 font-weight-medium">{message}</div>
      <button
        type="button"
        className="btn-close ms-3"
        style={{ filter: 'var(--text-color) === "#f1f5f9" ? "invert(1)" : "none"' }}
        onClick={() => onClose(id)}
        aria-label="Close"
      ></button>
    </div>
  );
};

export default Toast;
