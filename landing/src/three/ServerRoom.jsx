import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { useGpuTier } from "../hooks/useGpuTier.js";
import FallbackGrid from "./FallbackGrid.jsx";
import Racks from "./Racks.jsx";
import StatusLights from "./StatusLights.jsx";
import CameraRig from "./CameraRig.jsx";
import Effects from "./Effects.jsx";

export default function ServerRoom({ fleet = [] }) {
  const useFallback = useGpuTier();
  if (useFallback) return <FallbackGrid />;

  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.5, 14], fov: 50 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0a0e14"]} />
        <fog attach="fog" args={["#0a0e14", 12, 38]} />
        <ambientLight intensity={0.25} />
        <CameraRig />
        <Suspense fallback={null}>
          <Racks />
          <StatusLights fleet={fleet} />
          <pointLight position={[0, 6, 4]} intensity={40} color="#8b8cf0" distance={30} />
        </Suspense>
        <Effects />
      </Canvas>
    </div>
  );
}
