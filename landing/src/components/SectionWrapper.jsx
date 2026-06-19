import { forwardRef } from "react";

// Full-viewport section shell. `pin` sections are targeted by GSAP later.
const SectionWrapper = forwardRef(function SectionWrapper(
  { children, id, className = "", style = {} }, ref
) {
  return (
    <section
      id={id}
      ref={ref}
      className={`relative w-full ${className}`}
      style={{ minHeight: "100vh", ...style }}
    >
      {children}
    </section>
  );
});

export default SectionWrapper;
