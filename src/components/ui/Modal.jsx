import ReactDOM from 'react-dom';

export default function Modal({ title, onClose, children, hideHeader, footer, maxWidth = 'sm:max-w-xl' }) {
  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden flex flex-col my-auto relative animate-in fade-in zoom-in-95 duration-200 border border-gray-100`}
        style={{ maxHeight: '90dvh' }}
      >
        {!hideHeader && (
          <div className="relative flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-gray-100 shrink-0 bg-white">
            <h3 className="text-base font-bold text-gray-800 tracking-tight">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition text-xl leading-none"
            >
              ×
            </button>
          </div>
        )}
        <div className="px-4 sm:px-6 py-4 overflow-y-auto modal-scroll-container flex-1 min-w-0">
          {children}
        </div>
        {footer && (
          <div className="px-4 sm:px-6 pb-4 pt-3 border-t border-gray-100 shrink-0 bg-gray-50/50">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
