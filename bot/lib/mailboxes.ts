export const MAIL_PROVIDER = "yandex" as const;

export type Mailbox = {
  address: string;
  who: string;
  note: string;
  inScope: boolean;
};

export const MAILBOXES: readonly Mailbox[] = [
  { address: "MiningDep@yandex.ru", who: "Дмитрий", note: "личный", inScope: true },
  { address: "ermolaev.d@mastermine.ru", who: "Дмитрий", note: "Mastermine", inScope: true },
  { address: "ermolaev@zemtronic.ru", who: "Дмитрий", note: "Земтроник", inScope: true },
  { address: "info@zemtronic.ru", who: "ООО «ЗТМ»", note: "ящик компании", inScope: true },
  { address: "explosivztm.ru@yandex.ru", who: "Дмитрий", note: "метка ZTM", inScope: true },
  { address: "noreply@hausearth.ru", who: "Hausearth", note: "добавлен отдельно", inScope: true },
  {
    address: "vasiliev@zemtronic.ru",
    who: "Максим Васильев",
    note: "вне синхронизации, пока Дмитрий не подтвердит",
    inScope: false,
  },
];

export function findMailbox(address: string | undefined): Mailbox | undefined {
  const key = address?.trim().toLowerCase() ?? "";
  if (key === "") return undefined;
  return MAILBOXES.find((box) => box.address.toLowerCase() === key);
}

export function isHeldMailbox(address: string | undefined): boolean {
  const box = findMailbox(address);
  return box !== undefined && !box.inScope;
}

export function inScopeMailboxes(): Mailbox[] {
  return MAILBOXES.filter((box) => box.inScope);
}

export function waitingMailboxes(): Mailbox[] {
  return MAILBOXES.filter((box) => !box.inScope);
}
