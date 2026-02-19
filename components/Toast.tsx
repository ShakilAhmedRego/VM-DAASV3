'use client';

interface ToastProps {
  message: string;
  variant: 'success' | 'error' | 'info';
}

export default function Toast({ message, variant }: ToastProps) {
  const styles = {
    success: 'bg-green-900/90 border-green-500/30 text-green-200',
    error: 'bg-red-900/90 border-red-500/30 text-red-200',
    info: 'bg-surface-2/90 border-white/10 text-white/80',
  };

  const icons = {
    success: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-green-400 shrink-0">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-400 shrink-0">
        <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-brand-400 shrink-0">
        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md text-sm max-w-sm shadow-xl animate-slide-up ${styles[variant]}`}>
      {icons[variant]}
      <span>{message}</span>
    </div>
  );
}
