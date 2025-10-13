import { Directive, HostListener, inject } from '@angular/core';
import { AudioService } from '../services/audio.service';

@Directive({
  selector: '[appClickSound]',
  standalone: false
})
export class ClickSoundDirective {
  private audioService = inject(AudioService);

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    this.audioService.playClickSound();
  }
}