import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface GameLevel {
  id: string;
  name: string;
}

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  // 模态框显示状态
  showInstructions = false;
  showSettings = false;
  showProfile = false;

  constructor(private router: Router) { }

  ngOnInit() {}

  startGame() {
    // 默认开始第一个关卡
    this.router.navigate(['level-select']);
  }

  // 模态框控制方法
  openGameInstructions() {
    this.showInstructions = true;
  }

  closeInstructions() {
    this.showInstructions = false;
  }

  openSettings() {
    this.showSettings = true;
  }

  closeSettings() {
    this.showSettings = false;
  }

  openMyProfile() {
    this.showProfile = true;
  }

  closeProfile() {
    this.showProfile = false;
  }

  // 设置功能方法
  toggleDarkMode() {
    // 切换黑暗模式逻辑
  }

  toggleSound() {
    // 切换音效逻辑
  }

  toggleVibration() {
    // 切换震动反馈逻辑
  }
}
