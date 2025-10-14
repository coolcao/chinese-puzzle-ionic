import { AfterViewInit, Component, EventEmitter, Input, Output } from '@angular/core';

// Confetto 类定义
class Confetto {
  // 位置、速度、颜色等属性
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  gravity: number;
  rotation: number;
  rotationSpeed: number;

  constructor() {
    // 随机生成位置
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight - window.innerHeight;
    // 随机大小
    this.size = Math.random() * 10 + 5;
    // 随机速度
    this.speedX = Math.random() * 4 - 2;
    this.speedY = Math.random() * 4 + 2;
    // 随机颜色
    this.color = this.getRandomColor();
    // 重力效果
    this.gravity = 0.05;
    // 随机旋转速度
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 2 - 1;
  }

  // 随机生成颜色
  getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // 更新粒子的状态
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.speedY += this.gravity; // 受重力影响下落
    this.rotation += this.rotationSpeed; // 旋转效果

    // 如果粒子移出视口，重新生成
    // if (this.x > window.innerWidth || this.x < 0 || this.y > window.innerHeight) {
    //   this.x = Math.random() * window.innerWidth;
    //   this.y = Math.random() * window.innerHeight - window.innerHeight;
    //   this.speedX = Math.random() * 4 - 2;
    //   this.speedY = Math.random() * 4 + 2;
    // }
  }

  // 绘制粒子
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, 2 * Math.PI);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}

@Component({
  selector: 'app-scatter-flowers',
  standalone: false,

  templateUrl: './scatter-flowers.component.html',
  styleUrl: './scatter-flowers.component.css'
})
export class ScatterFlowersComponent implements AfterViewInit {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;

  ngAfterViewInit(): void {
    this.canvas = document.getElementById('confettiCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.startConfetti();
  }

  startConfetti() {
    const confettiCount = 200;
    const confetti: any[] = [];

    // 创建 confetti 对象
    for (let i = 0; i < confettiCount; i++) {
      confetti.push(new Confetto());
    }

    // 渲染函数
    const render = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      confetti.forEach((confetto: any) => {
        confetto.update();
        confetto.draw(this.ctx);
      });

      requestAnimationFrame(render);
    };

    render();
  }


}
