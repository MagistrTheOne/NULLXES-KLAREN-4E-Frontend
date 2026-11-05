"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface ModelWorkspaceProps {
  onOpenChat: () => void;
}

export function ModelWorkspace({ onOpenChat }: ModelWorkspaceProps) {
  return (
    <div className="page-workspace overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-245 flex-col px-5 pb-8 pt-8 sm:px-8 lg:px-12">
        <section className="relative flex min-h-97.5 flex-1 flex-col justify-center border-b border-[#292929] py-12 sm:min-h-112.5 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 select-none font-serif text-[clamp(240px,36vw,520px)] leading-none text-[#c6a46a]/[0.035] xl:block"
          >
            N
          </div>
          <p className="text-[10px] font-medium tracking-[0.32em] text-[#c6a46a]">
            NULLXES
          </p>
          <h2 className="relative mt-5 text-[clamp(58px,9vw,112px)] font-medium leading-[0.92] tracking-[-0.075em] text-[#f4f1eb]">
            KLAREN <span className="text-[#c6a46a]">4E</span>
          </h2>
          <p className="mt-4 text-[12px] font-medium tracking-[0.44em] text-[#b49a6c]">
            ORBITAL AI
          </p>
          <p className="mt-7 max-w-155 text-sm leading-7 text-[#a6a39d] sm:text-[15px] sm:leading-8">
            Единое пространство для разговоров, идей и совместной работы.
          </p>
          <div className="mt-7">
            <Button
              onClick={onOpenChat}
              className="h-10 gap-2 bg-[#c6a46a] px-4 text-[13px] text-[#100e0a] hover:bg-[#d6b77e]"
            >
              Открыть чат
              <ArrowRight size={15} />
            </Button>
          </div>
        </section>

        <footer className="border-t border-[#292929] py-5 text-center text-[9px] tracking-[0.16em] text-[#77736b]">
          NULLXES — ONE INTELLIGENCE. DIFFERENT BODIES.
        </footer>
      </div>
    </div>
  );
}
