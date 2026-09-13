"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HomeScreenTipModal } from "./home-screen-tip-modal";

/** Re-opens the same "add to home screen" demo on demand - unlike the
 * first-login gate, this never touches the seen flag (it's already set by
 * the time anyone can reach this from Settings). */
export function HomeScreenTipSettingsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        צפייה במדריך
      </Button>
      <HomeScreenTipModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
