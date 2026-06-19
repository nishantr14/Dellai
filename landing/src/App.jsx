import { useEffect } from "react";
import Nav from "./components/Nav.jsx";
import ScrollProgress from "./components/ScrollProgress.jsx";
import ServerRoom from "./three/ServerRoom.jsx";
import { usePulseData } from "./data/usePulseData.js";
import { initLenis } from "./lib/lenis.js";
import { sceneState } from "./three/sceneStore.js";
import Hero from "./sections/Hero.jsx";
import RackFlythrough from "./sections/RackFlythrough.jsx";

export default function App() {
  const { data } = usePulseData();
  const fleet = data?.fleet ?? [];

  useEffect(() => {
    const lenis = initLenis();
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      sceneState.scroll = max > 0 ? window.scrollY / max : 0;
    };
    lenis.on("scroll", onScroll);
    onScroll();
    return () => lenis.destroy();
  }, []);

  return (
    <div className="grain vignette bg-bg text-text">
      <ServerRoom fleet={fleet} />
      <ScrollProgress />
      <Nav />
      <main className="relative z-10">
        <Hero />
        <RackFlythrough />
      </main>
    </div>
  );
}
