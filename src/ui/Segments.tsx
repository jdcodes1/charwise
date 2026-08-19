import type { ReactNode } from "react";
import type { Segment } from "../diff";

/**
 * Make whitespace visible by tinting it, never by replacing it. The real
 * characters stay in the DOM because a reader who selects and copies a line
 * must get the original code back — a viewer that pastes back marker glyphs
 * instead of tabs silently corrupts what it was built to help you read.
 */
function whitespaceMarked(text: string): ReactNode[] {
  return text
    .split(/(\s+)/)
    .filter((part) => part !== "")
    .map((part, index) =>
      /^\s+$/.test(part) ? (
        <span className="ws" key={index}>
          {part}
        </span>
      ) : (
        part
      ),
    );
}

export default function Segments({
  segments,
  text,
  showWhitespace,
}: {
  segments: Segment[] | null;
  text: string;
  showWhitespace: boolean;
}) {
  if (!segments) return <>{text}</>;
  return (
    <>
      {segments.map((seg, index) =>
        seg.kind === "chg" ? (
          <span className="chg" key={index}>
            {showWhitespace ? whitespaceMarked(seg.text) : seg.text}
          </span>
        ) : (
          <span key={index}>{seg.text}</span>
        ),
      )}
    </>
  );
}
