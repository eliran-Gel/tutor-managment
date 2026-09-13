"use client";

import { useState } from "react";
import { markHomeScreenTipSeen } from "@/lib/home-screen-tip-actions";
import { HomeScreenTipModal } from "./home-screen-tip-modal";

/** Auto-opens the "add to home screen" demo once, on this user's first
 * login after the flag was introduced - closing it (for any reason)
 * marks it seen server-side so it never auto-opens again on this or any
 * other device. Renders nothing itself once already seen. */
export function HomeScreenTipGate({ alreadySeen }: { alreadySeen: boolean }) {
  const [open, setOpen] = useState(!alreadySeen);

  if (alreadySeen && !open) return null;

  function close() {
    setOpen(false);
    if (!alreadySeen) void markHomeScreenTipSeen();
  }

  return <HomeScreenTipModal open={open} onClose={close} />;
}
