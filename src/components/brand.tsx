/** Official Vernex mark — used in landing page header, auth, and compact UI.
 *  Uses vernexlogo.png (premium full-color mark) for the website. */
export function VernexMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src="/vernexlogo.png"
      alt="Vernex"
      width={512}
      height={512}
      className={`${className} object-contain`}
      decoding="async"
    />
  );
}

/** Official Vernex logo — flexible width for wider placements on the site. */
export function VernexLogo({ className = "h-9" }: { className?: string }) {
  return (
    <img
      src="/vernexlogo.png"
      alt="Vernex — Connect, Verify, Grow"
      width={512}
      height={512}
      className={`${className} w-auto object-contain`}
      decoding="async"
    />
  );
}
