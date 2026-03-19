import DOMPurify from 'dompurify';
import { Marked } from 'marked';

// Instância local do parser com opções síncronas
const mdParser = new Marked({
  gfm: true,
  breaks: true
  // smartypants foi removido nessa API/tipagem
});

export function renderMarkdown(md?: string) {
  // Em modo síncrono, o retorno efetivo é string (o tipo é union por compat)
  const html = mdParser.parse(md || '') as string;
  return DOMPurify.sanitize(html);
}