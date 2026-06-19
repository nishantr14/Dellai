import { useEffect } from "react";
import Nav from "./components/Nav.jsx";
import ScrollProgress from "./components/ScrollProgress.jsx";
import ServerRoom from "./three/ServerRoom.jsx";
import Hero from "./sections/Hero.jsx";
import RackFlythrough from "./sections/RackFlythrough.jsx";
import Degradation from "./sections/Degradation.jsx";
import AIAnalysis from "./sections/AIAnalysis.jsx";
import FleetView from "./sections/FleetView.jsx";
import Architecture from "./sections/Architecture.jsx";
import Metrics from "./sections/Metrics.jsx";
import DashboardShowcase from "./sections/DashboardShowcase.jsx";
import Finale from "./sections/Finale.jsx";
import { usePulseData } from "./data/usePulseData.js";
import { initLenis } from "./lib/lenis.js";
import { sceneState } from "./three/sceneStore.js";

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
        <Degradation />
        <AIAnalysis />
        <FleetView fleet={fleet} summary={data?.summary} />
        <Architecture />
        <Metrics metrics={data?.metrics} summary={data?.summary} />
        <DashboardShowcase />
        <Finale />
      </main>
    </div>
  );
}
