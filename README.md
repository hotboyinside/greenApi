# GREEN API

React-приложение для отправки и получения текстовых сообщений в MAX через GREEN-API.

Проект находится в разработке.

## Стек

React, TypeScript, Vite, CSS Modules, Vitest, ESLint и Prettier.

## Требования

- Node.js 24.
- pnpm — версия указана в поле `packageManager` в `package.json`.

## Локальный запуск

Установить зависимости:

```powershell
pnpm install
```

Запустить сервер разработки:

```powershell
pnpm dev
```

Открыть адрес, который появится в терминале.

## Проверки

```powershell
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test:run
```

ESLint использует `recommendedTypeChecked` и `projectService` для проверок с учётом типов. Команда `typecheck` проверяет обе конфигурации TypeScript без сборки приложения.

## Дополнительные команды

- `pnpm format` — форматирование файлов.
- `pnpm test` — тесты в режиме наблюдения.
- `pnpm build` — проверка типов и сборка в `dist`.
- `pnpm preview` — локальный просмотр готовой сборки после `pnpm build`.

Настройки Prettier находятся в `.prettierrc.json`, исключения — в `.prettierignore`. Конфигурация `eslint-config-prettier` отключает конфликтующие правила ESLint.

## Документация

- [Предлагаемый стек](docs/STACK.MD)
