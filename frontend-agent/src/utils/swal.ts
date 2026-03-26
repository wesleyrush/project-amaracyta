// src/utils/swal.ts
// Instância do SweetAlert2 pré-configurada com o tema do projeto.
import Swal from 'sweetalert2';

/**
 * Instância base com cores do tema escuro do projeto.
 * Adapta automaticamente ao tema claro quando data-theme="light" estiver ativo.
 */
function getColors() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  return {
    background:    isLight ? '#ffffff' : '#101218',
    color:         isLight ? '#1a1d23' : '#e8e9eb',
    confirmColor:  '#5697ff',
    cancelBg:      isLight ? '#f3f4f6' : '#1b1f26',
    cancelColor:   isLight ? '#6b7280' : '#a9b0bb',
  };
}

export const swal = {
  /** Toast de sucesso (3 s, canto superior direito) */
  success(title: string, text?: string) {
    const c = getColors();
    return Swal.fire({
      icon: 'success',
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: c.background,
      color: c.color,
    });
  },

  /** Toast de erro (4 s, canto superior direito) */
  error(title: string, text?: string) {
    const c = getColors();
    return Swal.fire({
      icon: 'error',
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      background: c.background,
      color: c.color,
    });
  },

  /** Toast informativo (3 s, canto superior direito) */
  info(title: string, text?: string) {
    const c = getColors();
    return Swal.fire({
      icon: 'info',
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: c.background,
      color: c.color,
    });
  },

  /** Toast de aviso (4 s, canto superior direito) */
  warning(title: string, text?: string) {
    const c = getColors();
    return Swal.fire({
      icon: 'warning',
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      background: c.background,
      color: c.color,
    });
  },

  /** Diálogo de confirmação destrutiva (ex: excluir). Retorna true se confirmado. */
  async confirm(title: string, text?: string, confirmLabel = 'Sim, excluir'): Promise<boolean> {
    const c = getColors();
    const result = await Swal.fire({
      icon: 'warning',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmLabel,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: c.cancelBg,
      background: c.background,
      color: c.color,
      reverseButtons: true,
      customClass: { cancelButton: 'swal-cancel-btn' },
    });
    return result.isConfirmed;
  },

  /** Diálogo de confirmação não-destrutiva (ex: seleção de módulo). Retorna true se confirmado. */
  async ask(title: string, text?: string, confirmLabel = 'Confirmar'): Promise<boolean> {
    const c = getColors();
    const result = await Swal.fire({
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmLabel,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: c.confirmColor,
      cancelButtonColor: c.cancelBg,
      background: c.background,
      color: c.color,
      reverseButtons: true,
      customClass: { cancelButton: 'swal-cancel-btn' },
    });
    return result.isConfirmed;
  },

  /** Diálogo informativo simples (ex: funcionalidade em breve) */
  soon(title: string, text?: string) {
    const c = getColors();
    return Swal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonText: 'Entendido',
      confirmButtonColor: c.confirmColor,
      background: c.background,
      color: c.color,
    });
  },
};
