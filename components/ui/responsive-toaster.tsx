"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Toaster } from "sonner";

export function ResponsiveToaster() {
  const { resolvedTheme } = useTheme();
  const [position, setPosition] = useState<"top-center" | "top-right">("top-right");

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setPosition(media.matches ? "top-center" : "top-right");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <Toaster
      richColors
      position={position}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    />
  );
}
