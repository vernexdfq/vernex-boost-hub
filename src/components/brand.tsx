import logo from "@/assets/logo.png";

/** Official Vernex mark (square) — used in headers, auth, and compact UI. */
export function VernexMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="Vernex"
      width={512}
      height={512}
      className={`${className} object-contain`}
      decoding="async"
    />
  );
}

/** Official Vernex logo — same asset, flexible width for wider placements. */
export function VernexLogo({ className = "h-9" }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="Vernex — Connect, Verify, Grow"
      width={512}
      height={512}
      className={`${className} w-auto object-contain`}
      decoding="async"
    />
  );
}
