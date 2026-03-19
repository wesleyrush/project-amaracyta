export default function AkashaLogo({ size = 64, title = "Akasha: éter, campo que contém e permeia tudo" }: {size?: number; title?: string}) {
  return (
    <img src="/logo.png" alt={title} title={title} width={size} height={size} className="amaracyta-symbol" />
  );
}
