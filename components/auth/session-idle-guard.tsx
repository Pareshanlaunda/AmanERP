"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOutIdle } from "@/lib/actions/auth";
import {
  SessionIdleModal,
  type SessionIdleModalPhase,
} from "@/components/auth/session-idle-modal";
import {
  isSessionIdleProtectedPath,
  sessionIdleRemainingMs,
  sessionIdleShouldWarn,
} from "@/lib/session/idle-config";

const TICK_MS = 1_000;
const ACTIVITY_THROTTLE_MS = 5_000;
const SIGN_OUT_ANIMATION_MS = 1_800;

export function SessionIdleGuard() {
  const pathname = usePathname();
  const lastActivityRef = useRef(Date.now());
  const lastBumpRef = useRef(0);
  const signingOutRef = useRef(false);
  const [phase, setPhase] = useState<SessionIdleModalPhase>("none");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const staySignedIn = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastBumpRef.current = now;
    signingOutRef.current = false;
    setPhase("none");
    setSecondsLeft(0);
  }, []);

  useEffect(() => {
    if (!isSessionIdleProtectedPath(pathname)) {
      setPhase("none");
      return;
    }

    staySignedIn();

    function bumpActivity() {
      if (signingOutRef.current) return;
      const now = Date.now();
      if (now - lastBumpRef.current < ACTIVITY_THROTTLE_MS) return;
      lastBumpRef.current = now;
      lastActivityRef.current = now;
      setPhase("none");
      setSecondsLeft(0);
    }

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"] as const;
    events.forEach((event) => window.addEventListener(event, bumpActivity, { passive: true }));
    window.addEventListener("mousemove", bumpActivity, { passive: true });

    const timer = window.setInterval(() => {
      if (signingOutRef.current) return;

      const remaining = sessionIdleRemainingMs(lastActivityRef.current);

      if (remaining <= 0) {
        signingOutRef.current = true;
        setPhase("signing-out");
        setSecondsLeft(0);
        window.clearInterval(timer);
        window.setTimeout(() => {
          void signOutIdle();
        }, SIGN_OUT_ANIMATION_MS);
        return;
      }

      if (sessionIdleShouldWarn(remaining)) {
        setPhase("warning");
        setSecondsLeft(Math.ceil(remaining / 1000));
        return;
      }

      setPhase("none");
      setSecondsLeft(0);
    }, TICK_MS);

    return () => {
      window.clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, bumpActivity));
      window.removeEventListener("mousemove", bumpActivity);
    };
  }, [pathname, staySignedIn]);

  return (
    <SessionIdleModal phase={phase} secondsLeft={secondsLeft} onStaySignedIn={staySignedIn} />
  );
}
