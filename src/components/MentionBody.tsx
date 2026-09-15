"use client";

import { renderMentionParts, type MentionMember } from "@/lib/mentions";

export function MentionBody({
  text,
  members,
  className = "",
}: {
  text: string;
  members: MentionMember[];
  className?: string;
}) {
  const parts = renderMentionParts(text, members);
  return (
    <p className={`whitespace-pre-wrap text-[15px] leading-relaxed text-ink ${className}`}>
      {parts.map((p, i) =>
        p.type === "mention" ? (
          <span
            key={i}
            className="rounded bg-accent-soft px-0.5 font-medium text-accent-deep"
          >
            @{p.value}
          </span>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </p>
  );
}
