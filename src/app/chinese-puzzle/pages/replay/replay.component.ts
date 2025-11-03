import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameStorageService } from '../../services/game-storage.service';
import { GameHistoryRecord, Level, Piece, GameStep } from '../../chinese-puzzle.type';
import { FabricGameService } from '../game-board-fabric/services/fabric-game.service';
import { FabricDrawingService } from '../game-board-fabric/services/fabric-drawing.service';
import { levels } from '../../data/data-set';
import { interval, Subscription } from 'rxjs';
import { ImageLoadingService } from '../../services/image-loading.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-replay',
  templateUrl: './replay.component.html',
  standalone: false,
})
export class ReplayComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('replayCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  historyRecord: GameHistoryRecord | null = null;
  currentLevel: Level | null = null;
  currentPieces: Piece[] = [];
  isPlaying = false;
  currentTime = 0;
  totalDuration = 0;
  formattedTime = '00:00';
  formattedTotalDuration = '00:00';
  playbackSpeed = 1;
  currentStepIndex = 0;

  historyId: string | null = null;
  private playbackTimer: Subscription | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private darkModeMediaQuery: MediaQueryList | null = null;
  private darkModeListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameStorage: GameStorageService,
    private fabricGameService: FabricGameService,
    private fabricDrawingService: FabricDrawingService,
    private imageLoadingService: ImageLoadingService,
    private toastController: ToastController
  ) {
    effect(() => {
      const cellSize = this.fabricGameService.cellSizeSignal();
      if (cellSize > 0 && this.currentPieces.length > 0) {
        this.drawBoard();
      }
    });
  }

  ngOnInit() {
    this.historyId = this.route.snapshot.paramMap.get('id');
    if (this.historyId) {
      this.loadHistoryRecord();
    } else {
      console.error('No history ID provided in route');
    }
  }

  ngAfterViewInit() {
    this.initCanvas();
    this.initResizeObserver();
  }

  ngOnDestroy() {
    this.stopPlayback();
    this.destroyResizeObserver();
    this.fabricGameService.dispose();
  }

  async loadHistoryRecord() {
    const allHistory = await this.gameStorage.getGameHistory();
    this.historyRecord = allHistory.find(record => record.id === this.historyId) || null;

    if (this.historyRecord) {
      this.currentLevel = this.findLevelById(this.historyRecord.levelId);

      if (this.currentLevel) {
        this.currentPieces = JSON.parse(JSON.stringify(this.currentLevel.pieces));
        this.totalDuration = this.historyRecord.time;
        this.formattedTotalDuration = this.formatTime(this.totalDuration);
        this.currentStepIndex = 0;

        await this.preLoadImages();
        this.drawBoard();
      } else {
        console.error('Level data not found:', this.historyRecord.levelId);
      }
    } else {
      console.error('History record not found:', this.historyId);
    }
  }

  private findLevelById(levelId: string): Level | null {
    return levels.find(level => level.id === levelId) || null;
  }

  private initCanvas() {
    const canvasElement = this.canvasRef?.nativeElement;
    if (canvasElement) {
      this.fabricGameService.boardWidth = 4;
      this.fabricGameService.boardHeight = 5;
      this.fabricGameService.initCanvas(canvasElement);
      this.updateCellSize();
      this.drawBoard();
    } else {
      setTimeout(() => this.initCanvas(), 100);
    }
  }

  private initResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.handleCanvasResize();
    });
    this.resizeObserver.observe(this.canvasRef.nativeElement.parentElement!);

    if (window.matchMedia) {
      this.darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.darkModeListener = (e: MediaQueryListEvent) => {
        this.drawBoard();
      };
      this.darkModeMediaQuery.addEventListener('change', this.darkModeListener);
    }
  }

  private handleCanvasResize() {
    this.updateCellSize();
    this.drawBoard();
  }

  private destroyResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.darkModeMediaQuery && this.darkModeListener) {
      this.darkModeMediaQuery.removeEventListener('change', this.darkModeListener);
      this.darkModeListener = null;
      this.darkModeMediaQuery = null;
    }
  }

  private updateCellSize() {
    const canvasElement = this.canvasRef?.nativeElement;
    if (!canvasElement) {
      return;
    }
    this.fabricGameService.updateCellSize(canvasElement);
  }

  private async preLoadImages() {
    if (this.currentPieces.length > 0) {
      await this.imageLoadingService.preLoadImage(this.currentPieces);
    }
  }

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.play();
    } else {
      this.pause();
    }
  }

  play() {
    if (!this.historyRecord || !this.currentLevel) return;

    this.isPlaying = true;
    const frameInterval = 1000 / this.playbackSpeed;

    this.playbackTimer = interval(frameInterval).subscribe(() => {
      this.nextFrame();
    });
  }

  pause() {
    this.isPlaying = false;
    this.stopPlayback();
  }

  private stopPlayback() {
    if (this.playbackTimer) {
      this.playbackTimer.unsubscribe();
      this.playbackTimer = null;
    }
  }

  private nextFrame() {
    if (!this.historyRecord) return;

    if (this.currentStepIndex >= this.historyRecord.gameSteps.length) {
      this.pause();
      this.showToast('播放完毕');
      return;
    }

    const currentStep = this.historyRecord.gameSteps[this.currentStepIndex];
    this.executeStep(currentStep);
    this.currentStepIndex++;

    this.currentTime = Math.floor(currentStep.timestamp / 1000);
    this.formattedTime = this.formatTime(this.currentTime);
  }

  private executeStep(step: GameStep) {
    const piece = this.currentPieces.find(p => p.id === step.pieceId);
    if (!piece) return;

    piece.x = step.toPosition.x;
    piece.y = step.toPosition.y;

    this.drawBoard();
  }

  onSliderChange(event: any) {
    const targetTime = parseInt(event.target.value);
    this.seek(targetTime);
  }

  seek(targetTime?: number) {
    if (!this.historyRecord || !this.currentLevel) return;

    const seekTime = targetTime !== undefined ? targetTime : this.currentTime;

    this.currentPieces = JSON.parse(JSON.stringify(this.currentLevel.pieces));
    this.currentStepIndex = 0;

    for (const step of this.historyRecord.gameSteps) {
      const stepTime = Math.floor(step.timestamp / 1000);
      if (stepTime <= seekTime) {
        this.executeStep(step);
        this.currentStepIndex++;
      } else {
        break;
      }
    }

    this.currentTime = seekTime;
    this.formattedTime = this.formatTime(this.currentTime);
  }

  restartReplay() {
    this.pause();
    this.seek(0);
  }

  changePlaybackSpeed() {
    const speeds = [0.5, 1, 2, 4];
    const currentIndex = speeds.indexOf(this.playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    this.playbackSpeed = speeds[nextIndex];

    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }

  getSpeedText(): string {
    return `${this.playbackSpeed}x`;
  }

  goBack() {
    this.router.navigate(['/profile']);
  }

  formatTime(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  private lockBoard() {
    if (this.fabricGameService.canvas) {
      this.fabricGameService.canvas.selection = false;
      this.fabricGameService.canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
      this.fabricGameService.canvas.renderAll();
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color: 'dark',
      cssClass: 'replay-toast',
    });
    toast.present();
  }

  private drawBoard() {
    if (!this.fabricGameService.canvas) {
      return;
    }

    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    this.fabricGameService.clearCanvas();
    this.fabricDrawingService.drawBoard(isDarkMode);

    if (this.currentPieces.length > 0) {
      this.currentPieces.forEach(piece => {
        const pieceGroup = this.fabricDrawingService.createPieceGroup(piece, isDarkMode);
        this.fabricGameService.addPieceObject(piece.id, pieceGroup);
        this.fabricGameService.canvas!.add(pieceGroup);
      });
    }

    this.fabricGameService.renderCanvas();
    this.lockBoard();
  }
}
