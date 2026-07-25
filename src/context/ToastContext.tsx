import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 9999
      }}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderRadius: '8px',
            background: 'var(--color-surface)', backdropFilter: 'blur(10px)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)', borderLeft: `4px solid ${toast.type === 'success' ? 'var(--color-success)' : toast.type === 'error' ? 'var(--color-error)' : 'var(--color-info)'}`,
            animation: 'slideIn 0.3s ease-out forwards'
          }}>
            {toast.type === 'success' && <CheckCircle size={20} color="var(--color-success)" />}
            {toast.type === 'error' && <AlertCircle size={20} color="var(--color-error)" />}
            {toast.type === 'info' && <Info size={20} color="var(--color-info)" />}
            
            <span style={{ fontSize: '14px', color: 'var(--color-text-main)', fontWeight: '500' }}>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', padding: 0, display: 'flex' }}>
              <X size={16} color="var(--color-text-muted)" />
            </button>
          </div>
        ))}
      </div>
      <style>
        {`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}
      </style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
