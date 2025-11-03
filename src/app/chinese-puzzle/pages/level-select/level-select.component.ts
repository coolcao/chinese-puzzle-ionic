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
})
export class LevelSelectComponent implements OnInit {
  levels = levels;
  groupedLevels: GroupedLevels = {
    easy: [],
    medium: [],
    hard: []
  };

  constructor(private router: Router, private gameStorage: GameStorageService) { }

  async ngOnInit() {
    if (!(await this.gameStorage.isTutorialCompleted())) {
      this.router.navigate(['']);
      return;
    }
    this.groupLevelsByDifficulty();
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
