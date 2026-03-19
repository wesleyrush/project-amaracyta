// src/utils/swal.ts
// Instância do SweetAlert2 configurada com o tema claro do painel admin.
import Swal from 'sweetalert2';

const BG     = '#ffffff';
const COLOR  = '#111827';
const PRIMARY = '#4361ee';
const DANGER  = '#ef4444';
const CANCEL_BG = '#e5e7eb';

export const swal = {
  /** Toast de sucesso (3 s, canto superior direito) */
  success(title: string, text?: string) {
    return Swal.fire({
      icon: 'success',
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: BG,
      color: COLOR,
    });
  },

  /** Toast de erro (4 s, canto superior direito) */
  error(title: string, text?: string) {
    return Swal.fire({
      icon: 'error',
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      background: BG,
      color: COLOR,
    });
  },

  /** Toast de aviso / validação (3 s) */
  warning(title: string, text?: string) {
    return Swal.fire({
      icon: 'warning',
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
      background: BG,
      color: COLOR,
    });
  },

  /** Diálogo de confirmação — retorna true se confirmado */
  async confirm(title: string, text?: string, confirmLabel = 'Sim, excluir'): Promise<boolean> {
    const result = await Swal.fire({
      icon: 'warning',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmLabel,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: DANGER,
      cancelButtonColor: CANCEL_BG,
      background: BG,
      color: COLOR,
      reverseButtons: true,
      customClass: { cancelButton: 'swal-admin-cancel' },
    });
    return result.isConfirmed;
  },

  /** Confirmação para ações de toggle (ativar/desativar) */
  async confirmToggle(title: string, text?: string): Promise<boolean> {
    const result = await Swal.fire({
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: PRIMARY,
      cancelButtonColor: CANCEL_BG,
      background: BG,
      color: COLOR,
      reverseButtons: true,
      customClass: { cancelButton: 'swal-admin-cancel' },
    });
    return result.isConfirmed;
  },
};
