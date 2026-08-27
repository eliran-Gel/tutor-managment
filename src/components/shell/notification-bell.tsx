"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatAppTime } from "@/lib/dates/timezone";
import {
  markNotificationRead,
  markAllNotificationsRead,
  fetchRecentNotifications,
  deleteNotification,
  deleteAllNotifications,
} from "@/lib/notifications-actions";
import type { NotificationRow } from "@/lib/notifications";

export function NotificationBell({
  userId,
  initialNotifications,
}: {
  userId: string;
  initialNotifications: NotificationRow[];
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [open, setOpen] = useState(false);
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_profile_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as NotificationRow, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Realtime's websocket can silently die on a backgrounded/idle tab
  // without the INSERT subscription visibly erroring - this re-syncs
  // straight from the server whenever the tab regains focus, and every
  // minute in the background as a belt-and-suspenders fallback, so the
  // bell can't get permanently stuck stale.
  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const fresh = await fetchRecentNotifications(userId);
      if (!cancelled) setNotifications(fresh);
    }

    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      clearInterval(interval);
    };
  }, [userId]);

  async function handleClickNotification(n: NotificationRow) {
    if (!n.read_at) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      await markNotificationRead(n.id);
    }
    setOpen(false);
    if (n.link_path) router.push(n.link_path);
  }

  async function handleMarkAllRead() {
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await markAllNotificationsRead();
  }

  async function handleDeleteOne(e: ReactMouseEvent, id: string) {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id);
  }

  async function handleDeleteAll() {
    setConfirmingDeleteAll(false);
    setNotifications([]);
    await deleteAllNotifications();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-transform duration-200 hover:bg-surface-muted active:scale-85"
        aria-label="התראות"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-destructive px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-20 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-control border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <p className="text-sm font-semibold text-text-primary">התראות</p>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-brand-accent transition-transform duration-200 hover:underline active:scale-90"
                >
                  סימון הכל כנקרא
                </button>
              )}
              {notifications.length > 0 &&
                (confirmingDeleteAll ? (
                  <span className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteAll(false)}
                      className="font-medium text-text-secondary hover:underline"
                    >
                      ביטול
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAll}
                      className="font-medium text-status-destructive hover:underline"
                    >
                      מחיקת הכל?
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteAll(true)}
                    className="text-xs font-medium text-text-secondary transition-transform duration-200 hover:text-status-destructive hover:underline active:scale-90"
                  >
                    מחיקת הכל
                  </button>
                ))}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">אין התראות כרגע.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`group relative border-b border-border last:border-b-0 ${n.read_at ? "" : "bg-status-selected-bg"}`}
                >
                  <button
                    type="button"
                    onClick={() => handleClickNotification(n)}
                    className="block w-full px-4 py-3 pe-9 text-right text-sm transition-colors duration-200 hover:bg-surface-muted"
                  >
                    <p className="font-medium text-text-primary">{n.title}</p>
                    {n.body && <p className="mt-0.5 break-words text-text-secondary">{n.body}</p>}
                    <p className="mt-1 text-xs text-text-muted">{formatAppTime(n.created_at, "dd/MM/yyyy HH:mm")}</p>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteOne(e, n.id)}
                    aria-label="מחיקת התראה"
                    className="absolute end-2 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-colors duration-200 hover:bg-surface-muted hover:text-status-destructive"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
