import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface HeaderButton {
  icon: string;
  position: 'left' | 'right';
  onClick?: () => void;
  classes?: string;
}

@Component({
  selector: 'app-game-header',
  templateUrl: './game-header.component.html',
  styleUrls: ['./game-header.component.css'],
  standalone: false,
})
export class GameHeaderComponent {
  @Input() title: string = '';
  @Input() titleTranslationKey: string = '';
  @Input() showBackButton: boolean = true;
  @Input() backButtonIcon: string = 'arrow-left';
  @Input() customButtons: HeaderButton[] = [];
  @Input() maxWidth: string = 'max-w-7xl';

  @Output() backClick = new EventEmitter<void>();
  @Output() buttonClick = new EventEmitter<{ button: HeaderButton; index: number }>();

  onBackClick(): void {
    this.backClick.emit();
  }

  onCustomButtonClick(button: HeaderButton, index: number): void {
    if (button.onClick) {
      button.onClick();
    }
    this.buttonClick.emit({ button, index });
  }

  getLeftButtons(): HeaderButton[] {
    return this.customButtons.filter(btn => btn.position === 'left');
  }

  getRightButtons(): HeaderButton[] {
    return this.customButtons.filter(btn => btn.position === 'right');
  }

  getIconPath(icon: string): string {
    const iconPaths: { [key: string]: string } = {
      'arrow-left': 'M15 19l-7-7 7-7',
      'help': 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      'settings': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      'home': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      'menu': 'M4 6h16M4 12h16M4 18h16'
    };
    return iconPaths[icon] || iconPaths['help'];
  }
}