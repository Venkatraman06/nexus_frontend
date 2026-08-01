import { ModalProvider } from '@/context/ModalContext';
import { ToastProvider } from '@/context/ToastContext';
import SalesCRM from './SalesCRM';

export default function SalesPage() {
  return (
    <ToastProvider>
      <ModalProvider>
        <SalesCRM />
      </ModalProvider>
    </ToastProvider>
  );
}
