import { DAY_PART_LABELS, LANE_LABELS, LANES, type Lane } from "./calendar.js";
import { inScopeMailboxes, MAIL_PROVIDER, waitingMailboxes, type Mailbox } from "./mailboxes.js";
import { taskPlace } from "./pc.js";

export type MailboxView = Pick<Mailbox, "address" | "who" | "note">;

export type ConnectionStatus = {
  mail: {
    live: false;
    provider: typeof MAIL_PROVIDER;
    reason: string;
    inScope: MailboxView[];
    waiting: MailboxView[];
  };
  calendar: {
    live: false;
    name: "Мой день";
    reason: string;
    lanes: Array<{ id: Lane; label: string }>;
    dayParts: string[];
  };
  tasks: {
    live: boolean;
    place: "pc";
    reason: string;
  };
};

export function connectionStatus(env: NodeJS.ProcessEnv = process.env): ConnectionStatus {
  return {
    mail: {
      live: false,
      provider: MAIL_PROVIDER,
      reason: "Яндекс известен, включая ящики на mastermine.ru, zemtronic.ru и hausearth.ru. Доступ к почте ещё не включён.",
      inScope: inScopeMailboxes().map(view),
      waiting: waitingMailboxes().map(view),
    },
    calendar: {
      live: false,
      name: "Мой день",
      reason: "Единый календарь уже задан. Внешние календари в него ещё не подключены.",
      lanes: LANES.map((id) => ({ id, label: LANE_LABELS[id] })),
      dayParts: [...DAY_PART_LABELS],
    },
    tasks: taskPlace(env),
  };
}

function view(box: Mailbox): MailboxView {
  return { address: box.address, who: box.who, note: box.note };
}
