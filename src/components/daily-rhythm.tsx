"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Moon, Settings2, Sun, Sunset } from "lucide-react";
import { model } from "@/data";
import { getLocalDateKey } from "@/state/date";
import { useMeridianStore } from "@/state/store";
import { TickBox } from "./tick-box";
import { RhythmView } from "./stage3-views";
const periods = [
  { id: "morning", label: "A grounded beginning", icon: Sun },
  { id: "afternoon", label: "Room for deep work", icon: Sunset },
  { id: "evening", label: "Close the loop", icon: Moon },
];
export function DailyRhythm() {
  const state = useMeridianStore();
  const date = getLocalDateKey(new Date(), state.settings.timeZone);
  const habits = state.dailyLogs[date]?.habits ?? {};
  const [guide, setGuide] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const done = model.habitStack.filter(h => habits[h.id]).length;
  return (
    <div className="content rhythm-page">
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">CONSISTENCY HAS A RHYTHM</div>
          <h1>
            Build a day you can return to<span className="greeting-dot">.</span>
          </h1>
          <p>
            Small anchors around your study sessions. Adjust the times to fit
            your life.
          </p>
        </div>
        <span className="pill-violet">
          {done} / {model.habitStack.length} anchors
        </span>
      </div>
      <div className="rhythm-progress">
        <span style={{ width: `${(done / model.habitStack.length) * 100}%` }} />
      </div>
      <div className="rhythm-blocks">
        {periods.map(({ id, label, icon: Icon }) => (
          <section className="obs-panel rhythm-block" key={id}>
            <div className="panel-heading">
              <div>
                <span className="eyebrow">{id.toUpperCase()}</span>
                <h2>{label}</h2>
              </div>
              <Icon size={23} />
            </div>
            <div className="rhythm-habits">
              {model.habitStack
                .filter(h => h.block === id)
                .map(habit => {
                  const times = state.settings.habitTimes?.[habit.id] ?? {
                    from: habit.from,
                    to: habit.to,
                  };
                  return (
                    <div
                      className={`rhythm-habit ${habits[habit.id] ? "done" : ""}`}
                      key={habit.id}
                    >
                      <div className="rhythm-habit-top">
                        <TickBox
                          checked={!!habits[habit.id]}
                          className="flight-check"
                          label={`Complete ${habit.label}`}
                          onChange={() =>
                            state.setHabit(date, habit.id, !habits[habit.id])
                          }
                        />
                        <strong>{habit.label}</strong>
                        <button
                          className="icon-button"
                          aria-label={`Edit time for ${habit.label}`}
                          onClick={() =>
                            setEditing(editing === habit.id ? null : habit.id)
                          }
                        >
                          {editing === habit.id ? (
                            <Check size={14} />
                          ) : (
                            <Settings2 size={14} />
                          )}
                        </button>
                      </div>
                      <p>{habit.detail}</p>
                      {editing === habit.id ? (
                        <div className="habit-time-inputs">
                          {(["from", "to"] as const).map(key => (
                            <label key={key}>
                              {key === "from" ? "From" : "Until"}
                              <input
                                type="time"
                                aria-label={`${habit.label} ${key}`}
                                value={times[key]}
                                onChange={e =>
                                  state.setSetting("habitTimes", {
                                    ...state.settings.habitTimes,
                                    [habit.id]: {
                                      ...times,
                                      [key]: e.target.value,
                                    },
                                  })
                                }
                              />
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="rhythm-habit-meta">
                          <span>
                            {times.from} — {times.to}
                          </span>
                          {habit.star && (
                            <span className="pill-violet">CORE ANCHOR</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
      <div className="rhythm-guide-toggle">
        <div>
          <h2>Your field guide</h2>
          <p>Stuck protocols, sustainable study, recall, and weekly rituals.</p>
        </div>
        <button className="button-secondary" onClick={() => setGuide(!guide)}>
          {guide ? "Close guide" : "Open study guide"}
          <ArrowRight size={15} />
        </button>
      </div>
      {guide && (
        <div className="rhythm-reference">
          <RhythmView />
        </div>
      )}
      <Link className="text-link accent-link" href="/">
        Back to today’s plan
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}
