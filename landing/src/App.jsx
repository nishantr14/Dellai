import Nav from "./components/Nav.jsx";
import ScrollProgress from "./components/ScrollProgress.jsx";

export default function App() {
  return (
    <div className="grain vignette bg-bg text-text">
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
