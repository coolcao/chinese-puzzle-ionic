import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { levels } from '../../data/data-set';
import { Level } from '../../chinese-puzzle.type';
import { GameStorageService } from '../../services/game-storage.service';

interface GroupedLevels {
  easy: Level[];
  medium: Level[];
  hard: Level[];
}

@Component({
  selector: 'app-level-select',
  standalone: false,
  templateUrl: './level-select.component.html',
  styleUrls: ['./level-select.component.css']
})
export class LevelSelectComponent implements OnInit {
  levels = levels;
  groupedLevels: GroupedLevels = {
    easy: [],
    medium: [],
    hard: []
  };
  resourceLoading = true;

  constructor(private router: Router, private gameStorage: GameStorageService) { }

  async ngOnInit() {
    // 先设置loading为true，确保页面一打开就显示loading
    this.resourceLoading = true;

    if (!(await this.gameStorage.isTutorialCompleted())) {
      this.router.navigate([''], { replaceUrl: true });
      return;
    }

    // 立即执行分组逻辑，然后显示loading效果
    this.groupLevelsByDifficulty();

    // 为了让用户能看到loading效果，延迟显示内容
    setTimeout(() => {
      this.resourceLoading = false;
    }, 300);
  }

  groupLevelsByDifficulty() {
    this.groupedLevels = {
      easy: this.levels.filter(level => level.difficulty === 'easy'),
      medium: this.levels.filter(level => level.difficulty === 'medium'),
      hard: this.levels.filter(level => level.difficulty === 'hard')
    };
  }

  selectLevel(levelId: string) {
    this.router.navigate(['fabric'], {
      queryParams: { levelId: levelId }
    });
  }

  goBack() {
    this.router.navigate([''], { replaceUrl: true });
  }
}
