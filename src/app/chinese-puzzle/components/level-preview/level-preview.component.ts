import { Component, Input } from '@angular/core';
import { Level } from '../../chinese-puzzle.type';

@Component({
  selector: 'app-level-preview',
  standalone: false,
  templateUrl: './level-preview.component.html'
})
export class LevelPreviewComponent {
  @Input() level!: Level;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';


  // 创建20个网格单元格（4x5）
  get gridCells(): number[] {
    return Array.from({ length: 20 }, (_, i) => i);
  }
}
