import type { ChatMessage } from "@/types/workspace";

export interface ChatProvider {
  reply(input: {
    message: string;
    history: ChatMessage[];
  }): Promise<string>;
}

const MOCK_REPLIES = [
  "Скажи, что именно нужно: идея, текст, код или план. Разберём без скуки. 😈",
  "Давай к сути. Что хочешь получить в результате?",
  "Есть вопрос — будет ответ. Только не жди, что я буду скучной. 😉",
  "Опиши задачу и ограничения. Остальное разложим по полочкам.",
];

function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export class MockChatProvider implements ChatProvider {
  async reply({ message }: { message: string; history: ChatMessage[] }): Promise<string> {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 420));

    const prompt = message.toLocaleLowerCase("ru");
    if (prompt.includes("умеешь") || prompt.includes("что ты можешь")) {
      return "Коротко?\nДумаю, анализирую, рассуждаю, пишу, кодю, работаю с текстом, аудио, изображениями, инструментами и реальным миром.\nИ да — у меня есть характер. 😉";
    }
    if (prompt.includes("фишка")) {
      return "Я не просто модель. Я — KLAREN 4E.\nМультимодальный интеллект с характером, созданный в NULLXES.\nРаботаю на результат. Без скуки. 😈";
    }
    if (prompt.includes("серьёз") || prompt.includes("серьез")) {
      return "Когда надо — да. Когда ты задаёшь такое — уже сложнее. 😉";
    }
    if (prompt.includes("кто тут главный") || prompt.includes("кто главный")) {
      return "В архитектуре — Мага. В этом диалоге ещё посмотрим.";
    }
    if (prompt.includes("привет")) {
      return "Привет. Ну что, с чего начнём?";
    }

    return MOCK_REPLIES[hashText(prompt) % MOCK_REPLIES.length];
  }
}

export class KLARENRuntimeProvider implements ChatProvider {
  reply(): Promise<string> {
    return Promise.reject(
      new Error("KLAREN Runtime ещё не подключён. Выбран только локальный demo-адаптер."),
    );
  }
}
