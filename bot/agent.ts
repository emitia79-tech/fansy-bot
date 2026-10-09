import { defineAgent } from "@cursor/bdk";

export default defineAgent({
  name: "Мой календарь",
  description:
    "Ведёт почту, календарь «Мой день» и дела на компьютере Дмитрия Ермолаева.",
  model: {
    id: "grok-4.5",
    params: [
      { id: "effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
  tools: [],
  local: {
    sandbox: true,
  },
  hosting: {
    secretNames: ["OPS_MAIL_TOKEN", "OPS_CALENDAR_TOKEN"],
  },
});
