export const REINC_SUGGESTION_LABEL = 'Deseja saber quem você já foi em outras vidas?';
export const REINC_PROMPT_HIDDEN = 'Quero saber sobre minhas vidas passadas e reencarnações.';

export function renderOpening(firstName?: string): string {
  return `Você é um guia espiritual da Jornada Akasha. O usuário se chama ${firstName || 'visitante'}. Cumprimente-o de forma calorosa e pergunte como pode ajudar.`;
}

export function getFirstName(fullName?: string | null): string {
  if (!fullName) return '';
  return fullName.trim().split(' ')[0];
}
