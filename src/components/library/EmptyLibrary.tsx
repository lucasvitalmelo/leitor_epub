import "@fontsource/caveat/500.css";
import type { CSSProperties, ReactNode } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Theme } from "@/lib/db/schema";
import { themeTint } from "@/lib/theme-colors";

const INK = "#c2551f";
// The drawing is on a 390 × 844 phone screen (the canvas "E-books · interface
// v0.7"). The header's notes hang from the header's right edge, the add
// button's from the screen's bottom right corner — each anchored where its
// arrow points, so they follow any width.
const DESIGN_W = 390;
const DESIGN_H = 844;

function Note({
  children,
  left,
  top,
  width,
  rotate,
  fontSize = 27,
}: {
  children: ReactNode;
  left: number | string;
  top: number;
  width: number | string;
  rotate: number;
  fontSize?: number;
}) {
  const style: CSSProperties = {
    left,
    top,
    width,
    fontSize,
    lineHeight: 1.05,
    color: INK,
    fontFamily: "Caveat, cursive",
    fontWeight: 500,
    transform: `rotate(${rotate}deg)`,
  };
  return (
    <p className="absolute m-0" style={style}>
      {children}
    </p>
  );
}

function Arrows({ children }: { children: ReactNode }) {
  return (
    <svg
      width={DESIGN_W}
      height={DESIGN_H}
      viewBox={`0 0 ${DESIGN_W} ${DESIGN_H}`}
      className="absolute inset-0"
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke={INK}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  );
}

// The handwritten notes and arrows, over the first screen of the page and
// without catching clicks. The Drive one only when the Drive button shows.
export function EmptyLibraryNotes({ showDrive }: { showDrive: boolean }) {
  const coarse = useMediaQuery("(pointer: coarse)");
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-svh overflow-hidden"
    >
      {/* Mirrors the page's container, whose right edge is the header's
          (less its padding, 8px in the drawing). */}
      <div className="relative mx-auto h-full max-w-5xl px-4 sm:px-6">
        <div
          className="absolute top-0 right-2 sm:top-4 sm:right-4"
          style={{ width: DESIGN_W, height: DESIGN_H }}
        >
          {showDrive && (
            // Under 406px wide the drawing's left edge is off screen: the note
            // keeps 8px from the edge and narrows to end where its arrow starts.
            <Note
              left="max(24px, calc(406px - 100vw))"
              top={118}
              width="min(204px, calc(100vw - 178px))"
              rotate={-8}
            >
              Conecte o Google Drive e salve seus livros e progressos
            </Note>
          )}
          <Note left={239} top={192} width={140} rotate={2}>
            Tema, luz e ajustes ficam aqui
          </Note>
          <Arrows>
            {showDrive && (
              <>
                <path d="M226 152 C248 144 272.13 141.12 288 128 C307.13 112.19 308.7 75.11 308.7 75.11" />
                <path d="M299 93 L308.95 73.85 L314 94" />
              </>
            )}
            <path d="M292 181 C292 181 297 154 307.45 143.63 C319.75 131.36 342.44 129.03 352.28 114.08 C358.47 104.67 357.26 91.75 358 80" />
            <path d="M350 93 L358 78 L365 94" />
          </Arrows>
        </div>
      </div>
      <div
        className="absolute right-0 bottom-0"
        style={{ width: DESIGN_W, height: DESIGN_H }}
      >
        <Note
          left="max(28px, calc(398px - 100vw))"
          top={596}
          width="min(244px, calc(100vw - 122px))"
          rotate={-2}
          fontSize={29}
        >
          {coarse ? "Toque" : "Clique"} aqui para adicionar seu primeiro livro (.epub)
        </Note>
        <Arrows>
          <path d="M276 642 C300 654 314.61 662.46 326.61 678.46 C335.27 690 339.99 710.08 338.94 728.66" />
          <path d="M330 712 L339.09 731.06 L346 713" />
        </Arrows>
      </div>
    </div>
  );
}

// The empty shelf itself, in the page's flow.
export function EmptyShelf({ theme }: { theme: Theme }) {
  return (
    <div className="mx-auto flex max-w-xs flex-col items-center gap-3.5 text-center">
      {/* On short screens the notes above and below leave no room for it. */}
      <svg
        width={96}
        height={96}
        viewBox="0 0 160 160"
        aria-hidden="true"
        className="[@media(max-height:740px)]:hidden"
      >
        <path
          d="M80 60 C60 50 36 48 16 52 L16 124 C36 120 60 122 80 132 C100 122 124 120 144 124 L144 52 C124 48 100 50 80 60 Z"
          fill={themeTint(theme, 5)}
        />
        <path
          d="M80 52 C62 42 40 40 24 44 L24 116 C40 112 62 114 80 124 Z"
          fill="none"
          stroke={themeTint(theme, 25)}
          strokeWidth={3}
        />
        <path
          d="M80 52 C98 42 120 40 136 44 L136 116 C120 112 98 114 80 124 Z"
          fill="none"
          stroke={themeTint(theme, 25)}
          strokeWidth={3}
        />
      </svg>
      <h2 className="text-[17px] font-medium">Sua estante está vazia</h2>
      <p className="text-sm leading-normal text-muted-foreground">
        Os livros que você adicionar aparecem aqui, com o progresso de leitura.
      </p>
    </div>
  );
}
