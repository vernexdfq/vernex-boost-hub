import mark from "@/assets/vernex-mark.png";
import logo from "@/assets/vernex-logo.png";

export function VernexMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src={mark}
      alt="Vernex logo mark"
      width={816}
      height={816}
      className={`${className} object-contain`}
    />
  );
}

export function VernexLogo({ className = "h-9" }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="Vernex — Connect, Verify, Grow"
      width={1536}
      height={512}
      className={`${className} w-auto object-contain`}
    />
  );
}
