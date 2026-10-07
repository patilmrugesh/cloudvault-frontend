import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Trash2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  isLoading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      maxWidth="md"
      showCloseButton={!isLoading}
      title={
        <div className="flex items-center gap-2.5 text-slate-100">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isDestructive
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                : 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
            }`}
          >
            {isDestructive ? (
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            )}
          </div>
          <span>{title}</span>
        </div>
      }
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            size="md"
          >
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
            size="md"
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-300 leading-relaxed">
        {description}
      </div>
    </Modal>
  );
};
