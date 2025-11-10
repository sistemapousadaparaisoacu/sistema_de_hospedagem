import React, { useEffect, useState } from 'react';

// Evento: window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success'|'error'|'info', message: 'Texto' } }))
const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const { type = 'info', message = '' } = e.detail || {};
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toast = { id, type, message };
      setToasts((prev) => [...prev, toast]);
      // Autodescartar após 3.5s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };
    window.addEventListener('toast', onToast);
    return () => window.removeEventListener('toast', onToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-container-fixed" role="status" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-card ${t.type}`}>
          <div className="toast-message">{t.message}</div>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;