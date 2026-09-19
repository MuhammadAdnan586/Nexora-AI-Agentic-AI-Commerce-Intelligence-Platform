interface NexoraWordmarkProps {
  size?: string;
  className?: string;
}

export default function NexoraWordmark({ size = "text-lg", className = "" }: NexoraWordmarkProps) {
  return (
    <span className={`font-display font-bold tracking-tight ${size} ${className}`}>
      NE
      <span className="text-nova-cyan font-extrabold" style={{ fontSize: "1.2em" }}>
        X
      </span>
      ORA
    </span>
  );
}