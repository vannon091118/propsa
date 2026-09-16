import { stilFuer } from "./sprachFarben";

type Props = {
  sprache: string;
};

/** Sprachindikator als Chip (Farbe + Name). */
export function SprachChip({ sprache }: Props) {
  const stil = stilFuer(sprache);

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-linie bg-white/2 px-2 py-0.5 text-[11px] font-medium"
      title={sprache}
    >
      <span
        className="size-[7px] flex-none rounded-full"
        style={{ background: stil.farbe }}
      />
      {sprache}
    </span>
  );
}
