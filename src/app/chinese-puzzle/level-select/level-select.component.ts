import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { levels } from '../data-set';

@Component({
  selector: 'app-level-select',
  standalone: false,
  templateUrl: './level-select.component.html',
})
export class LevelSelectComponent implements OnInit {
  levels = levels;

  constructor(private router: Router) { }

  ngOnInit() {}

  selectLevel(levelId: string) {
    this.router.navigate(['board'], {
      queryParams: { level: levelId }
    });
  }

  goBack() {
    this.router.navigate([''], { replaceUrl: true });
  }
}
