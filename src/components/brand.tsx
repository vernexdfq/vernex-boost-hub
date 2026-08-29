/** Official Verxor mark — used in landing page header, auth, and compact UI.
 *  Uses mylogo.png as the official brand mark. */
export function VerxorMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <img
      src="/mylogo.png"
      alt="Verxor"
      width={512}
      height={512}
      className={`${className} object-contain`}
      decoding="async"
    />
  );
}

/** Official Verxor logo — flexible width for wider placements on the site. */
export function VerxorLogo({ className = "h-9" }: { className?: string }) {
  return (
    <img
      src="/mylogo.png"
      alt="Verxor — Your complete digital ecosystem"
      width={512}
      height={512}
      className={`${className} w-auto object-contain`}
      decoding="async"
    />
  );
}

/** @deprecated Use VerxorMark */
export const VernexMark = VerxorMark;
/** @deprecated Use VerxorLogo */
export const VernexLogo = VerxorLogo;
