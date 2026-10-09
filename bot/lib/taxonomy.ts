import { findMailbox } from "./mailboxes.js";

export const MAIL_TYPES = ["action", "meeting", "finance", "people", "fyi", "noise"] as const;
export type MailType = (typeof MAIL_TYPES)[number];

export const MAIL_TOPICS = [
  "mastermine",
  "zemtronic",
  "hausearth",
  "fancy",
  "clients",
  "team",
  "money",
  "travel",
  "health",
  "personal",
  "other",
] as const;
export type MailTopic = (typeof MAIL_TOPICS)[number];

export const TYPE_LABELS: Record<MailType, string> = {
  action: "Дело",
  meeting: "Встреча",
  finance: "Деньги",
  people: "Люди",
  fyi: "К сведению",
  noise: "Шум",
};

export const TOPIC_LABELS: Record<MailTopic, string> = {
  mastermine: "Mastermine",
  zemtronic: "Земтроник",
  hausearth: "Hausearth",
  fancy: "Fancy",
  clients: "Клиенты",
  team: "Команда",
  money: "Деньги",
  travel: "Поездки",
  health: "Здоровье",
  personal: "Личное",
  other: "Прочее",
};

const TYPE_RULES: Array<{ type: MailType; words: string[] }> = [
  { type: "meeting", words: ["встреч", "созвон", "вкс", "zoom", "telemost", "телемост", "календар", "митинг", "invite"] },
  { type: "finance", words: ["счёт", "счет", "оплат", "акт", "invoice", "payment"] },
  { type: "people", words: ["отпуск", "кандидат", "резюме", "собеседован"] },
  { type: "action", words: ["прошу", "нужно", "срочно", "подтверд", "ответьте", "action required"] },
  { type: "noise", words: ["unsubscribe", "рассылк", "newsletter", "no-reply", "noreply"] },
];

const TOPIC_WORDS: Array<{ topic: MailTopic; words: string[] }> = [
  { topic: "travel", words: ["поездк", "билет", "отель", "командиров", "рейс"] },
  { topic: "health", words: ["здоров", "врач", "анализ", "клиник"] },
  { topic: "mastermine", words: ["mastermine", "мастермайн"] },
  { topic: "zemtronic", words: ["zemtronic", "земтроник", "зтм", "ztm", "explosiv"] },
  { topic: "hausearth", words: ["hausearth", "haus earth", "хаусэрт"] },
  { topic: "fancy", words: ["fancy", "сувенир", "мерч", "брендир", "fancy-group"] },
  { topic: "clients", words: ["клиент", "заказ", "тираж", "коммерческ"] },
  { topic: "team", words: ["команд", "сотрудник", "подряд"] },
  { topic: "personal", words: ["личн", "семь", "день рождения"] },
  { topic: "money", words: ["бюджет", "оплат", "счёт", "счет", "деньг"] },
];

const LIFE_TOPICS = new Set<MailTopic>(["travel", "health"]);
const COMPANY_TOPICS = new Set<MailTopic>(["mastermine", "zemtronic", "hausearth", "fancy", "clients", "team", "personal"]);

export type MailDraft = {
  id?: string;
  mailbox?: string;
  from?: string;
  subject: string;
  snippet?: string;
};

export type MailSort = {
  id: string;
  mailbox: string;
  type: MailType;
  topic: MailTopic;
  typeLabel: string;
  topicLabel: string;
  rule: string;
};

export function classifyMail(draft: MailDraft): MailSort {
  const haystack = `${draft.from ?? ""}\n${draft.subject}\n${draft.snippet ?? ""}`.toLowerCase();
  const typeHit = TYPE_RULES.find((rule) => rule.words.some((word) => haystack.includes(word)));
  const type = typeHit?.type ?? "fyi";
  const topic = pickTopic(haystack, draft.mailbox);
  return {
    id: draft.id && draft.id.trim() !== "" ? draft.id.trim() : stableId(draft.subject, draft.from ?? "", draft.mailbox ?? ""),
    mailbox: draft.mailbox?.trim() ?? "",
    type,
    topic,
    typeLabel: TYPE_LABELS[type],
    topicLabel: TOPIC_LABELS[topic],
    rule: typeHit || topic !== "other" ? "по словам или ящику" : "ярлык по умолчанию",
  };
}

function pickTopic(haystack: string, mailbox: string | undefined): MailTopic {
  const hits = TOPIC_WORDS.filter((rule) => rule.words.some((word) => haystack.includes(word))).map((rule) => rule.topic);
  const life = hits.find((topic) => LIFE_TOPICS.has(topic));
  if (life) return life;
  const named = hits.find((topic) => COMPANY_TOPICS.has(topic));
  if (named) return named;
  const fromBox = topicFromMailbox(mailbox);
  if (fromBox) return fromBox;
  const money = hits.find((topic) => topic === "money");
  return money ?? "other";
}

function topicFromMailbox(address: string | undefined): MailTopic | undefined {
  const box = findMailbox(address);
  if (!box || !box.inScope) return undefined;
  const key = box.address.toLowerCase();
  if (key.endsWith("@mastermine.ru")) return "mastermine";
  if (key.endsWith("@zemtronic.ru") || key.includes("ztm")) return "zemtronic";
  if (key.endsWith("@hausearth.ru")) return "hausearth";
  if (key === "miningdep@yandex.ru") return "personal";
  return undefined;
}

function stableId(subject: string, from: string, mailbox: string): string {
  const text = `${mailbox}\n${from}\n${subject}`;
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(index);
  }
  return `m${(hash >>> 0).toString(16)}`;
}
