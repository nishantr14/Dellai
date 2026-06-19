import { useCountUp } from "../hooks/useCountUp.js";

// Animated count-up number. `value` is the real target from the data.
export default function Counter({ value, decimals = 0, suffix = "", className = "" }) {
  const { ref, display } = useCountUp(value, { decimals, suffix });
  return (
    <span ref={ref} className={`font-mono tabular-nums ${className}`}>
      {display}
    </span>
  );
}
