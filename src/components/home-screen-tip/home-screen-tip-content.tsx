"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import styles from "./home-screen-tip.module.css";

type FingerTarget = "share" | "addHome" | "confirm";
type Step = { duration: number; fingerTarget: FingerTarget | null; tap: boolean; stop: number };

// Each step is either a resting beat or a tap - the tap is what triggers
// the *next* step's UI change (sheet opening, dialog opening, home screen
// appearing), so its duration doubles as "how long the tap animation gets
// to play before that change happens".
const STEPS: Step[] = [
  { duration: 1700, fingerTarget: null, tap: false, stop: 0 },
  { duration: 900, fingerTarget: "share", tap: true, stop: 0 },
  { duration: 1700, fingerTarget: "addHome", tap: false, stop: 1 },
  { duration: 900, fingerTarget: "addHome", tap: true, stop: 1 },
  { duration: 1500, fingerTarget: "confirm", tap: false, stop: 2 },
  { duration: 900, fingerTarget: "confirm", tap: true, stop: 2 },
  { duration: 2800, fingerTarget: null, tap: false, stop: 3 },
];
const STOP_TO_STEP = [0, 2, 4, 6];
const CAPTIONS = [
  "פותחים את האתר בספארי, ולוחצים על כפתור השיתוף למטה",
  "בתפריט שנפתח מגלגלים ובוחרים “הוספה למסך הבית”",
  "בודקים שהשם נראה טוב ולוחצים “הוספה” בפינה",
  "האייקון נוסף למסך הבית - מוכן!",
];

// offsetLeft/offsetTop ignore a sheet's own slide transform, so this gives
// each button's *resting* position even while its sheet is still animating
// into view - no hardcoded coordinates to keep in sync with the layout.
function positionOf(el: HTMLElement, boundary: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== boundary) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 };
}

