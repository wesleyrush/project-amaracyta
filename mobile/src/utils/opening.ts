export const REINC_SUGGESTION_LABEL = 'Receber leitura de reencarnação';
export const REINC_PROMPT_HIDDEN = '__REINC_PROMPT__';

export function renderOpening(firstName: string): string {
  return `Olá! Sou ${firstName}. Gostaria de iniciar uma consulta.`;
}

export function isAssistantGreeting(content: string, firstName: string): boolean {
  const lower = content.toLowerCase();
  return lower.startsWith('olá') && lower.includes(firstName.toLowerCase());
}

export function getFirstName(fullName?: string | null): string {
  if (!fullName) return '';
  return fullName.trim().split(' ')[0];
}

type ProfileLike = {
  full_name?: string | null;
  initiatic_name?: string | null;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_country?: string | null;
  birth_state?: string | null;
  birth_city?: string | null;
};

/** Substitui variáveis {first}, {full_name}, {birth_date}, etc. no template do prompt. */
export function resolvePromptTemplate(template: string, subject: ProfileLike | null): string {
  if (!subject) return template;

  const first = subject.full_name?.trim().split(' ')[0] ?? '';

  let birthDate = '';
  if (subject.birth_date) {
    const [y, m, d] = subject.birth_date.split('-');
    birthDate = d && m && y ? `${d}/${m}/${y}` : subject.birth_date;
  }

  const birthLocation = [subject.birth_city, subject.birth_state, subject.birth_country]
    .filter(Boolean).join(', ');

  return template
    .replace(/{first}/g, first)
    .replace(/{full_name}/g, subject.full_name ?? '')
    .replace(/{initiatic_name}/g, subject.initiatic_name ?? '')
    .replace(/{birth_date}/g, birthDate)
    .replace(/{birth_time}/g, subject.birth_time ?? '')
    .replace(/{birth_country}/g, subject.birth_country ?? '')
    .replace(/{birth_state}/g, subject.birth_state ?? '')
    .replace(/{birth_city}/g, subject.birth_city ?? '')
    .replace(/{birth_location}/g, birthLocation);
}
