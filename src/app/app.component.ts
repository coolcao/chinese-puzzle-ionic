import { Component, effect, inject, OnInit } from '@angular/core';
import { ChinesePuzzleStore } from 'src/app/chinese-puzzle/chinese-puzzle.store';
import { GameManagementService } from 'src/app/chinese-puzzle/services/game-management.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.css'],
  standalone: false,
})
export class AppComponent implements OnInit {
  private readonly gameManagement = inject(GameManagementService);
  private readonly store = inject(ChinesePuzzleStore);
  constructor() {
    this.setupEffects();
  }

  async ngOnInit(): Promise<void> {
    await this.gameManagement.loadSettings();
  }

  private setupEffects() {
    // 监听settings变化
    effect(() => {
      const settings = this.store.settings();
      // 根据settings.isDarkMode设置dark类
      if (settings.isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });
  }
}
