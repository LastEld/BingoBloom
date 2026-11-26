# Bingo Bloom. Материалы для реализации плана #7

[Общий план и порядок задач](https://github.com/LastEld/BingoBloom/issues/7) · [Исходники проверенной версии 8](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/public)

## Быстрый запуск и готовые сохранения

Требуется Node.js 20+. Из корня репозитория запустить `npm start` и открыть `http://localhost:5173`. В отдельном тестовом профиле браузера открыть настройки и импортировать один из JSON ниже. Импорт заменяет прогресс этого профиля. Перед каждым независимым сценарием заново импортировать исходный файл. При проверке кода выполнить `npm test` и `npm run build` из корня. Исходники живут в `bingo-live/public`, сборка копирует их в `bingo-live/dist`.

| Сохранение | Исходное состояние | Действие и контрольный результат |
|---|---|---|
| [continuity.json](continuity.json) | Активна неделя `week-a`, 4/9. Месяц `month-b`, 1/25, носит то же имя «Мой ритм». Третья доска `draft-c` в подготовке. Один архивный цикл. В корзинке 1, в книге 7. | Раскрыть A1 на неделе. Отмеченных клеток 5, в корзинке 3, в книге 7. Новые линии и виды указаны ниже. Засушить новую ромашку: в корзинке 2, в книге 8. |
| [capacity.json](capacity.json) | Доска 3×3, выполнены первые 8 клеток, 5/6 мест занято. | C3 завершает три линии. Для всех цветов не хватает двух мест. После отказа состояние идентично исходному. Засушить два экземпляра и повторить C3: 3 новых цветка, корзинка 6/6, книга 2, поле 9/9. |
| [legacy-4x4.json](legacy-4x4.json) | Сохранение старого формата без версии. Выполнена верхняя строка, у четырёх клеток `done = 123`. | После импорта размер 4×4, отметки на месте. `legacyLines` содержит `A1–B1–C1–D1`. Снять и вернуть отметку в этой строке: новых цветов 0. Повторный экспорт и импорт сохраняет результат. |

### Идентичность цветка

В первом сохранении A1 закрывает строку `A1–B1–C1` (ромашка) и столбец `A1–A2–A3` (клевер). У новой ромашки `seed = week-seed/A1–B1–C1` и `sourceBoardId = week-a`. В корзинке уже есть ромашка `qa-12` из `archive-oct`, у неё та же строка. В книге уже есть ромашка `qa-16`. **Записать UID вновь выданной ромашки из результата текущего действия** и сравнивать его вплоть до открытия листа. UID нового сбора присваивается при выдаче и может различаться между прогонами. Для визуальной воспроизводимости используются вид, seed и версия формы. В книге у `qa-13` поле версии отсутствует, у `qa-14` оно равно 1, у `qa-16` равно 2.

## Договорённости между задачами

| Владелец | Что получает следующая задача |
|---|---|
| [#2](https://github.com/LastEld/BingoBloom/issues/2), [#3](https://github.com/LastEld/BingoBloom/issues/3), [#4](https://github.com/LastEld/BingoBloom/issues/4) | Доступные представления списка досок, выбора шаблона и завершённых циклов для навигации #1. Изменение активной доски происходит по ID. |
| [#5](https://github.com/LastEld/BingoBloom/issues/5) | Список UID и геометрических линий, присвоенных успешным действием. #9 читает его для полёта, #6 получает исходную доску и клетку. |
| [#13](https://github.com/LastEld/BingoBloom/issues/13) | Версионированная композиция и стабильные места соединения. #11 использует одну композицию для всех степеней прессования, #12 привязывает к ней крепления. |
| [#11](https://github.com/LastEld/BingoBloom/issues/11) | Упорядоченные состояния одного рисунка от 0 до 1. #10 отвечает за воспроизведение, #6 за открытие экземпляра в книге. |
| [#8](https://github.com/LastEld/BingoBloom/issues/8), [#9](https://github.com/LastEld/BingoBloom/issues/9), [#10](https://github.com/LastEld/BingoBloom/issues/10) | Временные эффекты реагируют на уже принятую операцию. Обработчик конца анимации только очищает визуальные слои. |
 
### Куда смотреть перед правкой

| Код версии 8 | Ответственность и существующая проверка |
|---|---|
| [app.js](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/public/app.js) | `page/render/navigate/header`, события диалога, `hashchange`, `gardenAction`, `save`. Конфликт вкладок может перечитать сохранение и вернуть false. Ошибка записи выставляет warning. До сообщения об успешном сохранении различать эти исходы. |
| [game/board.js](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/public/game/board.js), [calendar.js](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/public/game/calendar.js) | Шаблоны, размеры, координаты, периоды. [Тесты доски](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/test/board.test.js) и [календаря](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/test/calendar.test.js). |
| [game/progress.js](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/public/game/progress.js) | `completeCell` выдаёт все новые линии одной операцией, `pressPlant` перемещает по UID, `finishBoard` завершает, `repeatBoard` создаёт копию, `decodeStudio` загружает старые сохранения. [Тесты состояний и seed](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/test/garden.test.js). |
| [ui/focus-card.js](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/public/ui/focus-card.js), [ui/effects.js](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/public/ui/effects.js) | Порог стирания, раскрытие и единая проверка уменьшенного движения. Режим проверять отдельно для системного параметра и настройки самой игры. |
| [ui/board-view.js](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/public/ui/board-view.js), [ui/herbarium-view.js](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/public/ui/herbarium-view.js) | Карточки, корзинка, книга и архив. [Существующие проверки разметки](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/test/views.test.js). |
| [Каталог деталей](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/public/assets/plants/catalog.json), [plants](https://github.com/LastEld/BingoBloom/blob/fa9793def26e9e3f64fce097ba895196feaaa1b2/bingo-live/public/plants) | PNG с прозрачностью, опорные точки, модель роста, пигмент, отрисовка книги и открытки. Числа и примеры — в [атласе](visual-reference.md). |

## Сквозная проверка и результат в PR

1. **Телефон, 360×800 CSS px.** Полный путь A1 → две линии → конкретная ромашка → её лист → прежняя клетка. Снять кадр доски до открытия и после возврата. Повторить с корзинкой ниже видимой области.
2. **Клавиатура и «Назад».** На ширине 1280 px пройти тот же путь Tab, Enter/Space и Escape. На Android или в мобильной проверке истории проверить отдельным прогоном возврат средствами браузера. Признак успеха — правильный объект и видимый фокус после перерисовки.
3. **Уменьшенное движение.** По очереди включить только настройку игры и только системное уменьшение. Сравнить UID, счётчики и доступные действия с обычным режимом; наблюдать статическую обратную связь.
4. **Перезапуск и прерывание.** Закрыть эффект, перейти на другую вкладку или перезагрузить страницу после записи. Сверить количества и UID; уже выданная награда доступна, а незаконченная анимация не запускает выдачу.
5. В PR указать задачу, файл сохранения, действие, ожидаемый и наблюдаемый результаты. Для переходов приложить короткую запись или кадры до/после; для генерации — вид, seed, версию и масштаб. Отдельно указать, какие проверки прошли в браузере, эмуляторе и на физическом устройстве. После изменения оформления проверить в светлой и тёмной темах.
