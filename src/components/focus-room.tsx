"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Headphones,
  Maximize2,
  Minimize2,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { model } from "@/data";
import { getNextAction } from "@/state/selectors";
import { getLocalDateKey } from "@/state/date";
import { useMeridianStore } from "@/state/store";
import { elapsedSeconds, formatTimer } from "@/lib/focus-time";
import { saveCloud } from "@/state/cloud";

export function FocusRoom() {
  const state = useMeridianStore();
  const next = getNextAction(model, state);
  const session = model.phases
    .flatMap(p => p.sessions)
    .find(s => s.id === next.sessionId);
  const [duration, setDuration] = useState(state.settings.focusMinutes ?? 25);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [intent, setIntent] = useState("");
  const intention = useRef("");
  const [sound, setSound] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [message, setMessage] = useState("");
  const frame = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const ticker = useRef({
    base: 0,
    startedAt: 0,
    recorded: 0,
    id: "",
    running: false,
    date: "",
  });
  const remaining = Math.max(0, duration * 60 - elapsed);
  const fraction = elapsed / (duration * 60);
  function captureIntention() {
    if (!intention.current.trim()) return;
    const store = useMeridianStore.getState();
    const date = getLocalDateKey(new Date(), store.settings.timeZone);
    store.setDailyLog(
      date,
      store.dailyLogs[date]?.manualMinutes ?? 0,
      [store.dailyLogs[date]?.note, `Focus: ${intention.current.trim()}`]
        .filter(Boolean)
        .join("\n")
    );
    void saveCloud();
  }
  function persist() {
    const t = ticker.current;
    const seconds = t.running
      ? elapsedSeconds(t.base, t.startedAt, Date.now(), duration * 60)
      : t.base;
    const delta = Math.max(0, seconds - t.recorded);
    if (delta > 0) {
      useMeridianStore
        .getState()
        .recordTime({ id: t.id, date: t.date, seconds, source: "focus" });
      t.recorded = seconds;
      void saveCloud();
    }
    return seconds;
  }
  // One timer per room; write checkpoints without depending on interval frequency.
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const value = elapsedSeconds(
        ticker.current.base,
        ticker.current.startedAt,
        Date.now(),
        duration * 60
      );
      setElapsed(value);
      if (value % 15 === 0) persist();
      if (value >= duration * 60) {
        persist();
        captureIntention();
        ticker.current.base = value;
        ticker.current.running = false;
        setRunning(false);
        setComplete(true);
        void audio.current?.suspend();
        setSound(false);
      }
    }, 250);
    const visibility = () => {
      if (document.visibilityState === "hidden") persist();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
      persist();
    };
    // The ref owns the clock; render state is just the display.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, duration]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    []
  );
  useEffect(() => {
    const change = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  function toggle() {
    if (complete) return;
    if (running) {
      const value = persist();
      ticker.current.base = value;
      ticker.current.running = false;
      setElapsed(value);
      setRunning(false);
    } else {
      if (!ticker.current.id) {
        ticker.current.id = `focus.${crypto.randomUUID()}`;
        ticker.current.date = getLocalDateKey(
          new Date(),
          state.settings.timeZone
        );
      }
      ticker.current.base = elapsed;
      ticker.current.startedAt = Date.now();
      ticker.current.running = true;
      setRunning(true);
    }
  }
  function reset() {
    persist();
    ticker.current = {
      base: 0,
      startedAt: 0,
      recorded: 0,
      id: "",
      running: false,
      date: "",
    };
    setRunning(false);
    setElapsed(0);
    setComplete(false);
    setMessage("");
  }
  async function toggleSound() {
    try {
      if (sound) {
        await audio.current?.suspend();
        setSound(false);
        return;
      }
      if (!audio.current) {
        const context = new AudioContext();
        audio.current = context;
        const length = context.sampleRate * 4;
        const buffer = context.createBuffer(1, length, context.sampleRate);
        const channel = buffer.getChannelData(0);
        let previous = 0;
        for (let i = 0; i < length; i++) {
          previous = (previous + Math.random() * 0.04 - 0.02) / 1.02;
          channel[i] = previous * 3.5;
        }
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const gain = context.createGain();
        gain.gain.value = 0.25;
        source.connect(gain);
        gain.connect(context.destination);
        source.start();
      }
      await audio.current.resume();
      setSound(true);
    } catch {
      setMessage(
        "Sound isn’t available in this browser. Your focus timer is still ready."
      );
    }
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frame.current?.requestFullscreen();
    } catch {
      setMessage(
        "Fullscreen isn’t available here. You can still focus in this view."
      );
    }
  }
  function finish() {
    const value = persist();
    ticker.current.base = value;
    ticker.current.running = false;
    setElapsed(value);
    setRunning(false);
    captureIntention();
    void audio.current?.suspend();
    setSound(false);
    setComplete(true);
    setMessage("Your focused time has been recorded.");
  }
  return (
    <div className="focus-room" ref={frame}>
      <div className="focus-room-bg" />
      <div className="focus-room-top">
        <Link href="/" className="text-link">
          <Orbit size={18} />
          Back to your observatory
        </Link>
        <button
          className="icon-button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {fullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
        </button>
      </div>
      <div className="focus-room-body">
        <div className="eyebrow">
          <span className="signal-dot" />
          {complete ? "A LITTLE FURTHER" : "THE REST CAN WAIT"}
        </div>
        <h1>
          {complete
            ? "That time was yours."
            : "One thing. Your full attention."}
        </h1>
        <p>
          {complete
            ? "Take a breath. Stretch. Let the work settle."
            : "A quiet corner of the universe, just for this."}
        </p>
        <div className="focus-presets" aria-label="Focus duration">
          {[25, 50, 90].map(value => (
            <button
              key={value}
              disabled={running || elapsed > 0}
              onClick={() => {
                setDuration(value);
                state.setSetting("focusMinutes", value);
              }}
              className={duration === value ? "active" : ""}
            >
              {value} min
            </button>
          ))}
        </div>
        <div className={`focus-clock ${running ? "running" : ""}`}>
          <svg viewBox="0 0 320 320" aria-hidden="true">
            <circle cx="160" cy="160" r="151" className="clock-track" />
            <circle
              cx="160"
              cy="160"
              r="151"
              className="clock-progress"
              strokeDasharray={949}
              strokeDashoffset={949 * fraction}
            />
          </svg>
          <div>
            <span
              className="focus-time"
              role="timer"
              aria-label={`${Math.floor(remaining / 60)} minutes remaining`}
            >
              {formatTimer(remaining)}
            </span>
            <span className="focus-clock-label">
              {complete
                ? "SESSION COMPLETE"
                : running
                  ? "STAY WITH IT"
                  : elapsed
                    ? "TAKE YOUR TIME"
                    : "READY WHEN YOU ARE"}
            </span>
          </div>
        </div>
        <label className="focus-intent">
          <span>What’s your one thing?</span>
          <input
            aria-label="Focus intention"
            placeholder={
              session?.title.replace(/^Tonight: /, "") ??
              "Give this session a purpose…"
            }
            maxLength={250}
            value={intent}
            onChange={e => {
              intention.current = e.target.value;
              setIntent(e.target.value);
            }}
          />
        </label>
        <div className="focus-controls">
          <button
            className="icon-button"
            onClick={reset}
            aria-label="Reset focus timer"
          >
            <RotateCcw size={19} />
          </button>
          {complete ? (
            <button className="button-primary" onClick={reset}>
              Another small step
              <ArrowRight size={17} />
            </button>
          ) : (
            <button className="button-primary" onClick={toggle}>
              {running ? (
                <Pause size={17} />
              ) : (
                <Play size={17} fill="currentColor" />
              )}
              {running
                ? "Pause focus"
                : elapsed
                  ? "Resume focus"
                  : "Begin focus"}
            </button>
          )}
          <button
            className="icon-button"
            onClick={toggleSound}
            aria-label={sound ? "Mute ambient sound" : "Play ambient sound"}
          >
            {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
        </div>
        {elapsed > 0 && !complete && (
          <button className="text-link focus-finish" onClick={finish}>
            <Check size={14} />
            Finish and record session
          </button>
        )}
        <p className="focus-message" aria-live="polite">
          {message ||
            "Time is recorded automatically. Progress is made one minute at a time."}
        </p>
        <div className="ambient-status">
          <Headphones size={14} />
          {sound ? "Soft brown noise · playing" : "A quieter mind starts here"}
        </div>
      </div>
      <div className="focus-room-bottom">
        <span>Be here. That’s enough.</span>
        {session && (
          <Link href={`/session/${session.id}`}>
            Open guided session
            <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}
