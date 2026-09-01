import { useToast as useToastContext } from './ToastContext';

export default function useToast() {
  return useToastContext().toast;
}
