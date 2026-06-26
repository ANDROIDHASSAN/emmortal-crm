export default function Modal({ open, onClose, title, children, footer, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={`card w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto p-6`} onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="mb-4 text-lg font-bold text-slate-800">{title}</h2>}
        <div>{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
