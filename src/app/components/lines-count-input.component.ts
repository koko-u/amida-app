import { Component, output, signal, viewChild } from '@angular/core'
import { FormsModule, NgForm } from '@angular/forms'
import { NgIcon, provideIcons } from '@ng-icons/core'
import { tablerCircleCheck } from '@ng-icons/tabler-icons'

@Component({
  selector: 'app-lines-count-input',
  imports: [FormsModule, NgIcon],
  templateUrl: './lines-count-input.component.html',
  styles: '',
  viewProviders: [provideIcons({ tablerCircleCheck })],
})
export class LinesCountInputComponent {
  linesCount = signal(5)
  generate = output<number>()

  inputLinesCountForm = viewChild.required<NgForm>('linesCountForm')

  onGenerate() {
    if (this.inputLinesCountForm().valid) {
      this.generate.emit(this.linesCount())
    }
  }
}
