import { AfterViewInit, Component, computed, ElementRef, signal, viewChild } from '@angular/core'
import { FormsModule, NgForm } from '@angular/forms'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrl: 'app.component.scss',
  imports: [FormsModule],
})
export class AppComponent implements AfterViewInit {
  canvasContainer = viewChild.required<ElementRef>('canvasContainer')
  canvasWidth = computed(() => {
    const canvasContainer = this.canvasContainer()
    const element = canvasContainer.nativeElement as HTMLElement
    return element.offsetWidth
  })
  canvasBoundaryRectangle = computed(() => {
    const canvasContainer = this.canvasContainer()
    const element = canvasContainer.nativeElement as HTMLElement
    return element.getBoundingClientRect()
  })
  canvasHeight = signal<number>(500)

  canvasAmida = viewChild.required<ElementRef>('canvasAmida')
  canvasContext = computed(() => {
    const canvasAmida = this.canvasAmida()
    const canvas = canvasAmida.nativeElement as HTMLCanvasElement
    return canvas.getContext('2d')
  })

  linesCountForm = viewChild.required<NgForm>('linesCountForm')
  linesCount = signal<number>(5)

  // あみだ籤の結果
  results = signal<number[]>([])

  // 縦棒の x 軸の値
  verticalLines = signal<number[]>([])
  // 横棒の x 軸の値は横棒が曳かれる中間値、と y 軸の値
  horizontalLines = signal<{ start: number; end: number; y: number }[]>([])

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
      const from = this.verticalLines()[i]
      const to = this.verticalLines()[i + 1]
      if (x > from && x < to) {
        this.addHorizontalLine(from, to, y)
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
      this.verticalLines.update((current) => [...current, x])
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

  private addHorizontalLine(start: number, end: number, y: number) {
    const ctx = this.canvasContext()
    if (!ctx) {
      return
    }

    this.horizontalLines.update((current) => [...current, { start, end, y }])

    // 横棒の描画
    ctx.beginPath()
    ctx.moveTo(start, y)
    ctx.lineTo(end, y)
    ctx.stroke()

    // あみだくじの結果を更新する
    this.updateResults()
  }

  private updateResults() {
    const verticalLines = this.verticalLines()

    this.results.update((current) =>
      current.map((_, index) => {
        let position = verticalLines[index]
        for (const line of this.horizontalLines()) {
          if (Math.abs(position - line.start) < 10) {
            position = verticalLines[verticalLines.indexOf(position) + 1] // 右へ
          } else if (Math.abs(position - line.end) < 10) {
            position = verticalLines[verticalLines.indexOf(position) - 1] // 左へ
          }
        }
        return verticalLines.indexOf(position) + 1
      }),
    )

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
      const x = this.verticalLines()[i]
      ctx.fillText(`${this.results()[i]}`, x - 5, this.canvasHeight() - 30) // 下の番号
    }
  }
}
