import type { CSSProperties } from "react";

const COLOR_MAP: Record<
  string,
  { color: string; backgroundColor?: string; borderColor?: string; segmentFill?: string }
> = {
  茶色: { color: "#a07c5c" },
  白: { color: "#78716c", backgroundColor: "#fafaf9", borderColor: "#e7e5e4", segmentFill: "#d6d3d1" },
  ピンク: { color: "#ec4899" },
  グレー: { color: "#78716c" },
  青: { color: "#67a3e8" },
  緑: { color: "#34b89a" },
  黄: { color: "#ca8a04", backgroundColor: "#fefce8", borderColor: "#fde68a", segmentFill: "#fde68a" },
  黒: { color: "#44403c" },
  オレンジ: { color: "#ea580c", segmentFill: "#fb923c" },
  えんじ: { color: "#b91c1c", segmentFill: "#dc2626" },
  水色: { color: "#0ea5e9", segmentFill: "#38bdf8" },
  ミント: { color: "#14b8a6", segmentFill: "#2dd4bf" },
  紫: { color: "#7c3aed", segmentFill: "#a78bfa" },
  赤: { color: "#dc2626", segmentFill: "#f87171" },
  その他: { color: "#78716c" },
};

type ColorStyle = { color: string; backgroundColor?: string; borderColor?: string; segmentFill?: string };
const DEFAULT_STYLE: ColorStyle = { color: "#78716c", backgroundColor: undefined, borderColor: undefined, segmentFill: undefined };

export function getDollFillColor(colorName?: string): string {
  const style: ColorStyle = (colorName && COLOR_MAP[colorName]) ?? DEFAULT_STYLE;
  return style.segmentFill ?? style.backgroundColor ?? style.color;
}

const DARK_FILL_COLORS = new Set([
  "#44403c", "#a07c5c", "#78716c", "#67a3e8", "#34b89a", "#ec4899", "#b91c1c", "#dc2626", "#7c3aed", "#ea580c",
]);

export function getDollSegmentTextColor(colorName?: string): string {
  const fill = getDollFillColor(colorName);
  return DARK_FILL_COLORS.has(fill) ? "#fff" : "#1f2937";
}

export function getDollColorStyle(colorName?: string): CSSProperties {
  const style: ColorStyle = (colorName && COLOR_MAP[colorName]) ?? DEFAULT_STYLE;
  return {
    color: style.color,
    ...(style.backgroundColor && { backgroundColor: style.backgroundColor }),
    ...(style.borderColor && { border: `1px solid ${style.borderColor}` }),
  };
}
