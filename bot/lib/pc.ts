import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PcTaskStatus = "open" | "done" | "waiting";

export type PcTask = {
  id: string;
  title: string;
  status: PcTaskStatus;
};

const KNOWN_LISTS = ["дела.md", "tasks.md", "todo.txt"] as const;

export function pcConnected(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.OPS_ON_PC === "1";
}

export function taskPlace(env: NodeJS.ProcessEnv = process.env): {
  live: boolean;
  place: "pc";
  reason: string;
} {
  const live = pcConnected(env);
  return {
    live,
    place: "pc",
    reason: live
      ? "Дела на этом компьютере, в файлах рабочей папки."
      : "Дела на вашем компьютере. Эта сессия его не видит.",
  };
}

export async function inspectPc(workspaceDir: string | undefined, env: NodeJS.ProcessEnv = process.env) {
  if (!pcConnected(env)) {
    return { connected: false, files: [] as string[], tasks: [] as PcTask[] };
  }
  if (!workspaceDir) {
    return { connected: true, files: [] as string[], tasks: [] as PcTask[], reason: "Рабочая папка сессии не задана." };
  }
  const files = await knownLists(workspaceDir);
  if (files.length !== 1) {
    return { connected: true, files, tasks: [] as PcTask[] };
  }
  const read = await readList(workspaceDir, files[0]);
  return { connected: true, files, tasks: read?.tasks ?? [], foreign: read?.foreign ?? false };
}

export async function savePcTask(
  workspaceDir: string | undefined,
  task: PcTask,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ stored: boolean; duplicate: boolean; id: string; kind: "task"; place: "pc"; file?: string; reason?: string; files?: string[] }> {
  if (!pcConnected(env)) {
    return {
      stored: false,
      duplicate: false,
      id: task.id,
      kind: "task",
      place: "pc",
      reason: "Дела на вашем компьютере. Эта сессия его не видит.",
    };
  }
  if (!workspaceDir) {
    return {
      stored: false,
      duplicate: false,
      id: task.id,
      kind: "task",
      place: "pc",
      reason: "Рабочая папка сессии не задана.",
    };
  }
  const existing = await knownLists(workspaceDir);
  if (existing.length === 0) {
    return {
      stored: false,
      duplicate: false,
      id: task.id,
      kind: "task",
      place: "pc",
      reason: "В рабочей папке компьютера списка не видно. Новый список сам не создаётся.",
    };
  }
  if (existing.length > 1) {
    return {
      stored: false,
      duplicate: false,
      id: task.id,
      kind: "task",
      place: "pc",
      files: existing,
      reason: "На компьютере несколько списков. Нужно сказать, какой вести.",
    };
  }
  const fileName = existing[0];
  if (fileName === undefined) {
    return {
      stored: false,
      duplicate: false,
      id: task.id,
      kind: "task",
      place: "pc",
      reason: "В рабочей папке компьютера списка не видно. Новый список сам не создаётся.",
    };
  }
  const current = await readList(workspaceDir, fileName);
  if (current?.foreign) {
    return {
      stored: false,
      duplicate: false,
      id: task.id,
      kind: "task",
      place: "pc",
      file: fileName,
      reason: "Список на компьютере в своём виде. Файл целиком не переписывается.",
    };
  }
  const tasks = current?.tasks ?? [];
  const duplicate = tasks.some((item) => item.id === task.id);
  const next = duplicate ? tasks.map((item) => (item.id === task.id ? task : item)) : [...tasks, task];
  const full = listPath(workspaceDir, fileName);
  if (!full) {
    return { stored: false, duplicate: false, id: task.id, kind: "task", place: "pc", reason: "Путь списка вне рабочей папки." };
  }
  await writeFile(full, renderList(next), "utf8");
  return { stored: true, duplicate, id: task.id, kind: "task", place: "pc", file: fileName };
}

function renderList(tasks: PcTask[]): string {
  const lines = ["# Дела", ""];
  for (const task of tasks) {
    const mark = task.status === "done" ? "x" : task.status === "waiting" ? "-" : " ";
    lines.push(`- [${mark}] ${task.id} | ${task.title.replaceAll("\n", " ")}`);
  }
  lines.push("");
  return lines.join("\n");
}

async function knownLists(workspaceDir: string): Promise<string[]> {
  try {
    const names = await readdir(workspaceDir);
    return KNOWN_LISTS.filter((name) => names.includes(name));
  } catch {
    return [];
  }
}

async function readList(workspaceDir: string, fileName: string): Promise<{ tasks: PcTask[]; foreign: boolean } | undefined> {
  const full = listPath(workspaceDir, fileName);
  if (!full) return undefined;
  try {
    const text = await readFile(full, "utf8");
    return parseList(text);
  } catch {
    return undefined;
  }
}

function parseList(text: string): { tasks: PcTask[]; foreign: boolean } {
  const tasks: PcTask[] = [];
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line !== "");
  const body = lines.filter((line) => line !== "# Дела");
  if (body.length === 0) return { tasks, foreign: false };
  for (const line of body) {
    const matched = line.match(/^- \[([ x-])\] ([^|]+)\| ?(.*)$/);
    if (!matched) return { tasks: [], foreign: true };
    const mark = matched[1];
    const status: PcTaskStatus = mark === "x" ? "done" : mark === "-" ? "waiting" : "open";
    tasks.push({ id: matched[2].trim(), title: matched[3].trim(), status });
  }
  return { tasks, foreign: false };
}

function listPath(workspaceDir: string, fileName: string): string | undefined {
  if (!(KNOWN_LISTS as readonly string[]).includes(fileName)) return undefined;
  const root = path.resolve(workspaceDir);
  const full = path.resolve(root, fileName);
  if (full !== path.join(root, fileName)) return undefined;
  return full;
}
