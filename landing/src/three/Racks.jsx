import { useMemo } from "react";

// Two rows of server racks receding into fog. Built from simple boxes so it
// stays cheap; geometry is shared, materials are dark with subtle emissive trim.
export default function Racks({ rows = 2, perRow = 9 }) {
  const positions = useMemo(() => {
    const out = [];
    for (let r = 0; r < rows; r++) {
      const x = r === 0 ? -3.2 : 3.2;
      for (let i = 0; i < perRow; i++) {
        out.push([x, 0, -i * 4]); // march away from camera
      }
    }
    return out;
  }, [rows, perRow]);

  return (
    <group>
      {positions.map((p, idx) => (
        <mesh key={idx} position={[p[0], 1.4, p[2]]} castShadow>
          <boxGeometry args={[1.6, 2.8, 2.4]} />
          <meshStandardMaterial color="#0e1622" metalness={0.6} roughness={0.5}
            emissive="#10182a" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}
