import { useEffect } from "react";

interface POSShortcutsParams {
  onSearchFocus?: () => void;
  onCustomerFocus?: () => void;
  onPaymentFocus?: () => void;
  onPrint?: () => void;
  onValidate?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export function usePosShortcuts({
  onSearchFocus,
  onCustomerFocus,
  onPaymentFocus,
  onPrint,
  onValidate,
  onCancel,
  disabled = false
}: POSShortcutsParams) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input (except specific cases maybe)
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      
      switch (e.key) {
        case "F2":
          e.preventDefault();
          onSearchFocus?.();
          break;
        case "F4":
          e.preventDefault();
          onCustomerFocus?.();
          break;
        case "F6":
          e.preventDefault();
          onPaymentFocus?.();
          break;
        case "F8":
          e.preventDefault();
          onPrint?.();
          break;
        case "Enter":
          // Only trigger global enter if we are not inside a form input that needs it
          // OR if we are focused on the payment input, we might want to validate
          // We will let the specific inputs handle their own Enter keys (like quantity or amount)
          // But if body is focused, Enter can validate.
          if (!isInputFocused) {
             e.preventDefault();
             onValidate?.();
          }
          break;
        case "Escape":
          e.preventDefault();
          onCancel?.();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchFocus, onCustomerFocus, onPaymentFocus, onPrint, onValidate, onCancel, disabled]);
}
