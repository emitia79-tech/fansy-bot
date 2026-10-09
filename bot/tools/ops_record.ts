import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod";
import { dayPartFrom, isLane, LANES } from "../lib/calendar.js";
import { isHeldMailbox } from "../lib/mailboxes.js";
import { savePcTask } from "../lib/pc.js";
import { INDEX_KEY, itemKey, readIndex, type OpsIndex, type StoredItem } from "../lib/records.js";
import { MAIL_TOPICS, MAIL_TYPES } from "../lib/taxonomy.js";

const MailInput = z.object({
  kind: z.literal("mail"),
  id: z.string().min(1).max(200),
  mailbox: z.string().max(200).optional(),
  type: z.enum(MAIL_TYPES),
  topic: z.enum(MAIL_TOPICS),
  subject: z.string().min(1).max(300),
  from: z.string().max(200).optional(),
});

const NoteInput = z.object({
  kind: z.literal("note"),
  id: z.string().min(1).max(200),
  source: z.enum(["calendar", "vks", "meeting"]),
  lane: z.enum(LANES).optional(),
  title: z.string().min(1).max(300),
  body: z.string().max(4000),
  happenedAt: z.string().max(40).optional(),
  promises: z.array(z.string().max(300)).max(20).optional(),
});

const TaskInput = z.object({
  kind: z.literal("task"),
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  status: z.enum(["open", "done", "waiting"]),
  sourceLabel: z.string().max(120).optional(),
});

const RecordInput = z.discriminatedUnion("kind", [MailInput, NoteInput, TaskInput]);

type Kv = {
  get(key: string): Promise<unknown>;
  put(key: string, value: StoredItem | OpsIndex): Promise<void>;
};

export default defineTool({
  description:
    "Запоминает разобранное письмо или карточку «Моего дня». Дело записывает только в файл на компьютере, отдельный облачный список не создаёт.",
  effect: "write",
  dryRunResult: (input) => ({ stored: false, duplicate: false, id: input.id, kind: input.kind, dryRun: true }),
  inputSchema: RecordInput,
  async execute(input, ctx) {
    if (input.kind === "mail" && isHeldMailbox(input.mailbox)) {
      return {
        stored: false,
        duplicate: false,
        held: true,
        id: input.id,
        kind: input.kind,
        reason: "Ящик вне синхронизации, пока Дмитрий не подтвердит.",
      };
    }
    if (input.kind === "task") {
      return savePcTask(ctx.workspaceDir, {
        id: input.id,
        title: input.title,
        status: input.status,
      });
    }
    return saveItem(ctx.host.kv, toItem(input));
  },
});

function toItem(input: z.infer<typeof RecordInput>): StoredItem {
  switch (input.kind) {
    case "mail":
      return {
        kind: "mail",
        id: input.id,
        mailbox: input.mailbox ?? "",
        type: input.type,
        topic: input.topic,
        subject: input.subject,
        from: input.from ?? "",
      };
    case "note":
      return {
        kind: "note",
        id: input.id,
        source: input.source,
        lane: input.lane && isLane(input.lane) ? input.lane : "shared",
        dayPart: dayPartFrom(input.happenedAt),
        title: input.title,
        body: input.body,
        happenedAt: input.happenedAt ?? "",
        promises: input.promises ?? [],
      };
    case "task":
      return {
        kind: "task",
        id: input.id,
        title: input.title,
        status: input.status,
        sourceLabel: input.sourceLabel ?? "пока только здесь",
      };
    default: {
      const unreachable: never = input;
      throw new Error(`unknown record ${String(unreachable)}`);
    }
  }
}

async function saveItem(kv: Kv, item: StoredItem) {
  const key = itemKey(item.kind, item.id);
  const existing = await kv.get(key);
  if (existing !== undefined) {
    return { stored: false, duplicate: true, id: item.id, kind: item.kind };
  }
  const index = readIndex(await kv.get(INDEX_KEY));
  const bucket = bucketName(item.kind);
  await kv.put(key, item);
  await kv.put(INDEX_KEY, {
    mail: bucket === "mail" ? [...index.mail, item.id] : index.mail,
    notes: bucket === "notes" ? [...index.notes, item.id] : index.notes,
    tasks: bucket === "tasks" ? [...index.tasks, item.id] : index.tasks,
  });
  return { stored: true, duplicate: false, id: item.id, kind: item.kind };
}

function bucketName(kind: StoredItem["kind"]): keyof OpsIndex {
  switch (kind) {
    case "mail":
      return "mail";
    case "note":
      return "notes";
    case "task":
      return "tasks";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
