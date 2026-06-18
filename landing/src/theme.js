export const T = {
  bg: "#0a0e14", panel: "#111824", panel2: "#161f2c", line: "#222d3d",
  text: "#e8eef6", muted: "#8a98ab", faint: "#586676",
  brand: "#8b8cf0", dell: "#0085c3",
  healthy: "#3fb98a", risk: "#e0a92e", critical: "#e0564f",
};

export const tierColor = (t) =>
  t === "Healthy" ? T.healthy : t === "At Risk" ? T.risk : T.critical;
