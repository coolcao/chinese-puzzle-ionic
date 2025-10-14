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
}