import type { DiffLine, Layout, Row, Segment } from "../diff/types";
import Segments from "./Segments";

function Cell({
  line,
  segments,
  side,
  showWhitespace,
  showLineEnding,
}: {
  line: DiffLine | null;
  segments: Segment[] | null;
  side: "del" | "add" | "";
  showWhitespace: boolean;
  /** A line-ending change has no visible characters to highlight, so name it. */
  showLineEnding?: boolean;
}) {
  if (!line) {
    return (
      <>
        <td className="gutter" />
        <td className="code empty" />
      </>
    );
  }
  const number = side === "add" ? line.newNumber : side === "del" ? line.oldNumber : line.oldNumber;
  return (
    <>
      <td className={`gutter ${side}`}>{number ?? ""}</td>
      <td className={`code ${side}`}>
        <Segments segments={segments} text={line.text} showWhitespace={showWhitespace} />
        {showLineEnding && <span className="eol">{line.crlf ? "CRLF" : "LF"}</span>}
      </td>
    </>
  );
}

/** One diff row. Split renders both sides side by side; unified stacks them. */
export default function DiffRow({ row, layout }: { row: Row; layout: Layout }) {
  const ws = row.whitespaceOnly;
  const eol = row.kind === "pair" && row.del !== null && row.add !== null && row.del.crlf !== row.add.crlf;

  // Split renders gutter+code twice, unified once.
  if (row.kind === "gap") {
    return (
      <tr className="gap">
        <td className="gap" colSpan={layout === "unified" ? 2 : 4}>
          {row.header}
        </td>
      </tr>
    );
  }

  if (row.kind === "context") {
    const line = row.del;
    if (layout === "unified") {
      return (
        <tr>
          <Cell line={line} segments={null} side="" showWhitespace={false} />
        </tr>
      );
    }
    return (
      <tr className="split">
        <Cell line={line} segments={null} side="" showWhitespace={false} />
        <Cell line={line} segments={null} side="" showWhitespace={false} />
      </tr>
    );
  }

  if (layout === "unified") {
    return (
      <>
        {row.del && (
          <tr>
            <Cell line={row.del} segments={row.leftSegments} side="del" showWhitespace={ws} showLineEnding={eol} />
          </tr>
        )}
        {row.add && (
          <tr>
            <Cell line={row.add} segments={row.rightSegments} side="add" showWhitespace={ws} showLineEnding={eol} />
          </tr>
        )}
      </>
    );
  }

  return (
    <tr className="split">
      <Cell line={row.del} segments={row.leftSegments} side="del" showWhitespace={ws} showLineEnding={eol} />
      <Cell line={row.add} segments={row.rightSegments} side="add" showWhitespace={ws} showLineEnding={eol} />
    </tr>
  );
}
