# Мой календарь

Личный агент Дмитрия Ермолаева. Разбирает почту Яндекса по виду и теме и складывает события в единый календарь «Мой день».

В синхронизации шесть ящиков, включая noreply@hausearth.ru. vasiliev@zemtronic.ru не входит, пока Дмитрий не подтвердит. Дела остаются на его компьютере: отдельного облачного списка нет. Пароли и токены в репозиторий не кладутся.

Проверка без модели:

```bash
npx bdk validate --dir .
npx bdk call ops_desk --dir . --input '{"action":"status"}'
npx bdk call ops_desk --dir . --input '{"action":"sort_mail","messages":[{"mailbox":"noreply@hausearth.ru","subject":"Заявка с сайта","snippet":"Новая заявка Hausearth"}]}'
```
