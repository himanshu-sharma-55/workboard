"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from "react";
import type { MentionMember } from "@/lib/mentions";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  members: MentionMember[];
  value: string;
  onChange: (value: string) => void;
};

type Trigger = { start: number; query: string } | null;

function activeTrigger(text: string, caret: number): Trigger {
  const before = text.slice(0, caret);
  const m = before.match(/(^|[\s([{"'])@([^\s@]*)$/);
  if (!m) return null;
  return { start: before.length - m[2].length - 1, query: m[2] };
}

export function MentionComposer({
  members,
  value,
  onChange,
  className = "",
  ...rest
}: Props) {
  const listId = useId();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [trigger, setTrigger] = useState<Trigger>(null);
  const [active, setActive] = useState(0);
  const [openUp, setOpenUp] = useState(true);

  const filtered = (() => {
    if (!trigger) return [];
    const q = trigger.query.toLowerCase();
    return members
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 8);
  })();

  useEffect(() => {
    setActive(0);
  }, [trigger?.query, trigger?.start]);

  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el || !trigger) return;
    const rect = el.getBoundingClientRect();
    setOpenUp(rect.bottom + 180 > window.innerHeight);
  }, [trigger]);

  function syncTrigger() {
    const el = taRef.current;
    if (!el) return;
    setTrigger(activeTrigger(el.value, el.selectionStart ?? 0));
  }

  function insertMention(member: MentionMember) {
    const el = taRef.current;
    if (!el || !trigger) return;
    const before = value.slice(0, trigger.start);
    const after = value.slice(el.selectionStart ?? value.length);
    const insert = `@${member.name} `;
    const next = before + insert + after;
    onChange(next);
    setTrigger(null);
    requestAnimationFrame(() => {
      const pos = before.length + insert.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!trigger || filtered.length === 0) {
      rest.onKeyDown?.(e);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % filtered.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + filtered.length) % filtered.length);
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(filtered[active] ?? filtered[0]);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setTrigger(null);
      return;
    }
    rest.onKeyDown?.(e);
  }

  const show = Boolean(trigger && filtered.length > 0);

  return (
    <div className="relative">
      <textarea
        {...rest}
        ref={taRef}
        value={value}
        name={rest.name ?? "body"}
        onChange={(e) => {
          onChange(e.target.value);
          requestAnimationFrame(syncTrigger);
        }}
        onClick={syncTrigger}
        onKeyUp={syncTrigger}
        onKeyDown={onKeyDown}
        onBlur={() => {
          // Delay so option click can fire
          setTimeout(() => setTrigger(null), 150);
        }}
        className={className}
        aria-autocomplete="list"
        aria-controls={show ? listId : undefined}
      />

      {show && (
        <ul
          id={listId}
          role="listbox"
          className={`absolute left-0 z-20 max-h-48 w-full min-w-[200px] overflow-auto rounded-lg border border-line bg-surface py-1 shadow-md ${
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {filtered.map((m, i) => (
            <li key={m.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                  i === active
                    ? "bg-accent-soft text-accent-deep hover:bg-accent-soft hover:text-accent-deep"
                    : "text-ink hover:bg-paper-2"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertMention(m)}
              >
                <span className="font-medium">@{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
