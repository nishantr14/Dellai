import { Activity } from "lucide-react";
import CTAButton from "./CTAButton.jsx";

const LINKS = [
  { id: "fleet", label: "Fleet" },
  { id: "architecture", label: "Architecture" },
  { id: "metrics", label: "Metrics" },
];

export default function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-40">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#hero" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ background: "#8b8cf022", border: "1px solid #8b8cf055" }}>
            <Activity size={17} color="#8b8cf0" />
          </span>
          <span className="font-semibold tracking-wide">PulseGuard</span>
        </a>
        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a key={l.id} href={`#${l.id}`} className="text-sm text-muted hover:text-text transition-colors">
              {l.label}
            </a>
          ))}
        </div>
        <CTAButton>Launch Dashboard</CTAButton>
      </nav>
    </header>
  );
}
