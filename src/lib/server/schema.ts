import { z } from "zod";

const text = z.string().max(100_000);
const id = z
  .string()
  .min(1)
  .max(250)
  .refine(v => !["__proto__", "constructor", "prototype"].includes(v));
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const stamp = z.string().max(60);
const num = z.number().finite().nonnegative().max(100_000_000);
const record = <T extends z.ZodType>(schema: T) => z.record(id, schema);
const url = z
  .string()
  .max(4000)
  .refine(v => !v || /^https?:\/\//i.test(v), "Use an http or https link.");
const entry = z.object({ id, kind: text, title: text, url, note: text });
const task = z.object({
  id,
  kind: z.enum(["session", "habit", "reflection", "checkpoint", "retrieval"]),
  title: text,
  detail: text,
  minutes: num,
  status: z.enum([
    "proposed",
    "accepted",
    "completed",
    "deferred",
    "dismissed",
  ]),
  reason: text,
  sessionId: id.optional(),
  retrievalPromptId: id.optional(),
  deferredTo: day.optional(),
  completedAt: stamp.optional(),
});

// Explicit allowlist: a document can never replace store actions or runtime flags.
export const workspaceSchema = z
  .object({
    checks: record(z.boolean()).default({}),
    sessions: record(
      z.object({
        currentStep: num,
        completed: z.boolean(),
        completedAt: stamp.optional(),
      })
    ).default({}),
    journals: z
      .array(
        z.object({
          id,
          date: day,
          sessionId: id.optional(),
          text,
          confusion: text.optional(),
          nextQuestion: text.optional(),
        })
      )
      .max(20000)
      .default([]),
    dailyLogs: record(
      z.object({
        date: day,
        minutes: num,
        manualMinutes: num.optional(),
        touched: z.boolean(),
        habits: record(z.boolean()).optional(),
        note: text.optional(),
        build: num.optional(),
        study: num.optional(),
        absorb: num.optional(),
        sleep: num.optional(),
        timeEntries: z
          .array(
            z.object({
              id,
              date: day,
              seconds: num,
              source: z.enum(["session", "manual", "focus"]),
              sessionId: id.optional(),
              createdAt: stamp,
            })
          )
          .max(10000)
          .optional(),
      })
    ).default({}),
    settings: z
      .object({
        scheduleMode: z.string().max(60),
        timeZone: z
          .string()
          .max(100)
          .refine(v => {
            try {
              new Intl.DateTimeFormat("en", { timeZone: v });
              return true;
            } catch {
              return false;
            }
          }, "Invalid time zone")
          .optional(),
        startDate: day.optional(),
        pace: z
          .object({
            weeklyHours: num.optional(),
            dailyTouchMinutes: num.optional(),
            sleepFloor: text.optional(),
            ankiCap: num.optional(),
            restDay: text.optional(),
          })
          .optional(),
        habitTimes: record(z.object({ from: text, to: text })).optional(),
        focusMinutes: z.number().int().min(5).max(180).optional(),
        reducedMotion: z.boolean().optional(),
      })
      .default({ scheduleMode: "semester", timeZone: "Asia/Kolkata" }),
    breadcrumbs: z.array(text).max(100).default([]),
    counters: z
      .object({ sessionsStarted: num, sessionsCompleted: num })
      .default({ sessionsStarted: 0, sessionsCompleted: 0 }),
    portfolio: z
      .object({ entries: z.array(entry).max(10000) })
      .default({ entries: [] }),
    evidence: z
      .array(
        z.object({
          schemaVersion: z.literal(1),
          id,
          kind: z.enum(["session-proof", "artifact", "note", "link"]),
          title: text,
          note: text,
          url: url.optional(),
          phaseId: id.optional(),
          sessionId: id.optional(),
          resourceId: id.optional(),
          capability: text.optional(),
          proofStatus: z.enum(["verified", "captured", "planned"]),
          createdAt: stamp,
          updatedAt: stamp,
        })
      )
      .max(20000)
      .default([]),
    resourceStates: record(
      z.object({
        status: z.enum(["saved", "active", "completed", "paused"]),
        note: text.optional(),
        updatedAt: stamp,
        completedAt: stamp.optional(),
      })
    ).default({}),
    onboardingComplete: z.boolean().default(true),
    timer: z
      .object({
        sessionId: id.optional(),
        running: z.boolean(),
        seconds: num,
        recordedSeconds: num.optional(),
      })
      .default({ running: false, seconds: 0, recordedSeconds: 0 }),
    reviews: record(
      z.object({
        answers: record(z.union([text, z.boolean()])),
        rituals: record(z.boolean()),
        decisions: z
          .object({ continue: text, stop: text, start: text })
          .optional(),
        savedAt: stamp,
      })
    ).default({}),
    progressionOverrides: record(
      z.object({ key: id, reason: text, createdAt: stamp })
    ).default({}),
    dailyPlans: record(
      z.object({
        schemaVersion: z.literal(1),
        date: day,
        capacityMinutes: num,
        mode: text,
        generatedAt: stamp,
        acceptedAt: stamp.optional(),
        tasks: z.array(task).max(100),
      })
    ).default({}),
    retrievalPrompts: z
      .array(
        z.object({
          schemaVersion: z.literal(1),
          id,
          sourceJournalId: id,
          sessionId: id.optional(),
          question: text,
          context: text.optional(),
          dueDate: day,
          intervalDays: num,
          repetitions: num,
          status: z.enum(["scheduled", "snoozed", "mastered"]),
          createdAt: stamp,
          updatedAt: stamp,
          lastReviewedAt: stamp.optional(),
        })
      )
      .max(20000)
      .default([]),
    sessionAttempts: record(
      z.object({
        schemaVersion: z.literal(1),
        sessionId: id,
        currentStep: num,
        proofMode: z.boolean(),
        journal: text,
        confusion: text,
        nextQuestion: text,
        timerSeconds: num,
        updatedAt: stamp,
      })
    ).default({}),
  })
  .strict();

export type WorkspaceDocument = z.infer<typeof workspaceSchema>;
export const saveSchema = z.object({
  revision: z.number().int().nonnegative(),
  state: workspaceSchema,
});
