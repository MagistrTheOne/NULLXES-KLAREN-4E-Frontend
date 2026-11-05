"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ui/code-block";
import { useHighlightedCode } from "@/hooks/use-highlighted-code";

type MarkdownBlock =
  | { type: "paragraph" | "quote"; text: string }
  | { type: "heading"; text: string; level: number }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; language: string; code: string };

function parseMarkdown(value: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const fence = /```([^\n]*)\n([\s\S]*?)(?:\n```|$)/g;
  let cursor = 0;

  for (const match of value.matchAll(fence)) {
    const index = match.index ?? 0;
    if (index > cursor) blocks.push(...parseTextBlocks(value.slice(cursor, index)));
    blocks.push({
      type: "code",
      language: match[1]?.trim() || "text",
      code: match[2] ?? "",
    });
    cursor = index + match[0].length;
  }
  if (cursor < value.length) blocks.push(...parseTextBlocks(value.slice(cursor)));
  return blocks;
}

function parseTextBlocks(value: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const lines = value.split("\n");

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join("\n") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ type: "list", ...list });
      list = null;
    }
  };

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    const unorderedItem = /^\s*[-*+]\s+(.+)$/.exec(line);
    const orderedItem = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    const quote = /^\s*>\s?(.*)$/.exec(line);
    const item = unorderedItem ?? orderedItem;

    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1]?.length ?? 1,
        text: heading[2] ?? "",
      });
    } else if (item) {
      flushParagraph();
      const ordered = Boolean(orderedItem);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push(item[1] ?? "");
    } else if (quote) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", text: quote[1] ?? "" });
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const pattern =
    /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|`([^`]+)`|\*([^*]+)\*)/g;
  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(text.slice(cursor, index));
    const whole = match[0];
    if (match[2] && match[3]) {
      parts.push(
        <a
          key={key++}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="text-[#d6bb84] underline decoration-[#8b7143] underline-offset-2"
        >
          {match[2]}
        </a>,
      );
    } else if (match[4] || match[5]) {
      parts.push(<strong key={key++}>{match[4] ?? match[5]}</strong>);
    } else if (match[6]) {
      parts.push(<del key={key++}>{match[6]}</del>);
    } else if (match[7]) {
      parts.push(
        <code key={key++} className="rounded bg-[#25221d] px-1.5 py-0.5 font-mono text-[0.9em] text-[#e2c990]">
          {match[7]}
        </code>,
      );
    } else if (match[8]) {
      parts.push(<em key={key++}>{match[8]}</em>);
    }
    cursor = index + whole.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export function MarkdownContent({ value }: { value: string }) {
  const blocks = parseMarkdown(value);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return <CodeFence key={index} language={block.language} code={block.code} />;
        }
        if (block.type === "heading") {
          const Heading = `h${Math.min(block.level, 4)}` as "h1" | "h2" | "h3" | "h4";
          return (
            <Heading key={index} className="font-medium text-[#f1ece2]">
              {renderInline(block.text)}
            </Heading>
          );
        }
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List
              key={index}
              className={`space-y-1 pl-5 ${block.ordered ? "list-decimal" : "list-disc"}`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </List>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote key={index} className="border-l-2 border-[#80683e] pl-3 text-[#b8b2a7]">
              {renderInline(block.text)}
            </blockquote>
          );
        }
        return (
          <p key={index}>
            {block.text.split("\n").map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 && <br />}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function CodeFence({ language, code }: { language: string; code: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(code);
  useEffect(() => { if (!editing) setDraft(code); }, [code, editing]);

  function downloadCode() {
    const extensions: Record<string, string> = {
      javascript: "js", typescript: "ts", tsx: "tsx", jsx: "jsx",
      python: "py", bash: "sh", shell: "sh", json: "json",
      css: "css", html: "html", sql: "sql", rust: "rs",
      go: "go", java: "java", cpp: "cpp", c: "c",
    };
    const extension = extensions[language.toLowerCase()] ?? "txt";
    const blob = new Blob([draft], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `klaren-code.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }
  const lines = useHighlightedCode(code, language);
  return (
    <CodeBlock className="border-[#302d27] bg-[#0b0b0b]">
      <CodeBlockHeader className="min-h-8 py-1">
        <CodeBlockTitle className="text-[10px] uppercase tracking-[0.12em] text-[#9c927d]">
          {language}
        </CodeBlockTitle>
        <CodeBlockActions>
          <button type="button" className="rounded px-2 py-1 text-[11px] text-[#c6a46a] hover:bg-[#242019]" onClick={() => setEditing((current) => !current)}>{editing ? "Закрыть редактор" : "Редактор"}</button>
          <button type="button" className="rounded px-2 py-1 text-[11px] text-[#c6a46a] hover:bg-[#242019]" onClick={downloadCode}>Скачать</button>
          <CodeBlockCopyButton value={editing ? draft : code} aria-label="Копировать код" />
        </CodeBlockActions>
      </CodeBlockHeader>
      {editing ? (
        <div className="border-t border-[#302d27] p-2">
          <textarea aria-label="Редактирование кода" spellCheck={false} value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-52 max-h-[60vh] w-full resize-y bg-[#080808] p-3 font-mono text-xs leading-5 text-[#e5e5e5] outline-none focus-visible:ring-1 focus-visible:ring-[#8a7045]" />
          <p className="px-1 pt-1 text-[10px] text-[#8a8a8a]">Черновик редактора: изменения не отправляются Кларен автоматически.</p>
        </div>
      ) : (
      <CodeBlockContent className="max-h-[420px] text-[12px] leading-5">
        {lines.map((line, index) => (
          <span key={index} className="block min-h-5 whitespace-pre">
            {line}
          </span>
        ))}
      </CodeBlockContent>
      )}
    </CodeBlock>
  );
}
