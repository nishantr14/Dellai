import Nav from "./components/Nav.jsx";
import ScrollProgress from "./components/ScrollProgress.jsx";
import ServerRoom from "./three/ServerRoom.jsx";
import { usePulseData } from "./data/usePulseData.js";

export default function App() {
  const { data } = usePulseData();
  const fleet = data?.fleet ?? [];
  return (
    <div className="grain vignette bg-bg text-text">
      <ServerRoom fleet={fleet} />
      <ScrollProgress />
      <Nav />
      <main>
        <section id="hero" style={{ minHeight: "100vh" }} className="grid place-items-center">
          <h1 className="text-5xl font-bold tracking-tight">PulseGuard</h1>
        </section>
        <section style={{ minHeight: "100vh" }} />
      </main>
    </div>
  );
}
