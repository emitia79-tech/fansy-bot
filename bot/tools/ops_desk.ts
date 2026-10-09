import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod";
import { LANE_LABELS, LANES } from "../lib/calendar.js";
import { connectionStatus } from "../lib/connections.js";
import { isHeldMailbox } from "../lib/mailboxes.js";
import { inspectPc } from "../lib/pc.js";
import { itemKey, readIndex, readItem, type StoredItem, type StoredNote } from "../lib/records.js";
import { classifyMail, MAIL_TOPICS, MAIL_TYPES, TOPIC_LABELS, TYPE_LABELS } from "../lib/taxonomy.js";

const Message = z.object({
  id: z.string().min(1).max(200).optional(),
  mailbox: z.string().max(200).optional(),
  from: z.string().max(200).optional(),
  subject: z.string().min(1).max(300),
  snippet: z.string().max(2000).optional(),
});

export default defineTool({
  description:
    "Статус подключений, разбор писем по виду и теме или цифры четырёх экранов. Ничего не записывает и в ящики не ходит.",
  effect: "read",
  inputSchema: z.object({
    action: z.enum(["status", "sort_mail", "dashboard"]),
    messages: z.array(Message).max(50).optional(),
  }),
  async execute(input, ctx) {
    switch (input.action) {
      case "status":
        return { action: "status" as const, connections: connectionStatus() };
      case "sort_mail":
        return {
          action: "sort_mail" as const,
          items: (input.messages ?? []).map((message) => sortMessage(message)),
        };
      case "dashboard":
        return { action: "dashboard" as const, ...(await dashboard(ctx.host.kv, ctx.workspaceDir)) };
      default: {
        const unreachable: never = input.action;
        throw new Error(`unknown action ${String(unreachable)}`);
      }
    }
  },
});

async function dashboard(kv: { get(key: string): Promise<unknown> }, workspaceDir: string | undefined) {
  const index = readIndex(await kv.get("ops:index"));
  const mail = await loadKind(kv, "mail", index.mail);
  const notes = await loadKind(kv, "note", index.notes);
  const pc = await inspectPc(workspaceDir);
  const byType = Object.fromEntries(MAIL_TYPES.map((type) => [type, 0])) as Record<string, number>;
  const byTopic = Object.fromEntries(MAIL_TOPICS.map((topic) => [topic, 0])) as Record<string, number>;
  let actions = 0;
  for (const item of mail) {
    if (item.kind !== "mail") continue;
    byType[item.type] = (byType[item.type] ?? 0) + 1;
    byTopic[item.topic] = (byTopic[item.topic] ?? 0) + 1;
    if (item.type === "action" || item.type === "finance") actions += 1;
  }
  let open = 0;
  let waiting = 0;
  let done = 0;
  for (const item of pc.tasks) {
    if (item.status === "open") open += 1;
    else if (item.status === "waiting") waiting += 1;
    else if (item.status === "done") done += 1;
  }
  const meetings = notes.filter((item): item is StoredNote => item.kind === "note");
  const promises = meetings.reduce((sum, item) => sum + item.promises.length, 0);
  const connections = connectionStatus();
  return {
    connections,
    panels: {
      morning: {
        title: "Утро",
        actions,
        meetings: meetings.length,
        openTasks: open,
        line: morningLine(connections, actions, meetings.length, open),
      },
      mail: {
        title: "Почта",
        total: mail.length,
        byType,
        byTopic,
        byMailbox: mailboxCounts(mail),
        typeLabels: TYPE_LABELS,
        topicLabels: TOPIC_LABELS,
      },
      day: {
        title: "Мой день",
        notes: meetings.length,
        promises,
        byLane: laneCounts(meetings),
        latest: meetings.slice(-5).reverse().map((item) => ({
          title: item.title,
          source: item.source,
          lane: item.lane,
          dayPart: item.dayPart,
        })),
      },
      tasks: {
        title: "Дела",
        place: "pc" as const,
        connected: pc.connected,
        files: pc.files,
        open,
        waiting,
        done,
      },
    },
  };
}

function sortMessage(message: { id?: string; mailbox?: string; from?: string; subject: string; snippet?: string }) {
  if (isHeldMailbox(message.mailbox)) {
    return {
      id: message.id ?? "",
      mailbox: message.mailbox ?? "",
      skipped: true,
      reason: "Ящик вне синхронизации, пока Дмитрий не подтвердит.",
    };
  }
  return { ...classifyMail(message), skipped: false };
}

function laneCounts(notes: StoredNote[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const lane of LANES) counts[LANE_LABELS[lane]] = 0;
  for (const note of notes) counts[LANE_LABELS[note.lane]] = (counts[LANE_LABELS[note.lane]] ?? 0) + 1;
  return counts;
}

function mailboxCounts(mail: StoredItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const box of connectionStatus().mail.inScope) counts[box.address] = 0;
  for (const item of mail) {
    if (item.kind !== "mail" || item.mailbox === "") continue;
    counts[item.mailbox] = (counts[item.mailbox] ?? 0) + 1;
  }
  return counts;
}

function morningLine(
  connections: ReturnType<typeof connectionStatus>,
  actions: number,
  meetings: number,
  openTasks: number,
): string {
  if (!connections.mail.live && !connections.calendar.live && !connections.tasks.live && actions === 0 && meetings === 0 && openTasks === 0) {
    return "Яндекс известен, доступ к ящикам ещё не включён. «Мой день» готов, внешние календари не подключены. Дела на вашем компьютере, эта сессия его не видит.";
  }
  return `К действию: ${actions}. Встреч в памяти: ${meetings}. Открытых дел: ${openTasks}.`;
}

async function loadKind(
  kv: { get(key: string): Promise<unknown> },
  kind: StoredItem["kind"],
  ids: string[],
): Promise<StoredItem[]> {
  const items: StoredItem[] = [];
  for (const id of ids) {
    const item = readItem(await kv.get(itemKey(kind, id)));
    if (item) items.push(item);
  }
  return items;
}
