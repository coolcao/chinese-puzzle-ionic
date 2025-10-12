export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  id: number;
  name: string;
  width: number; // 宽度（占用列数）
  height: number; // 高度（占用行数）
  x: number; // 起始列
  y: number; // 起始行
  img?: string;
}

export enum Direction {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
}

export interface Level {
  id: string;
  name: string;
  difficulty: string;
  minSteps?: number;
  pieces: Piece[];
}

// 用户设置数据结构
export interface UserSettings {
  isDarkMode: boolean;
  smoothDragMode: boolean;
  soundEffectsEnabled: boolean;    // 音效开关
  backgroundMusicEnabled: boolean; // 背景音乐开关
  vibrationEnabled: boolean;  // 震动开关
}

// 游戏进度数据结构
export interface GameProgress {
  levelId: string;
  isCompleted: boolean;
  bestSteps: number;
  bestTime: number;
  completedAt: string;
  attempts: number;
  stars: number; // 1-3星评价
}

// 游戏历史记录数据结构
export interface GameHistoryRecord {
  id: string;                 // 唯一记录ID
  levelId: string;            // 关卡ID
  steps: number;              // 完成步数
  time: number;               // 完成时间（秒）
  completedAt: string;        // 完成时间戳
  stars: number;              // 获得星星数 (1-3)
  isCompleted: boolean;       // 是否完成
  isPerfect: boolean;         // 是否完美完成（3星）
}

// 游戏统计数据结构
export interface GameStats {
  calculatedAt: string;       // 统计计算时间
  totalPlayTime: number;      // 总游戏时间
  totalSteps: number;         // 总步数
  totalGames: number;         // 总游戏次数
  levelsCompleted: number;    // 完成关卡数（去重）
  perfectCompletions: number; // 完美完成数
  firstPlayDate: string;      // 首次游玩日期
  lastPlayDate: string;       // 最后游玩日期
  currentStreak: number;      // 当前连续完成天数
  maxStreak: number;          // 最大连续完成天数
}


