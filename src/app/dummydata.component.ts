import {
  EventEmitter,
  input,
  output,
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';

@Component({
  selector: 'app-dummydata',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DummyData {
  // src = input('../assets/freakbob.jpg');
  // src = input('../assets/dummydata.json');
  onCheckedChanged = output<boolean>();

  async getFile() {
    // console.log(this.src());
    // const fetchImage = await fetch('../assets/freakbob.jpg');
    const fetchImage = await fetch('../assets/dummydata.json');
    const blob = await fetchImage.blob();
    // return new File([blob], 'freakbob.jpg', blob);
    return new File([blob], 'dummydata.json', blob);
  }
}
