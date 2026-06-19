import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { useGpuTier } from "../hooks/useGpuTier.js";
import FallbackGrid from "./FallbackGrid.jsx";
import Racks from "./Racks.jsx";
import StatusLights from "./StatusLights.jsx";
import CameraRig from "./CameraRig.jsx";

export default function ServerRoom({ fleet = [] }) {
  const useFallback = useGpuTier();
  if (useFallback) return <FallbackGrid />;

  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.5, 14], fov: 50 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0a0e14"]} />
        <fog attach="fog" args={["#0a0e14", 12, 38]} />
        <ambientLight intensity={0.3} />
        <CameraRig />
        <Suspense fallback={null}>
          <Racks />
          <StatusLights fleet={fleet} />
          {/* Two cheap accent lights for depth; bloom removed for perf — glow now
              comes from emissive LEDs + CSS text-shadow on the DOM headings. */}
          <pointLight position={[0, 6, 4]} intensity={55} color="#4f8bff" distance={34} />
          <pointLight position={[0, 2, -14]} intensity={30} color="#0085c3" distance={30} />
        </Suspense>
      </Canvas>
    </div>
  );
}
