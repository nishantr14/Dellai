import { useMemo } from "react";
import { tierColor } from "../theme.js";

// Emissive LED strip on each rack. Color comes from fleet tiers so the room is
// literally lit by the data. `fleet` is the array from usePulseData.
export default function StatusLights({ fleet = [], rows = 2, perRow = 9 }) {
  const lights = useMemo(() => {
    const out = [];
    let f = 0;
    for (let r = 0; r < rows; r++) {
      const x = r === 0 ? -3.2 : 3.2;
      for (let i = 0; i < perRow; i++) {
        const node = fleet[f % Math.max(1, fleet.length)] || { tier: "Healthy" };
        out.push({ pos: [x + (r === 0 ? 0.85 : -0.85), 1.4, -i * 4], color: tierColor(node.tier) });
        f++;
      }
    }
    return out;
  }, [fleet, rows, perRow]);

  return (
    <group>
      {lights.map((l, idx) => (
        <mesh key={idx} position={l.pos}>
          <boxGeometry args={[0.06, 1.8, 0.06]} />
          <meshBasicMaterial color={l.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
