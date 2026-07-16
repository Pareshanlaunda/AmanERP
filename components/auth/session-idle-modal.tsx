"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { IoTimeOutline } from "react-icons/io5";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SESSION_IDLE_EFFECTIVE_WARN_MS } from "@/lib/session/idle-config";

export type SessionIdleModalPhase = "none" | "warning" | "signing-out";

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

type CountdownRingProps = {
  progress: number;
  signingOut: boolean;
  secondsLeft: number;
  reducedMotion: boolean;
};

function CountdownRing({ progress, signingOut, secondsLeft, reducedMotion }: CountdownRingProps) {
  const strokeOffset = RING_CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
      <svg
        className="absolute inset-0 h-full w-full -rotate-90"
        viewBox="0 0 120 120"
        aria-hidden
      >
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-muted/80"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          className={signingOut ? "text-muted-foreground" : "text-primary"}
          stroke="currentColor"
          strokeDasharray={RING_CIRCUMFERENCE}
          initial={false}
          animate={{
            strokeDashoffset: signingOut ? RING_CIRCUMFERENCE : strokeOffset,
            opacity: signingOut ? 0.35 : 1,
          }}
          transition={{
            strokeDashoffset: {
              duration: reducedMotion ? 0 : signingOut ? 0.55 : 0.95,
              ease: "linear",
            },
            opacity: { duration: 0.35 },
          }}
        />
      </svg>

      <AnimatePresence mode="wait">
        {signingOut ? (
          <motion.div
            key="logout-icon"
            className="flex flex-col items-center gap-1.5"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.85, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
          >
            <motion.div
              animate={reducedMotion ? undefined : { rotate: [0, -8, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            >
              <LogOut className="h-9 w-9 text-muted-foreground" aria-hidden />
            </motion.div>
            <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Closing
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="countdown"
            className="flex flex-col items-center gap-1"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            <motion.div
              animate={
                reducedMotion
                  ? undefined
                  : { rotate: [0, 4, 0, -4, 0], scale: [1, 1.04, 1, 1.04, 1] }
              }
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="text-primary"
              aria-hidden
            >
              <IoTimeOutline className="h-7 w-7" />
            </motion.div>
            <motion.span
              key={secondsLeft}
              className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground"
              initial={reducedMotion ? false : { opacity: 0.45, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              aria-live="polite"
            >
              {formatCountdown(secondsLeft)}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type SessionIdleModalProps = {
  phase: SessionIdleModalPhase;
  secondsLeft: number;
  onStaySignedIn: () => void;
};

export function SessionIdleModal({ phase, secondsLeft, onStaySignedIn }: SessionIdleModalProps) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!mounted) return null;

  const signingOut = phase === "signing-out";
  const warnTotalSec = Math.max(1, Math.ceil(SESSION_IDLE_EFFECTIVE_WARN_MS / 1000));
  const progress = signingOut
    ? 0
    : Math.min(100, Math.max(0, (secondsLeft / warnTotalSec) * 100));

  return createPortal(
    <AnimatePresence mode="wait">
      {phase !== "none" ? (
        <motion.div
          key="session-idle-overlay"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-idle-title"
          aria-describedby="session-idle-desc"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="absolute inset-0 bg-[#0f1419]/55 backdrop-blur-[3px]"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: signingOut ? 0.72 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            aria-hidden
          />

          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xl"
            initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
            animate={
              signingOut && !reducedMotion
                ? { opacity: 0, y: 24, scale: 0.94 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={
              signingOut
                ? { duration: 0.65, ease: [0.4, 0, 0.2, 1] }
                : { type: "spring", stiffness: 400, damping: 30 }
            }
          >
            <div
              className={cn(
                "border-b border-border/60 px-5 py-4 transition-colors duration-500",
                signingOut ? "bg-muted/50" : "bg-gradient-to-r from-primary/8 via-card to-primary/4"
              )}
            >
              <div className="flex items-start gap-3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={signingOut ? "out" : "warn"}
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                      signingOut
                        ? "bg-muted text-muted-foreground ring-border"
                        : "bg-primary/10 text-primary ring-primary/20"
                    )}
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.8, rotate: -12 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.85, rotate: 12 }}
                    transition={{ duration: 0.22 }}
                  >
                    {signingOut ? (
                      <LogOut className="h-5 w-5" aria-hidden />
                    ) : (
                      <motion.div
                        animate={reducedMotion ? undefined : { rotate: [0, 6, 0, -6, 0] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <IoTimeOutline className="h-5 w-5" aria-hidden />
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <div className="min-w-0 flex-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={signingOut ? "out-copy" : "warn-copy"}
                      initial={reducedMotion ? false : { opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <h2
                        id="session-idle-title"
                        className="font-display text-base font-semibold tracking-tight text-foreground"
                      >
                        {signingOut ? "Signing you out" : "Session expiring"}
                      </h2>
                      <p
                        id="session-idle-desc"
                        className="mt-1 text-sm leading-relaxed text-muted-foreground"
                      >
                        {signingOut
                          ? "Closing your session for security."
                          : "No activity detected. Continue working to stay signed in."}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="px-5 py-5">
              <CountdownRing
                progress={progress}
                signingOut={signingOut}
                secondsLeft={secondsLeft}
                reducedMotion={reducedMotion}
              />

              <AnimatePresence mode="wait">
                {!signingOut ? (
                  <motion.div
                    key="actions"
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    className="flex justify-center border-t border-border/50 pt-4"
                  >
                    <Button type="button" onClick={onStaySignedIn} autoFocus className="min-w-[9rem]">
                      Stay signed in
                    </Button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
