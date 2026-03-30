"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Overview", path: "/" },
  { name: "Scoring", path: "/scoring" },
  { name: "Explainability", path: "/explainability" },
  { name: "Monitoring", path: "/monitoring" },
  { name: "Governance", path: "/governance" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-full bg-black border-r border-neutral-800 flex flex-col justify-between">

      {/* Top Section */}
      <div className="p-6">
        <h1 className="text-xl font-semibold tracking-tight">
          Claim Severity
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Intelligence Platform
        </p>

        {/* Navigation */}
        <nav className="mt-10 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;

            return (
              <Link
                key={item.name}
                href={item.path}
                className={`px-3 py-2 rounded-lg text-sm transition-all
                  ${
                    isActive
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                  }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-6 border-t border-neutral-800">
        <p className="text-xs text-neutral-500">
          Model Stage: <span className="text-green-400">Production</span>
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          System Status: <span className="text-green-400">Healthy</span>
        </p>
      </div>
    </aside>
  );
}