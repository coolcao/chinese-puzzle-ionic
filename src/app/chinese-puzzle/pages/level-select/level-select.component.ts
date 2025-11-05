import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GameStorageService } from '../../services/game-storage.service';
import { LevelStateService } from '../../services/level-state.service';
import { LanguageService } from '../../services/language.service';
import { LevelStore } from 'src/app/chinese-puzzle/level.store';
import { GameProgress } from '../../chinese-puzzle.type';

@Component({
  selector: 'app-level-select',
  standalone: false,
  templateUrl: './level-select.component.html',
  styleUrls: ['./level-select.component.css']
})
export class LevelSelectComponent implements OnInit {

  private router = inject(Router);
  private gameStorage = inject(GameStorageService);
  private levelStateService = inject(LevelStateService);
  private languageService = inject(LanguageService);
  private levelStore = inject(LevelStore);

  resourceLoading = true;
  currentLanguage = this.languageService.getCurrentLanguage();

  // 直接使用LevelStore的计算属性
  groupedLevelsWithUnlock = this.levelStore.groupedLevelsWithProgress;
  statistics = this.levelStore.statistics;


  constructor() { }

  async ngOnInit() {
    // 先设置loading为true，确保页面一打开就显示loading
    this.resourceLoading = true;

    if (!(await this.gameStorage.isTutorialCompleted())) {
      this.router.navigate([''], { replaceUrl: true });
      return;
    }

    // 初始化关卡状态（从Storage加载到Store，包括进度信息）
    await this.levelStateService.initializeLevelState();

    // 为了让用户能看到loading效果，延迟显示内容
    setTimeout(() => {
      this.resourceLoading = false;
    }, 200);
  }

  // 获取星级显示字符串
  getStarsDisplay(levelId: string): string {
    return this.levelStore.getStarsDisplay(levelId);
  }

  selectLevel(levelId: string) {
    // 检查关卡是否已解锁
    if (!this.levelStore.isLevelUnlocked(levelId)) {
      console.log('🔒 关卡未解锁:', levelId);
      // 可以在这里添加提示消息
      return;
    }

    this.router.navigate(['fabric'], {
      queryParams: { levelId: levelId }
    });
  }

  goBack() {
    this.router.navigate([''], { replaceUrl: true });
  }

}
