import React, { ReactNode, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export default function Modal({ title, children, onClose, footer, size = 'md' }: ModalProps) {
  const sizeClass = {
    sm:  'max-w-sm',
    md:  'max-w-lg',
    lg:  'max-w-2xl',
    xl:  'max-w-4xl',
    '2xl': 'max-w-6xl'
  }[size]

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const modal = (
    <div
      className="modal-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={`modal ${sizeClass} w-full`}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <button onMouseDown={e => e.stopPropagation()} onClick={onClose} className="btn-icon">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )

  // Render into document.body via portal to avoid stacking context issues
  return ReactDOM.createPortal(modal, document.body)
}
