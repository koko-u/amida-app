import { AfterViewInit, Component, computed, ElementRef, signal, viewChild } from '@angular/core'
import { FormsModule, NgForm } from '@angular/forms'
import { diff, HorizontalLine, VerticalLine } from './amida.model'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  imports: [FormsModule],
})
export class AppComponent implements AfterViewInit {
  // Canvas を含む div 要素
  canvasContainer = viewChild.required<ElementRef>('canvasContainer')
  // Canvas を含む div 要素の矩形領域
  canvasBoundaryRectangle = computed(() => {
    const canvasContainer = this.canvasContainer()
    const element = canvasContainer.nativeElement as HTMLElement
    return element.getBoundingClientRect()
  })

  // キャンバスの幅
  canvasWidth = computed(() => {
    const rect = this.canvasBoundaryRectangle()
    return rect.width
  })
  // キャンバスの高さ
  canvasHeight = computed(() => {
    const rect = this.canvasBoundaryRectangle()
    return rect.height
  })

  // キャンバス
  canvasAmida = viewChild.required<ElementRef>('canvasAmida')
  canvasContext = computed(() => {
    const canvasAmida = this.canvasAmida()
    const canvas = canvasAmida.nativeElement as HTMLCanvasElement
    return canvas.getContext('2d')
  })

  // あみだ籤の縦棒の数を指定するフォーム
  linesCountForm = viewChild.required<NgForm>('linesCountForm')
  linesCount = signal<number>(5)

  // あみだ籤の結果
  results = signal<number[]>([])

  // あみだ籤の縦棒の集合を縦棒を描画する x 軸の位置で表現する
  verticalLines = signal<VerticalLine[]>([])
  // あみだ籤の横棒は横棒を結ぶ縦棒(2本)の x 軸の位置と横棒を描画する y 軸の値で表現する
  horizontalLines = signal<HorizontalLine[]>([])

  // キャンバスのフォントサイズを変更する
  ngAfterViewInit(): void {
    const ctx = this.canvasContext()
    if (!ctx) {
      return
    }
    const match = /(?<value>\d+\.?\d*)/

    const setFontSize = (size: number) => (ctx.font = ctx.font.replace(match, `${size}`))

    setFontSize(16)
  }

  // 生成ボタンを押して、あみだ籤の縦棒を描く
  onGenerate() {
    if (this.linesCountForm().invalid) {
      return
    }

    this.drawAmida(this.linesCount())
  }

  // キャンバスをクリックして横棒を曳く
  onCanvasClick(e: MouseEvent) {
    // マウスをクリックした場所のキャンバス内での位置
    const rect = this.canvasBoundaryRectangle()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // クリックした場所が縦棒の間かを判定する
    const lineCounts = this.verticalLines().length
    for (let i = 0; i < lineCounts - 1; i++) {
      const start = this.verticalLines()[i]
      const end = this.verticalLines()[i + 1]
      if (x > start.x && x < end.x) {
        this.addHorizontalLine(start, end, y)
        return
      }
    }
  }

  // あみあ籤をリセットする
  onClear() {
    this.drawAmida(this.verticalLines().length)
  }

  private drawAmida(linesCount: number) {
    const ctx = this.canvasContext()
    if (!ctx) {
      return
    }

    ctx.clearRect(0, 0, this.canvasWidth(), this.canvasHeight())
    this.verticalLines.set([])
    this.horizontalLines.set([])
    this.results.set([])
    const spacing = this.canvasWidth() / (linesCount + 1)

    // 縦棒の描画
    for (let i = 1; i <= linesCount; i++) {
      const x = spacing * i
      this.verticalLines.update((current) => [...current, { x }])
      this.results.update((current) => [...current, i])

      // 縦棒
      ctx.beginPath()
      ctx.moveTo(x, 50)
      ctx.lineTo(x, this.canvasHeight() - 50)
      ctx.stroke()

      // 上の番号
      ctx.fillText(`${i}`, x - 5, 30)
      // 下の番号
      ctx.fillText(`${i}`, x - 5, this.canvasHeight() - 30)
    }
  }

  private addHorizontalLine(start: VerticalLine, end: VerticalLine, y: number) {
    const ctx = this.canvasContext()
    if (!ctx) {
      return
    }

    this.horizontalLines.update((current) => [...current, { start, end, y }])

    // 横棒の描画
    ctx.beginPath()
    ctx.moveTo(start.x, y)
    ctx.lineTo(end.x, y)
    ctx.stroke()

    // あみだくじの結果を更新する
    this.updateResults()
  }

  private updateResults() {
    const verticalLines = this.verticalLines()
    // 横棒を y 座標の昇順にソートする
    const sortedHorizontalLines = this.horizontalLines()
      .slice()
      .sort((a, b) => a.y - b.y)

    const spacing = this.canvasWidth() / (verticalLines.length + 1)
    const delta = spacing / 10

    // 1, 2, 3, ... をあみだ籤に適用して行き着いた先の配列を求める
    const newResults = new Array(verticalLines.length)
    for (let index = 0; index < verticalLines.length; index++) {
      // index 番目の x 軸位置
      let verticalIndex = index
      let verticalPosition = verticalLines[index]

      // index 番目の番号が横棒を順にたどって、行き着いた x 軸の位置を求める
      for (const horizontalLine of sortedHorizontalLines) {
        if (diff(verticalPosition, horizontalLine.start) < delta) {
          // 右へ
          verticalIndex += 1
          verticalPosition = verticalLines[verticalIndex]
        } else if (diff(verticalPosition, horizontalLine.end) < delta) {
          // 左へ
          verticalIndex -= 1
          verticalPosition = verticalLines[verticalIndex]
        }
      }

      // x 軸の場所に index + 1 の数字を格納する
      newResults[verticalIndex] = index + 1
    }

    this.results.set(newResults)

    this.drawResults()
  }

  private drawResults() {
    const ctx = this.canvasContext()
    if (!ctx) {
      return
    }

    // 縦棒の下部をクリア（数値が描画される領域のみをクリアする）
    ctx.clearRect(0, this.canvasHeight() - 50, this.canvasWidth(), 50)

    for (let i = 0; i < this.results().length; i++) {
      const line = this.verticalLines()[i]
      ctx.fillText(`${this.results()[i]}`, line.x - 5, this.canvasHeight() - 30) // 下の番号
    }
  }
}
