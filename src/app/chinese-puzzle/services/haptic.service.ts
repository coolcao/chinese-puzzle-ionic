import { Injectable, inject } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { ChinesePuzzleStore } from '../chinese-puzzle.store';

@Injectable({
  providedIn: 'root'
})
export class HapticService {
  private store = inject(ChinesePuzzleStore);

  constructor() { }

  /**
   * 检查设备是否支持震动
   */
  async isHapticsAvailable(): Promise<boolean> {
    // 在大多数现代设备上，如果安装了 Haptics 插件，通常都支持震动
    // 直接尝试执行一个轻微震动来判断是否支持
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
      return true;
    } catch (error) {
      console.warn('设备不支持震动:', error);
      return false;
    }
  }

  /**
   * 轻微冲击震动 - 用于按钮点击等轻量级交互
   */
  async lightImpact(): Promise<void> {
    if (!this.store.settings().vibrationEnabled) {
      return;
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.warn('轻微震动失败:', error);
    }
  }

  /**
   * 中等冲击震动 - 用于棋子移动等常规交互
   */
  async mediumImpact(): Promise<void> {
    if (!this.store.settings().vibrationEnabled) {
      return;
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.warn('中等震动失败:', error);
    }
  }

  /**
   * 强烈冲击震动 - 用于重要操作或错误提示
   */
  async heavyImpact(): Promise<void> {
    if (!this.store.settings().vibrationEnabled) {
      return;
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.warn('强烈震动失败:', error);
    }
  }

  /**
   * 成功通知震动 - 用于操作成功反馈
   */
  async notificationSuccess(): Promise<void> {
    if (!this.store.settings().vibrationEnabled) {
      return;
    }

    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (error) {
      console.warn('成功震动失败:', error);
    }
  }

  /**
   * 警告通知震动 - 用于警告提示
   */
  async notificationWarning(): Promise<void> {
    if (!this.store.settings().vibrationEnabled) {
      return;
    }

    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (error) {
      console.warn('警告震动失败:', error);
    }
  }

  /**
   * 错误通知震动 - 用于错误提示
   */
  async notificationError(): Promise<void> {
    if (!this.store.settings().vibrationEnabled) {
      return;
    }

    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (error) {
      console.warn('错误震动失败:', error);
    }
  }

  /**
   * 自定义震动模式 - 通过多次轻微震动模拟自定义模式
   * @param duration 震动持续时间（毫秒）
   */
  async vibrate(duration: number): Promise<void> {
    if (!this.store.settings().vibrationEnabled) {
      return;
    }

    try {
      // 使用多次轻微震动来模拟持续震动
      const interval = 100; // 每100ms震动一次
      const times = Math.floor(duration / interval);
      
      for (let i = 0; i < times; i++) {
        await Haptics.impact({ style: ImpactStyle.Light });
        if (i < times - 1) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
    } catch (error) {
      console.warn('自定义震动失败:', error);
    }
  }

  /**
   * 选择震动 - 用于选择操作的反馈
   */
  async selection(): Promise<void> {
    if (!this.store.settings().vibrationEnabled) {
      return;
    }

    try {
      // 使用轻微震动代替选择震动
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.warn('选择震动失败:', error);
    }
  }

  /**
   * 游戏相关的便捷方法
   */

  /**
   * 按钮点击震动
   */
  async buttonClick(): Promise<void> {
    await this.lightImpact();
  }

  /**
   * 棋子移动震动
   */
  async pieceMove(): Promise<void> {
    await this.mediumImpact();
  }

  /**
   * 棋子放置震动
   */
  async piecePlace(): Promise<void> {
    await this.heavyImpact();
  }

  /**
   * 游戏成功震动
   */
  async gameSuccess(): Promise<void> {
    await this.notificationSuccess();
  }

  /**
   * 游戏失败震动
   */
  async gameFail(): Promise<void> {
    await this.notificationError();
  }

  /**
   * 关卡完成震动
   */
  async levelComplete(): Promise<void> {
    // 先震动一次，短暂停顿后再震动一次
    await this.mediumImpact();
    setTimeout(async () => {
      await this.mediumImpact();
    }, 200);
  }
}