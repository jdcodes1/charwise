import type { ReactNode } from "react";
import type { Segment } from "../diff";

function whitespaceMarked(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let plain = "";
  const flush = () => {
    if (plain) parts.push(plain);
    plain = "";
  };
  [...text].forEach((ch, index) => {
    if (ch === "\t" || ch === " ") {
      flush();
      parts.push(
        <span className="ws" key={index}>
          {ch === "\t" ? "→   " : "·"}
        </span>,
      );
    } else {
      plain += ch;
    }
  });
  flush();
  return parts;
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
