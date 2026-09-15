export type MentionMember = { id: string; name: string };

/** Longest-name-first match so "@Jordan Dev" wins over "@Jordan". */
export function extractMentionedUserIds(
  text: string,
  members: MentionMember[],
  excludeUserId?: string
): string[] {
  if (!text || members.length === 0) return [];

  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  const found = new Set<string>();
  const lower = text.toLowerCase();

  for (const m of sorted) {
    if (excludeUserId && m.id === excludeUserId) continue;
    const needle = `@${m.name}`.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;
      const before = idx === 0 ? " " : lower[idx - 1];
      const afterIdx = idx + needle.length;
      const after = afterIdx >= lower.length ? " " : lower[afterIdx];
      const boundaryBefore = !/[a-z0-9]/.test(before);
      const boundaryAfter = !/[a-z0-9]/.test(after);
      if (boundaryBefore && boundaryAfter) {
        found.add(m.id);
        break;
      }
      from = idx + 1;
    }
  }

  return [...found];
}

export function renderMentionParts(
  text: string,
  members: MentionMember[]
): { type: "text" | "mention"; value: string }[] {
  if (!text) return [{ type: "text", value: "" }];
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  const parts: { type: "text" | "mention"; value: string }[] = [];
  let i = 0;
  const lower = text.toLowerCase();

  while (i < text.length) {
    if (text[i] === "@") {
      let matched: MentionMember | null = null;
      for (const m of sorted) {
        const needle = `@${m.name}`.toLowerCase();
        if (lower.slice(i, i + needle.length) === needle) {
          const afterIdx = i + needle.length;
          const after = afterIdx >= text.length ? " " : text[afterIdx];
          if (!/[a-z0-9]/i.test(after)) {
            matched = m;
            break;
          }
        }
      }
      if (matched) {
        parts.push({ type: "mention", value: matched.name });
        i += matched.name.length + 1;
        continue;
      }
    }
    const start = i;
    i += 1;
    while (i < text.length && text[i] !== "@") i += 1;
    parts.push({ type: "text", value: text.slice(start, i) });
  }

  return parts.length ? parts : [{ type: "text", value: text }];
}