export function HomeScreenTipContent() {
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [finger, setFinger] = useState({ x: 0, y: 0, visible: false, tap: false });

  const screenRef = useRef<HTMLDivElement>(null);
  const shareBtnRef = useRef<HTMLButtonElement>(null);
  const addHomeRowRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLSpanElement>(null);

  const step = STEPS[stepIndex];
  const shareSheetOpen = stepIndex === 2 || stepIndex === 3;
  const addDialogOpen = stepIndex === 4 || stepIndex === 5;
  const homeVisible = stepIndex === 6;

  // Positions (and, when this step ends in a tap, triggers) the finger
  // over whichever element this step points at - runs after the DOM has
  // already committed the step's classes, so offsetLeft/offsetTop reflect
  // real layout immediately (no rAF wait needed, unlike toggling raw
  // classList outside React).
  useEffect(() => {
    const refs: Record<FingerTarget, HTMLElement | null> = {
      share: shareBtnRef.current,
      addHome: addHomeRowRef.current,
      confirm: confirmBtnRef.current,
    };
    if (!step.fingerTarget || !screenRef.current) {
      setFinger((f) => ({ ...f, visible: false, tap: false }));
      return;
    }
    const el = refs[step.fingerTarget];
    if (!el) return;
    const pos = positionOf(el, screenRef.current);
    setFinger({ x: pos.x, y: pos.y, visible: true, tap: false });
    if (step.tap) {
      const t = setTimeout(() => setFinger((f) => ({ ...f, tap: true })), 480);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  // Autoplay: advances to the next step after this one's duration, unless
  // paused. Pausing/resuming always restarts the *current* step's full
  // duration rather than resuming a partially-elapsed one, matching how a
  // literal setTimeout-per-step player behaves.
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      setStepIndex((i) => (i + 1) % STEPS.length);
    }, step.duration);
    return () => clearTimeout(t);
  }, [stepIndex, playing, step.duration]);

  function jumpToStop(stop: number) {
    setPlaying(false);
    setStepIndex(STOP_TO_STEP[stop]);
  }

  function replay() {
    setPlaying(true);
    setStepIndex(0);
  }

  return (
    <div className={styles.wrap}>
      <h2 className={styles.welcome}>ברוכים הבאים! 👋</h2>
      <p className={styles.intro}>
        ארבע לחיצות באייפון, בלי להוריד שום דבר מה-App Store. אחרי זה יש אייקון שנפתח ישר לתוך המערכת.
      </p>

      <div className={styles.demo}>
        <div className={styles.phoneWrap}>
          <div className={styles.phone}>
            <div className={styles.screen} ref={screenRef}>
              <div className={styles.notch} />
              <div className={styles.statusbar}>
                <span>9:41</span>
                <svg width="54" height="12" viewBox="0 0 54 12" fill="none">
                  <path d="M1 8.5c5-6 15-6 20 0" stroke="#0a0a0c" strokeWidth="1.6" strokeLinecap="round" />
                  <rect x="24" y="3" width="9" height="7" rx="1.6" stroke="#0a0a0c" strokeWidth="1.4" />
                  <rect x="26" y="4.6" width="5" height="3.8" rx=".6" fill="#0a0a0c" />
                  <rect x="36" y="1" width="17" height="10" rx="2.4" stroke="#0a0a0c" strokeWidth="1.3" />
                  <rect x="37.5" y="2.5" width="12" height="7" rx="1.3" fill="#0a0a0c" />
                  <rect x="54.4" y="4" width="1.6" height="4" rx=".7" fill="#0a0a0c" />
                </svg>
              </div>

              <div className={cn(styles.sceneSafari, homeVisible && styles.hiddenScene)}>
                <div className={styles.site}>
                  <div className={styles.siteMark}>🎓</div>
                  <h2>כניסה למערכת</h2>
                  <p className={styles.sub}>אלירן גלברג — מורה פרטי</p>
                  <div className={styles.siteCard}>
                    <div className={cn(styles.siteBtn, styles.google)}>המשך עם Google</div>
                    <div className={styles.siteDivider}>או</div>
                    <div className={styles.siteField}>כתובת אימייל</div>
                    <div className={styles.siteField}>••••••••</div>
                    <div className={cn(styles.siteBtn, styles.primary)}>התחברות</div>
                  </div>
                </div>
                <div className={styles.toolbar}>
                  <button type="button" className={styles.tbBtn}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M14 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button type="button" className={styles.tbBtn}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M10 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button type="button" ref={shareBtnRef} className={cn(styles.tbBtn, styles.tbBtnActive)}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12M8 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" /></svg>
                  </button>
                  <button type="button" className={styles.tbBtn}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M6 4h12v16l-6-4-6 4V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                  </button>
                  <button type="button" className={styles.tbBtn}>
                    <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="2" /></svg>
                  </button>
                </div>
              </div>

              <div className={cn(styles.sheet, shareSheetOpen && styles.sheetOpen)}>
                <div className={styles.sheetHandle} />
                <p className={styles.shareTitle}>app.elirangelberg.com</p>
                <div className={styles.shareApps}>
                  <div className={styles.shareApp} style={{ background: "#34c759" }}>💬</div>
                  <div className={styles.shareApp} style={{ background: "#007aff" }}>✉️</div>
                  <div className={styles.shareApp} style={{ background: "#8e8e93" }}>📋</div>
                  <div className={styles.shareApp} style={{ background: "#ff9500" }}>📝</div>
                  <div className={styles.shareApp} style={{ background: "#af52de" }}>🔗</div>
                </div>
                <div className={styles.shareActions}>
                  <div className={styles.shareRow}>
                    <span className={styles.ic}><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" /></svg></span>
                    העתקה
                  </div>
                  <div ref={addHomeRowRef} className={cn(styles.shareRow, stepIndex === 2 && styles.pulse)}>
                    <span className={styles.ic}>
                      <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" stroke="currentColor" strokeWidth="1.8" /><path d="M12 10v6M9 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    </span>
                    הוספה למסך הבית
                  </div>
                  <div className={styles.shareRow}>
                    <span className={styles.ic}><svg viewBox="0 0 24 24" fill="none"><path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg></span>
                    סימון
                  </div>
                </div>
              </div>

              <div className={cn(styles.sheet, addDialogOpen && styles.sheetOpen)}>
                <div className={styles.dialogHead}>
                  <span className={styles.cancel}>ביטול</span>
                  <h3>הוספה למסך הבית</h3>
                  <span ref={confirmBtnRef} className={cn(styles.add, stepIndex === 4 && styles.pulse)}>הוספה</span>
                </div>
                <div className={styles.dialogBody}>
                  <div className={styles.dialogIcon}>🎓</div>
                  <div className={styles.dialogName}>ניהול תורים</div>
                </div>
                <p className={styles.dialogUrl}>app.elirangelberg.com</p>
              </div>

              <div className={cn(styles.sceneHome, homeVisible && styles.sceneHomeVisible)}>
                <div className={styles.homeContent}>
                  <div className={styles.homeGrid}>
                    <div className={cn(styles.app, styles.newApp, homeVisible && styles.newAppPop)}>
                      <div className={styles.box}>🎓</div>
                      <span>ניהול תורים</span>
                    </div>
                    <div className={styles.app}>
                      <div className={styles.box} style={{ background: "linear-gradient(135deg,#4f5bd5,#962fbf 30%,#d62976 55%,#fa7e1e 75%,#feda75)" }}>
                        <svg viewBox="0 0 24 24" fill="none" width="58%" height="58%"><rect x="3" y="3" width="18" height="18" rx="5" stroke="white" strokeWidth="2" /><circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" /><circle cx="17.3" cy="6.7" r="1.1" fill="white" /></svg>
                      </div>
                      <span>אינסטגרם</span>
                    </div>
                    <div className={styles.app}>
                      <div className={styles.box} style={{ background: "#1877f2", fontFamily: "Georgia,'Times New Roman',serif", fontWeight: 700, color: "#fff" }}>f</div>
                      <span>פייסבוק</span>
                    </div>
                    <div className={styles.app}>
                      <div className={styles.box} style={{ background: "linear-gradient(135deg,#25d366,#128c7e)" }}>
                        <svg viewBox="0 0 32 32" fill="white" width="60%" height="60%"><path d="M16 3C9 3 3.3 8.7 3.3 15.7c0 2.5.7 4.8 1.9 6.8L3 29l6.7-2.1c1.9 1 4.1 1.6 6.3 1.6 7 0 12.7-5.7 12.7-12.7S23 3 16 3zm0 23.1c-2 0-3.9-.5-5.5-1.5l-.4-.2-4 1.2 1.2-3.9-.3-.4c-1.1-1.8-1.7-3.8-1.7-5.9 0-6.1 5-11.1 11.1-11.1s10.9 5 10.9 11.1S22 26.1 16 26.1z" /><path d="M21.6 18.3c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2s-.8 1-1 1.2c-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.7.1-.1.3-.4.5-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1.1 2.8 1.2 3c.1.2 2.2 3.3 5.2 4.6.7.3 1.3.5 1.8.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.3-.6-.4z" /></svg>
                      </div>
                      <span>וואטסאפ</span>
                    </div>
                    <div className={styles.app}>
                      <div className={styles.box} style={{ background: "linear-gradient(160deg,#f2ecdd,#ddd2b4)", position: "relative", overflow: "hidden" }}>
                        <svg width="100%" height="100%" viewBox="0 0 24 24" style={{ position: "absolute", inset: 0, opacity: .6 }}><path d="M-2 14 L26 8" stroke="#a99a6b" strokeWidth="1.6" /><path d="M-2 19 L26 21" stroke="#a99a6b" strokeWidth="1.2" /><path d="M7 -2 L11 26" stroke="#b7a97a" strokeWidth="1.2" /></svg>
                        <svg viewBox="0 0 24 24" width="52%" height="52%" style={{ position: "relative" }}><path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z" fill="#ff3b30" stroke="#fff" strokeWidth=".6" /><circle cx="12" cy="9" r="2.6" fill="#fff" /></svg>
                      </div>
                      <span>מפות</span>
                    </div>
                    <div className={styles.app}>
                      <div className={styles.box} style={{ background: "linear-gradient(180deg,#8ecdfb,#eef8ff)" }}>
                        <svg viewBox="0 0 24 24" width="62%" height="62%"><rect x="2" y="5.5" width="20" height="13.5" rx="2.2" fill="#fff" stroke="#0a6ed1" strokeWidth="1.1" /><path d="M2.8 6.6L12 13l9.2-6.4" fill="none" stroke="#0a6ed1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                      <span>מייל</span>
                    </div>
                    <div className={styles.app}>
                      <div className={styles.box} style={{ background: "radial-gradient(circle at 35% 30%,#3a3a3c,#0a0a0c)" }}>
                        <svg viewBox="0 0 24 24" width="72%" height="72%"><circle cx="12" cy="12" r="10" fill="#fff" /><circle cx="12" cy="4.3" r=".6" fill="#8e8e93" /><circle cx="12" cy="19.7" r=".6" fill="#8e8e93" /><circle cx="4.3" cy="12" r=".6" fill="#8e8e93" /><circle cx="19.7" cy="12" r=".6" fill="#8e8e93" /><line x1="12" y1="12" x2="12" y2="6.8" stroke="#1c1c1e" strokeWidth="1.3" strokeLinecap="round" /><line x1="12" y1="12" x2="15.8" y2="12" stroke="#1c1c1e" strokeWidth="1.3" strokeLinecap="round" /><line x1="12" y1="12" x2="9.3" y2="7.6" stroke="#ff3b30" strokeWidth=".7" strokeLinecap="round" /><circle cx="12" cy="12" r="1" fill="#ff3b30" /></svg>
                      </div>
                      <span>שעון</span>
                    </div>
                    <div className={styles.app}>
                      <div className={styles.box} style={{ background: "linear-gradient(160deg,#6bdf6f,#2bc037)" }}>
                        <svg viewBox="0 0 24 24" width="52%" height="52%" style={{ transform: "rotate(-8deg)" }}><path d="M6.6 2.6c.6-.2 1.3 0 1.6.6l1.5 2.9c.3.5.2 1.1-.2 1.5L8.1 9c.8 2 2.4 3.6 4.4 4.4l1.4-1.4c.4-.4 1-.5 1.5-.2l2.9 1.5c.6.3.8 1 .6 1.6l-.8 2.3c-.2.6-.8 1-1.4.9-6-.7-10.8-5.5-11.5-11.5-.1-.6.3-1.2.9-1.4l2.3-.8z" fill="#fff" /></svg>
                      </div>
                      <span>טלפון</span>
                    </div>
                  </div>
                  <div className={styles.dock}>
                    <div className={styles.box} style={{ background: "linear-gradient(160deg,#6bdf6f,#2bc037)" }}>
                      <svg viewBox="0 0 24 24" width="46%" height="46%" style={{ transform: "rotate(-8deg)" }}><path d="M6.6 2.6c.6-.2 1.3 0 1.6.6l1.5 2.9c.3.5.2 1.1-.2 1.5L8.1 9c.8 2 2.4 3.6 4.4 4.4l1.4-1.4c.4-.4 1-.5 1.5-.2l2.9 1.5c.6.3.8 1 .6 1.6l-.8 2.3c-.2.6-.8 1-1.4.9-6-.7-10.8-5.5-11.5-11.5-.1-.6.3-1.2.9-1.4l2.3-.8z" fill="#fff" /></svg>
                    </div>
                    <div className={styles.box} style={{ background: "linear-gradient(160deg,#eef3fa,#cfe0f5)" }}>🧭</div>
                    <div className={styles.box} style={{ background: "linear-gradient(135deg,#25d366,#128c7e)" }}>
                      <svg viewBox="0 0 32 32" fill="white" width="52%" height="52%"><path d="M16 3C9 3 3.3 8.7 3.3 15.7c0 2.5.7 4.8 1.9 6.8L3 29l6.7-2.1c1.9 1 4.1 1.6 6.3 1.6 7 0 12.7-5.7 12.7-12.7S23 3 16 3z" /></svg>
                    </div>
                    <div className={styles.box} style={{ background: "linear-gradient(180deg,#8ecdfb,#eef8ff)" }}>
                      <svg viewBox="0 0 24 24" width="52%" height="52%"><rect x="2" y="5.5" width="20" height="13.5" rx="2.2" fill="#fff" stroke="#0a6ed1" strokeWidth="1.1" /><path d="M2.8 6.6L12 13l9.2-6.4" fill="none" stroke="#0a6ed1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={cn(styles.finger, finger.visible && styles.fingerVisible, finger.tap && styles.fingerTap)}
                style={{ left: finger.x, top: finger.y }}
              />
              <div className={styles.homeIndicator} />
            </div>
          </div>
        </div>

        <div className={styles.captions}>
          <ol className={styles.steps}>
            {CAPTIONS.map((caption, i) => (
              <li
                key={i}
                className={cn(step.stop === i && styles.stepActive)}
                onClick={() => jumpToStop(i)}
              >
                <span className={styles.num}>{i + 1}</span>
                <span>{caption}</span>
              </li>
            ))}
          </ol>
          <div className={styles.controls}>
            <button type="button" className={cn(styles.ctrlBtn, styles.ctrlBtnPrimary)} onClick={() => setPlaying((p) => !p)}>
              {playing ? "⏸ השהיה" : "▶ המשך"}
            </button>
            <button type="button" className={styles.ctrlBtn} onClick={replay}>
              ↻ מההתחלה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
