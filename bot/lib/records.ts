import { dayPartFrom, isDayPart, isLane, type DayPart, type Lane } from "./calendar.js";
import type { MailTopic, MailType } from "./taxonomy.js";

export type NoteSource = "calendar" | "vks" | "meeting";
export type TaskStatus = "open" | "done" | "waiting";

export type StoredMail = {
  kind: "mail";
  id: string;
  mailbox: string;
  type: MailType;
  topic: MailTopic;
  subject: string;
  from: string;
};

export type StoredNote = {
  kind: "note";
  id: string;
  source: NoteSource;
  lane: Lane;
  dayPart: DayPart;
  title: string;
  body: string;
  happenedAt: string;
  promises: string[];
};

export type StoredTask = {
  kind: "task";
  id: string;
  title: string;
  status: TaskStatus;
  sourceLabel: string;
};

export type StoredItem = StoredMail | StoredNote | StoredTask;

export type OpsIndex = {
  mail: string[];
  notes: string[];
  tasks: string[];
};

export const INDEX_KEY = "ops:index";

export function itemKey(kind: StoredItem["kind"], id: string): string {
  return `ops:${kind}:${id}`;
}

export function emptyIndex(): OpsIndex {
  return { mail: [], notes: [], tasks: [] };
}

export function readIndex(value: unknown): OpsIndex {
  if (!isMap(value)) return emptyIndex();
  return {
    mail: readIds(value.mail),
    notes: readIds(value.notes),
    tasks: readIds(value.tasks),
  };
}

export function readItem(value: unknown): StoredItem | undefined {
  if (!isMap(value) || typeof value.kind !== "string" || typeof value.id !== "string") {
    return undefined;
  }
  if (value.kind === "mail" && typeof value.subject === "string" && typeof value.type === "string" && typeof value.topic === "string") {
    return {
      kind: "mail",
      id: value.id,
      mailbox: typeof value.mailbox === "string" ? value.mailbox : "",
      type: value.type as MailType,
      topic: value.topic as MailTopic,
      subject: value.subject,
      from: typeof value.from === "string" ? value.from : "",
    };
  }
  if (value.kind === "note" && typeof value.title === "string" && typeof value.source === "string") {
    const happenedAt = typeof value.happenedAt === "string" ? value.happenedAt : "";
    const lane = typeof value.lane === "string" && isLane(value.lane) ? value.lane : "shared";
    const dayPart = typeof value.dayPart === "string" && isDayPart(value.dayPart) ? value.dayPart : dayPartFrom(happenedAt);
    return {
      kind: "note",
      id: value.id,
      source: value.source as NoteSource,
      lane,
      dayPart,
      title: value.title,
      body: typeof value.body === "string" ? value.body : "",
      happenedAt,
      promises: readIds(value.promises),
    };
  }
  if (value.kind === "task" && typeof value.title === "string" && typeof value.status === "string") {
    return {
      kind: "task",
      id: value.id,
      title: value.title,
      status: value.status as TaskStatus,
      sourceLabel: typeof value.sourceLabel === "string" ? value.sourceLabel : "пока только здесь",
    };
  }
  return undefined;
}

function readIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item !== "");
}

function isMap(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
