"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { name: "Overview", path: "/" },
  { name: "Scoring", path: "/scoring" },
  { name: "Explainability", path: "/explainability" },
  { name: "Monitoring", path: "/monitoring" },
  { name: "Governance", path: "/governance" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <>
      {/* Mobile Menu Trigger */}
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={() => setMobileMenuOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-black/90 text-white shadow-lg backdrop-blur md:hidden"
      >
        <span className="flex flex-col gap-1">
          <span className="block h-0.5 w-5 bg-white" />
          <span className="block h-0.5 w-5 bg-white" />
          <span className="block h-0.5 w-5 bg-white" />
        </span>
      </button>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh w-[85vw] max-w-[320px] flex-col justify-between border-r border-neutral-800 bg-black transition-transform duration-300 md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white">
                Claim Severity
              </h1>
              <p className="mt-1 text-sm text-neutral-400">
                Intelligence Platform
              </p>
            </div>

            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-900 hover:text-white"
            >
              Close
            </button>
          </div>

          <nav className="mt-8 flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path;

              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`rounded-xl px-4 py-3 text-sm transition-all ${
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

        <div className="border-t border-neutral-800 p-5">
          <p className="text-xs text-neutral-500">
            Model Stage: <span className="text-green-400">Production</span>
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            System Status: <span className="text-green-400">Healthy</span>
          </p>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden h-full w-64 flex-col justify-between border-r border-neutral-800 bg-black md:flex">
        <div className="p-6">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Claim Severity
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Intelligence Platform
          </p>

          <nav className="mt-10 flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.path;

              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`rounded-lg px-3 py-2 text-sm transition-all ${
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

        <div className="border-t border-neutral-800 p-6">
          <p className="text-xs text-neutral-500">
            Model Stage: <span className="text-green-400">Production</span>
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            System Status: <span className="text-green-400">Healthy</span>
          </p>
        </div>
      </aside>
    </>
  );
}