/**
 * Русский словарь. Ключи должны быть идентичны en.ts. Если в en.ts добавляется
 * новый ключ — обязательно дополнить и здесь.
 */

import type { Dict } from "../index";

export const ru: Dict = {
  // Header
  "header.title": "Property AI Workspace",
  "header.subtitle": "Канвас агентов для решений по недвижимости",
  "header.agentSelected": "Агент выбран",
  "header.runPipeline": "Запустить пайплайн",
  "header.createAgent": "Создать / вызвать агента",
  "header.automationCenter": "Центр автоматизации",

  // Language switcher
  "lang.label": "Язык",
  "lang.ru": "Русский",
  "lang.en": "English",

  // Agent Library
  "library.eyebrow": "Библиотека агентов",
  "library.heading": "Перетащите агента",

  // Agent Settings
  "settings.eyebrow": "Параметры агента",
  "settings.noAgent": "Агент не выбран",
  "settings.hint": "Выберите агента на канвасе, чтобы посмотреть его параметры.",
  "settings.lastOutput": "Последний результат",

  // Agent statuses
  "status.idle": "ожидает",
  "status.running": "выполняется",
  "status.completed": "завершён",
  "status.error": "ошибка",

  // Chat
  "chat.title": "AI Чат",
  "chat.hint": "Сообщения применяются к выбранному агенту",
  "chat.placeholder": "Пример: установи бюджет до 700к и районы: SoCo, Mueller",
  "chat.send": "Отправить",
  "chat.welcome": "Воркспейс готов. Выберите агента и отправьте инструкции, либо запустите пайплайн.",
  "chat.applied": "Контекст выбранного агента обновлён. Запустите пайплайн, чтобы применить.",
  "chat.selectAgent": "Сначала выберите агента, затем отправьте инструкции для тонкой настройки.",

  // Results
  "results.title": "Результаты",
  "results.count": "{count} нормализованных объектов",
  "results.table": "Таблица",
  "results.map": "Карта",
  "results.col.listing": "Объект",
  "results.col.area": "Площадь",
  "results.col.areaSqft": "{value} sqft",

  // Map
  "map.empty": "Координат для отображения пока нет",
  "map.runHint": "Запустите пайплайн, чтобы увидеть объекты на карте.",
  "map.noTokenTitle": "Mapbox-токен не настроен",
  "map.tokenRequired":
    "Добавьте VITE_MAPBOX_TOKEN, чтобы включить живую карту. Координаты сохраняются.",

  // Agent templates
  "agent.queryBuilder.title": "Сборщик запроса",
  "agent.queryBuilder.description":
    "Превращает свободный текст в структурированный бриф по недвижимости.",
  "agent.listingSearch.title": "Поиск объектов",
  "agent.listingSearch.description":
    "Ищет в источниках объявлений и возвращает кандидатов.",
  "agent.resultNormalizer.title": "Нормализатор результатов",
  "agent.resultNormalizer.description":
    "Стандартизует цену, площадь, комнаты, район и скор.",

  // Create Agent modal
  "createAgent.title": "Создать или вызвать агента",
  "createAgent.subtitle":
    "Опишите задачу свободным текстом. Мы создадим подходящего агента на канвасе и передадим ваше описание как стартовый контекст.",
  "createAgent.taskLabel": "Описание задачи",
  "createAgent.taskPlaceholder":
    "Пример: Найди 2-комнатные квартиры в Ереване до $200k рядом с Каскадом. Проверь чистоту титула.",
  "createAgent.typeLabel": "Тип агента",
  "createAgent.typeAuto": "Авто-определение",
  "createAgent.typeAutoHint": "Подберём наиболее подходящего агента по описанию.",
  "createAgent.submit": "Создать агента",
  "createAgent.cancel": "Отмена",
  "createAgent.validationRequired": "Опишите задачу.",
  "createAgent.created": "Агент «{title}» добавлен на канвас.",
  "createAgent.recent": "Или выберите шаблон",

  // Common
  "common.close": "Закрыть"
};
