import { defineEval } from "@cursor/bdk/evals";

export default defineEval({
  tags: ["smoke"],
  cases: [
    {
      id: "invoice",
      description: "Письмо со счётом разбирается и записывается.",
      async test(t) {
        await t.send(
          [
            "Разбери письмо и запомни его.",
            "От: office@example.com",
            "Тема: Счёт за тираж кружек Fancy",
            "Текст: Просим оплатить счёт до пятницы.",
          ].join("\n"),
        );
        t.succeeded();
        t.calledTool("ops_desk");
        t.calledTool("ops_record");
      },
    },
  ],
});
