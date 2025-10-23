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
  minSteps: number;
  pieces: Piece[];
  isTutorial?: boolean;  // 是否为教程关卡
  tutorialSteps?: TutorialStep[];  // 教程步骤
}

// 教程步骤接口
export interface TutorialStep {
  id: number;
  type: 'highlight' | 'move' | 'explain' | 'interact';
  title: string;
  description: string;
  targetPieceId?: number;  // 目标棋子ID
  targetPosition?: Position;  // 目标位置
  moveDirection?: Direction;  // 移动方向
  highlightArea?: { x: number, y: number, width: number, height: number };  // 高亮区域
  autoPlay?: boolean;  // 是否自动播放
  waitForUser?: boolean;  // 是否等待用户操作
  nextStepDelay?: number;  // 下一步延迟（毫秒）
  strictMovement?: boolean;  // 是否严格按照指定方向移动
  showDirectionArrow?: boolean;  // 是否显示方向箭头
  highlightTargetPosition?: boolean;  // 是否高亮目标位置
}

// 用户设置数据结构
export interface UserSettings {
  isDarkMode: boolean;
  smoothDragMode: boolean;
  soundEffectsEnabled: boolean;    // 音效开关
  backgroundMusicEnabled: boolean; // 背景音乐开关
  vibrationEnabled: boolean;  // 震动开关
  tutorialCompleted: boolean;  // 教程是否已完成
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

// 游戏操作步骤记录
export interface GameStep {
  stepNumber: number;         // 步骤序号
  timestamp: number;          // 操作时间戳（相对于游戏开始）
  pieceId: number;            // 移动的棋子ID
  pieceName: string;          // 棋子名称
  fromPosition: Position;     // 起始位置
  toPosition: Position;       // 结束位置
  direction: Direction;       // 移动方向
  distance: number;           // 移动距离（格数）
  duration: number;           // 操作持续时间（毫秒）
}

// 游戏历史记录数据结构
export interface GameHistoryRecord {
  id: string;                 // 唯一记录ID
  levelId: string;            // 关卡ID
  levelName: string;          // 关卡名称
  difficulty: string;         // 关卡难度
  steps: number;              // 完成步数
  time: number;               // 完成时间（秒）
  completedAt: string;        // 完成时间戳
  rating: string;             // 评分
  gameSteps: GameStep[];      // 详细操作步骤
  initialBoardState?: Piece[]; // 初始棋盘状态（可选，用于完整回放）
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


