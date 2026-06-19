import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

export default function Effects() {
  return (
    <EffectComposer disableNormalPass>
      <Bloom intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.4} mipmapBlur />
      <Vignette eskil={false} offset={0.2} darkness={0.7} />
    </EffectComposer>
  );
}
