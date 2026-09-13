"use client";

import { Modal } from "@/components/ui/modal";
import { HomeScreenTipContent } from "./home-screen-tip-content";

export function HomeScreenTipModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="הוספת האתר למסך הבית" widthClassName="max-w-2xl">
      <HomeScreenTipContent />
    </Modal>
  );
}
