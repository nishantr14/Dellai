import { useFrame, useThree } from "@react-three/fiber";
import { sceneState } from "./sceneStore.js";

// Reads sceneState.scroll each frame and dollies the camera through the racks.
// 0.0-0.15 hero (wide), 0.15-0.30 flythrough (push in), later scenes pull back.
export default function CameraRig() {
  const { camera } = useThree();
  useFrame(() => {
    const s = sceneState.scroll;
    const targetZ = 14 - Math.min(0.30, s) / 0.30 * 16; // 14 -> -2 during first 30%
    const pullBack = s > 0.5 ? (s - 0.5) * 40 : 0;       // Scene 5 pull-back
    camera.position.z += (targetZ + pullBack - camera.position.z) * 0.06;
    camera.position.x += ((s > 0.15 && s < 0.30 ? Math.sin(s * 40) * 1.2 : 0) - camera.position.x) * 0.05;
    camera.lookAt(0, 1.4, camera.position.z - 6);
  });
  return null;
}
