import { AfterViewInit, Component, computed, ElementRef, signal, viewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { diff, HorizontalLine, VerticalLine } from './amida.model'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { tablerMarquee2, tablerRotate360 } from '@ng-icons/tabler-icons'
import { LinesCountInputComponent } from './components/lines-count-input.component'

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styles: '',
  imports: [FormsModule, NgIcon, LinesCountInputComponent],
  viewProviders: [provideIcons({ tablerRotate360, tablerMarquee2 })],
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

  // キャンバスRef
  canvasAmida = viewChild.required<ElementRef>('canvasAmida')
  canvasContext = computed(() => {
    const canvasAmida = this.canvasAmida()
    const canvas = canvasAmida.nativeElement as HTMLCanvasElement
    return canvas.getContext('2d')
  })

  // あみだ籤の縦棒の集合を縦棒を描画する x 軸の位置で表現する
  verticalLines = signal<VerticalLine[]>([])
  // あみだ籤の横棒は横棒を結ぶ縦棒(2本)の x 軸の位置と横棒を描画する y 軸の値で表現する
  horizontalLines = signal<HorizontalLine[]>([])

  // あみだ籤の結果を計算する
  results = computed(() => {
    const verticalLines = this.verticalLines()
    const horizontalLines = this.horizontalLines()
    const canvasWidth = this.canvasWidth()
    return this.calculateResults(verticalLines, horizontalLines, canvasWidth)
  })

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

  // 生成ボタンを押して、あみだ籤を描く
  onGenerate(linesCount: number) {
    // 縦棒を設定
    const verticalLines = [] as VerticalLine[]
    const spacing = this.canvasWidth() / (linesCount + 1)
    for (let i = 1; i <= linesCount; i++) {
      const x = spacing * i
      verticalLines.push({ x })
    }
    this.verticalLines.set(verticalLines)

    // 横棒は空
    this.horizontalLines.set([])

    // あみだ籤を描画する
    this.drawAmida()
  }

  // キャンバスをクリックして横棒を追加する
  onCanvasClick(e: MouseEvent) {
    // マウスをクリックした場所のキャンバス内での位置
    const rect = this.canvasBoundaryRectangle()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // クリックした場所が縦棒の間なら横棒を追加する
    const verticalLines = this.verticalLines()
    // 隣接する縦棒のペアからなるリスト
    const adjacentVerticalLines = verticalLines.slice(0, -1).map((startLine, index) => ({
      start: startLine,
      end: verticalLines[index + 1],
    }))
    // クリックした場所に対する開始と終了の縦棒をみつける
    const pair = adjacentVerticalLines.find(({ start, end }) => x > start.x && x < end.x)
    if (pair) {
      //this.addHorizontalLine(pair.start, pair.end, y)
      const { start, end } = pair
      this.horizontalLines.update((current) => [...current, { start, end, y }])
    }

    // ドカンと再描画
    this.drawAmida()
  }

  // あみだ籤をリセットする
  onClear() {
    // 横棒をクリア
    this.horizontalLines.set([])

    // ドカンと再描画
    this.drawAmida()
  }

  // あみだ籤を1段階もどす
  onStepBack() {
    // 横棒の最後のひとつを消して
    this.horizontalLines.update((current) => current.slice(0, -1))

    // ドカンと再描画
    this.drawAmida()
  }

  // あみだ籤を再描画する
  private drawAmida() {
    const ctx = this.canvasContext()
    if (!ctx) {
      return
    }

    const height = this.canvasHeight()
    const width = this.canvasWidth()
    const vLines = this.verticalLines()
    const hLines = this.horizontalLines()
    const results = this.results()

    // クリアしてから描画
    ctx.clearRect(0, 0, width, height)

    vLines.forEach(({ x }, index) => {
      // 縦棒の描画
      ctx.beginPath()
      ctx.moveTo(x, 50)
      ctx.lineTo(x, height - 50)
      ctx.stroke()

      // 上の番号は 1 2 3 ,,,
      ctx.fillText(`${index + 1}`, x - 5, 30)
      // 下の番号は results にある値
      ctx.fillText(`${results[index]}`, x - 5, height - 30)
    })

    hLines.forEach(({ start, end, y }, _index) => {
      // 横棒の描画
      ctx.beginPath()
      ctx.moveTo(start.x, y)
      ctx.lineTo(end.x, y)
      ctx.stroke()
    })
  }

  // あみだ籤の結果を計算して、下に並べる数字の列を得る
  private calculateResults(
    verticalLines: VerticalLine[],
    horizontalLines: HorizontalLine[],
    canvasWidth: number,
  ): number[] {
    // 横棒を y 座標の昇順にソートする
    const sortedHorizontalLines = horizontalLines.slice().sort((a, b) => a.y - b.y)

    const spacing = canvasWidth / (verticalLines.length + 1)
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

    return newResults
  }
}
