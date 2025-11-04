import { Injectable, inject } from '@angular/core';
import { Howl, Howler } from 'howler';
import { ChinesePuzzleStore } from '../chinese-puzzle.store';

export interface SoundEffect {
  id: string;
  howl: Howl;
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private store = inject(ChinesePuzzleStore);

  // 音效对象存储
  private soundEffects: Map<string, Howl> = new Map();

  // 背景音乐对象
  private backgroundMusic: Howl | null = null;
  
  // 背景音乐加载状态
  private isBackgroundMusicLoaded = false;

  // 音效文件配置
  private readonly soundConfig = {
    clicked: 'assets/audios/clicked.mp3',
    success: 'assets/audios/success.mp3',
    lineFail: 'assets/audios/line_fail.mp3',
    lineSuccess: 'assets/audios/line_success.mp3',
    wood: 'assets/audios/wood.mp3'
  };

  constructor() {
    this.initializeSounds();
    this.initializeBackgroundMusic();
  }

  /**
   * 初始化所有音效
   */
  private initializeSounds(): void {
    Object.entries(this.soundConfig).forEach(([key, src]) => {
      const howl = new Howl({
        src: [src],
        volume: 0.7,
        preload: true,
        onloaderror: (id, error) => {
          console.warn(`音效加载失败: ${key}`, error);
        }
      });

      this.soundEffects.set(key, howl);
    });
  }

  /**
   * 播放音效
   * @param soundKey 音效键名
   * @param volume 音量 (0-1)，可选
   */
  playSound(soundKey: string, volume?: number): void {
    // 检查音效是否开启
    if (!this.store.settings().soundEffectsEnabled) {
      return;
    }

    const sound = this.soundEffects.get(soundKey);
    if (sound) {
      if (volume !== undefined) {
        sound.volume(volume);
      }
      sound.play();
    } else {
      console.warn(`音效不存在: ${soundKey}`);
    }
  }

  /**
   * 停止特定音效
   * @param soundKey 音效键名
   */
  stopSound(soundKey: string): void {
    const sound = this.soundEffects.get(soundKey);
    if (sound) {
      sound.stop();
    }
  }

  /**
   * 停止所有音效
   */
  stopAllSounds(): void {
    this.soundEffects.forEach(sound => {
      sound.stop();
    });
  }

  /**
   * 设置全局音量
   * @param volume 音量 (0-1)
   */
  setGlobalVolume(volume: number): void {
    Howler.volume(volume);
  }

  /**
   * 设置特定音效音量
   * @param soundKey 音效键名
   * @param volume 音量 (0-1)
   */
  setSoundVolume(soundKey: string, volume: number): void {
    const sound = this.soundEffects.get(soundKey);
    if (sound) {
      sound.volume(volume);
    }
  }

  /**
   * 预加载音效
   */
  preloadSounds(): Promise<void> {
    return new Promise((resolve) => {
      let loadedCount = 0;
      const totalSounds = this.soundEffects.size;

      if (totalSounds === 0) {
        resolve();
        return;
      }

      this.soundEffects.forEach(sound => {
        if (sound.state() === 'loaded') {
          loadedCount++;
          if (loadedCount === totalSounds) {
            resolve();
          }
        } else {
          sound.once('load', () => {
            loadedCount++;
            if (loadedCount === totalSounds) {
              resolve();
            }
          });
        }
      });
    });
  }

  /**
   * 获取可用的音效列表
   */
  getAvailableSounds(): string[] {
    return Array.from(this.soundEffects.keys());
  }

  // 游戏相关的便捷方法

  /**
   * 播放点击音效
   */
  playClickSound(): void {
    this.playSound('clicked', 0.5);
  }

  /**
   * 播放成功音效
   */
  playSuccessSound(): void {
    this.playSound('success', 0.8);
  }

  /**
   * 播放失败音效
   */
  playFailSound(): void {
    this.playSound('lineFail', 0.6);
  }

  /**
   * 播放连线成功音效
   */
  playLineSuccessSound(): void {
    this.playSound('lineSuccess', 0.7);
  }

  /**
   * 播放木头碰撞音效
   */
  playWoodSound(): void {
    this.playSound('wood', 0.6);
  }

  /**
   * 初始化背景音乐
   */
  private initializeBackgroundMusic(): void {
    this.backgroundMusic = new Howl({
      src: ['assets/audios/bg.mp3'],
      loop: true,
      volume: 0.3, // 设置较小的音量
      preload: true,
      onload: () => {
        this.isBackgroundMusicLoaded = true;
        // 背景音乐加载完成后，检查当前设置是否需要播放
        if (this.store.settings().backgroundMusicEnabled && !this.backgroundMusic?.playing()) {
          this.backgroundMusic?.play();
        }
      },
      onloaderror: (id, error) => {
        console.warn('背景音乐加载失败:', error);
        this.isBackgroundMusicLoaded = false;
      }
    });
  }

  /**
   * 播放背景音乐
   */
  playBackgroundMusic(): void {
    if (!this.store.settings().backgroundMusicEnabled) {
      return;
    }

    // 确保背景音乐已加载
    if (!this.isBackgroundMusicLoaded) {
      console.log('背景音乐尚未加载完成，等待加载...');
      return;
    }

    if (this.backgroundMusic && !this.backgroundMusic.playing()) {
      this.backgroundMusic.play();
    }
  }

  /**
   * 停止背景音乐
   */
  stopBackgroundMusic(): void {
    if (this.backgroundMusic && this.backgroundMusic.playing()) {
      this.backgroundMusic.stop();
    }
  }

  /**
   * 暂停背景音乐
   */
  pauseBackgroundMusic(): void {
    if (this.backgroundMusic && this.backgroundMusic.playing()) {
      this.backgroundMusic.pause();
    }
  }

  /**
   * 恢复背景音乐
   */
  resumeBackgroundMusic(): void {
    if (this.store.settings().backgroundMusicEnabled && this.backgroundMusic && this.isBackgroundMusicLoaded) {
      this.backgroundMusic.play();
    }
  }

  /**
   * 设置背景音乐音量
   * @param volume 音量 (0-1)
   */
  setBackgroundMusicVolume(volume: number): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.volume(volume);
    }
  }

  /**
   * 根据设置状态更新背景音乐
   */
  updateBackgroundMusicStatus(): void {
    if (this.store.settings().backgroundMusicEnabled) {
      // 如果背景音乐已加载且未在播放，则播放
      if (this.isBackgroundMusicLoaded && this.backgroundMusic && !this.backgroundMusic.playing()) {
        this.backgroundMusic.play();
      }
      // 如果未加载，则等待加载完成后自动播放（由onload回调处理）
    } else {
      this.stopBackgroundMusic();
    }
  }

  /**
   * 检查背景音乐是否正在播放
   */
  isBackgroundMusicPlaying(): boolean {
    return this.backgroundMusic && this.isBackgroundMusicLoaded ? this.backgroundMusic.playing() : false;
  }

  /**
   * 检查背景音乐是否已加载
   */
  isBackgroundMusicLoadedStatus(): boolean {
    return this.isBackgroundMusicLoaded;
  }
}
