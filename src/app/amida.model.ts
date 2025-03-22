// あみだ籤の縦棒
export interface VerticalLine {
  // キャンバスの x 軸の位置
  x: number
}

// あみだ籤の横棒
export interface HorizontalLine {
  // 開始縦棒
  start: VerticalLine
  // 終了縦棒
  end: VerticalLine
  // キャンバスの y 軸の位置
  y: number
}

export function diff(a: VerticalLine, b: VerticalLine): number {
  return Math.abs(a.x - b.x)
}
