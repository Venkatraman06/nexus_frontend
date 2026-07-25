import { ModalProvider } from '@/context/ModalContext';
import { ToastProvider } from '@/context/ToastContext';
import TrainingCRM from './TrainingCRM';

export default function CRMPage() {
  return (
    <ToastProvider>
      <ModalProvider>
        <TrainingCRM />
      </ModalProvider>
    </ToastProvider>
  );
}