"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "sipinat-bg-motion";

export function AmbientBackground() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "paused") {
        document.documentElement.dataset.bgMotion = "paused";
      }
    } catch {
      // Ignore storage access errors in restricted browsing contexts
    }
  }, []);

  if (pathname && pathname.startsWith("/admin") && pathname !== "/admin/login") {
    return null;
  }

  return (
    <div className="ambient-bg" aria-hidden="true">
      <div className="ambient-dot-grid" />
      <div className="ambient-orb orb-primary" />
      <div className="ambient-orb orb-teal" />
      <div className="ambient-orb orb-indigo" />
    </div>
  );
}

export function BgMotionToggle() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    try {
      const savedPaused = window.localStorage.getItem(STORAGE_KEY) === "paused";
      const domPaused = document.documentElement.dataset.bgMotion === "paused";
      const isPaused = savedPaused || domPaused;
      if (isPaused) {
        document.documentElement.dataset.bgMotion = "paused";
      }
      setPaused(isPaused);
    } catch {
      setPaused(document.documentElement.dataset.bgMotion === "paused");
    }
  }, []);

  function toggle() {
    const nextPaused = !paused;
    setPaused(nextPaused);

    if (nextPaused) {
      document.documentElement.dataset.bgMotion = "paused";
    } else {
      delete document.documentElement.dataset.bgMotion;
    }

    try {
      if (nextPaused) {
        window.localStorage.setItem(STORAGE_KEY, "paused");
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage access errors in restricted browsing contexts
    }
  }

  return (
    <button
      type="button"
      className="bg-motion-toggle secondary compact"
      onClick={toggle}
    >
      <span className="bg-motion-dot" aria-hidden="true" />
      <span>{paused ? "Putar animasi latar" : "Jeda animasi latar"}</span>
    </button>
  );
}
