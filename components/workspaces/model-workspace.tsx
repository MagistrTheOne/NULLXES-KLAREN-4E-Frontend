"use client";

import {
  ArrowUpRight,
  Cpu,
  FlowArrow,
  Scan,
  Terminal,
  Waveform,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface ModelWorkspaceProps {
  onOpenChat: () => void;
}

const architecture = [
  {
    number: "01",
    label: "LANGUAGE MODEL",
    value: "~21B",
    caption: "Параметров",
    description: "Transformer · Mixture-of-Experts",
    icon: Terminal,
  },
  {
    number: "02",
    label: "MULTIMODAL RESEARCH",
    value: "VISION / AUDIO",
    caption: "",
    description: "Исследования мультимодальных интерфейсов",
    icon: Scan,
  },
  {
    number: "03",
    label: "INTELLIGENCE SYSTEM",
    value: "KLAREN 4E",
    caption: "",
    description: "Языковая модель и модульная архитектура NULLXES",
    icon: Cpu,
  },
];

const research = [
  {
    title: "Language & Reasoning",
    description:
      "Обработка естественного языка, генерация текста и решение интеллектуальных задач.",
    icon: Terminal,
  },
  {
    title: "Visual Intelligence",
    description:
      "Исследование визуального восприятия и согласования изображений с языковым представлением.",
    icon: Scan,
  },
  {
    title: "Audio Intelligence",
    description: "Разработка интерфейсов обработки речи и аудиосигналов.",
    icon: Waveform,
  },
  {
    title: "Autonomous Systems",
    description:
      "Исследование интеграции интеллектуальных моделей с внешними инструментами и физическими системами.",
    icon: FlowArrow,
  },
];

export function ModelWorkspace({ onOpenChat }: ModelWorkspaceProps) {
  return (
    <div className="page-workspace overflow-y-auto">
      <div className="mx-auto w-full max-w-245 px-5 pb-8 pt-8 sm:px-8 lg:px-12">
        <section className="relative flex min-h-[390px] flex-col justify-center border-b border-[#292929] py-12 sm:min-h-[450px] sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 select-none font-serif text-[clamp(240px,36vw,520px)] leading-none text-[#c6a46a]/[0.035] xl:block"
          >
            N
          </div>
          <p className="text-[10px] font-medium tracking-[0.32em] text-[#c6a46a]">
            NULLXES INTELLIGENCE
          </p>
          <h2 className="relative mt-5 text-[clamp(58px,9vw,112px)] font-medium leading-[0.92] tracking-[-0.075em] text-[#f4f1eb]">
            KLAREN <span className="text-[#c6a46a]">4E</span>
          </h2>
          <p className="mt-4 text-[12px] font-medium tracking-[0.44em] text-[#b49a6c]">
            ORBITAL AI
          </p>
          <p className="mt-7 max-w-[690px] text-sm leading-7 text-[#a6a39d] sm:text-[15px] sm:leading-8">
            KLAREN 4E — мультимодальная архитектура искусственного интеллекта,
            разрабатываемая NULLXES. Объединяет языковую модель, исследования
            визуального и аудиовосприятия и модульный подход к интеллектуальным
            системам.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="h-10 gap-2 bg-[#c6a46a] px-4 text-[13px] text-[#100e0a] hover:bg-[#d6b77e]"
            >
              <a
                href="https://huggingface.co/MagistrTheOne/NULLXES-KLAREN-4E"
                target="_blank"
                rel="noreferrer"
              >
                Документация модели
                <ArrowUpRight size={15} />
              </a>
            </Button>
            <Button
              variant="ghost"
              onClick={onOpenChat}
              className="h-10 px-4 text-[13px] text-[#bdb8ae] hover:bg-[#171717] hover:text-[#e5d0a6]"
            >
              Открыть чат
            </Button>
          </div>
        </section>

        <section className="border-b border-[#292929] py-8 sm:py-10">
          <div className="mb-6 flex items-center gap-3">
            <Cpu size={15} className="text-[#9d875e]" />
            <h3 className="text-[11px] font-medium tracking-[0.22em] text-[#dedbd4]">
              АРХИТЕКТУРА
            </h3>
          </div>
          <div className="grid gap-0 sm:grid-cols-3">
            {architecture.map(({ number, label, value, caption, description, icon: Icon }, index) => (
              <article
                key={number}
                className={`min-w-0 py-5 sm:px-5 sm:py-2 ${index === 0 ? "sm:pl-0" : "border-t border-[#242424] sm:border-l sm:border-t-0 sm:border-[#292929]"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[9px] tracking-[0.2em] text-[#88847c]">{label}</span>
                  <span className="flex items-center gap-2 text-[#8e7c58]">
                    <span className="text-[9px] tabular-nums text-[#66635d]">{number}</span>
                    <Icon size={15} />
                  </span>
                </div>
                <p className="mt-5 break-words text-[clamp(23px,3vw,34px)] font-medium tracking-[-0.045em] text-[#eeeae2]">
                  {value}
                </p>
                {caption && <p className="mt-1 text-[11px] text-[#aaa69c]">{caption}</p>}
                <p className={`${caption ? "mt-3" : "mt-[27px]"} text-[12px] leading-5 text-[#89867f]`}>
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-b border-[#292929] py-8 sm:py-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h3 className="text-[11px] font-medium tracking-[0.22em] text-[#dedbd4]">
              НАПРАВЛЕНИЯ РАЗРАБОТКИ
            </h3>
            <span className="text-[10px] tracking-[0.08em] text-[#77736a]">
              RESEARCH
            </span>
          </div>
          <div className="grid gap-x-10 sm:grid-cols-2">
            {research.map(({ title, description, icon: Icon }, index) => (
              <article
                key={title}
                className={`flex gap-4 border-t border-[#242424] py-5 ${index < 2 ? "sm:border-t-0 sm:pb-7" : "sm:pt-6"}`}
              >
                <Icon size={16} className="mt-0.5 shrink-0 text-[#9d875e]" />
                <div>
                  <h4 className="text-sm font-medium text-[#e2ded6]">{title}</h4>
                  <p className="mt-2 max-w-[440px] text-[12px] leading-6 text-[#929088]">
                    {description}
                  </p>
                  {title === "Visual Intelligence" && (
                    <p className="mt-2 text-[10px] leading-5 text-[#77736b]">
                      Визуальная валидация остаётся экспериментальной.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-5 py-9 sm:flex-row sm:items-start sm:justify-between sm:py-11">
          <div className="flex items-start gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center border border-[#493e2b] font-serif text-[23px] text-[#c6a46a]">
              N
            </span>
            <div className="max-w-[720px]">
              <h3 className="text-[11px] font-medium tracking-[0.22em] text-[#dedbd4]">
                ИДЕНТИЧНОСТЬ
              </h3>
              <p className="mt-3 text-[13px] leading-7 text-[#a6a39d]">
                Кларенсия Мария Магистрович — самостоятельная ИИ-персона NULLXES.
                Её характер формируется на уровне модели: индивидуальная манера
                общения, ирония, самостоятельность и собственное мнение.
              </p>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#292929] py-5 text-[9px] tracking-[0.16em] text-[#77736b]">
          <span>NULLXES — ONE INTELLIGENCE. DIFFERENT BODIES.</span>
          <span>© 2026 NULLXES</span>
        </footer>
      </div>
    </div>
  );
}
