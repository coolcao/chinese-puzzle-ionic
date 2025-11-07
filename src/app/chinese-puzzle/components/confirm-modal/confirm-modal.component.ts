import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

export interface ConfirmModalData {
  title?: string;
  message: string;
  warning?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Component({
  selector: 'app-confirm-modal',
  standalone: false,
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.css'],
})
export class ConfirmModalComponent {
  isVisible = signal(false);
  data = signal<ConfirmModalData>({
    title: '',
    message: '',
    warning: '',
    confirmText: '确定',
    cancelText: '取消',
    type: 'info'
  });

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  // 显示modal
  show(data: ConfirmModalData) {
    this.data.set({
      title: data.title || '确认',
      message: data.message,
      warning: data.warning || '',
      confirmText: data.confirmText || '确定',
      cancelText: data.cancelText || '取消',
      type: data.type || 'info'
    });
    this.isVisible.set(true);
  }

  // 隐藏modal
  hide() {
    this.isVisible.set(false);
  }

  // 确认操作
  confirm() {
    this.onConfirm.emit();
    this.hide();
  }

  // 取消操作
  cancel() {
    this.onCancel.emit();
    this.hide();
  }

  // 获取图标
  getIcon() {
    const type = this.data().type;
    switch (type) {
      case 'danger':
        return {
          icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          textColor: 'text-red-600 dark:text-red-400'
        };
      case 'warning':
        return {
          icon: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          textColor: 'text-yellow-600 dark:text-yellow-400'
        };
      default:
        return {
          icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-600 dark:text-blue-400'
        };
    }
  }

  // 获取确认按钮样式
  getConfirmButtonClass() {
    const type = this.data().type;
    switch (type) {
      case 'danger':
        return 'border-red-600 bg-red-500 hover:bg-red-600 focus:ring-red-500 dark:border-red-500 dark:bg-red-600 dark:hover:bg-red-700';
      case 'warning':
        return 'border-yellow-600 bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500 dark:border-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700';
      default:
        return 'border-blue-600 bg-blue-500 hover:bg-blue-600 focus:ring-blue-500 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700';
    }
  }

  // 阻止点击事件冒泡
  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}