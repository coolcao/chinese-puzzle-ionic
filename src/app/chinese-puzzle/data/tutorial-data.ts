import { Level, Piece, TutorialStep, Direction } from "../chinese-puzzle.type";

// 教程关卡棋子数据 - 超级简单的布局，确保一目了然
const tutorialCaocao: Piece = {
  id: 1,
  name: '曹操',
  width: 2,
  height: 2,
  x: 1,
  y: 0,
  img: 'assets/img/chinese-puzzle/曹操.png'
};

const tutorialZu1: Piece = {
  id: 7,
  name: '卒1',
  width: 1,
  height: 1,
  x: 1,
  y: 2,
  img: 'assets/img/chinese-puzzle/卒.png'
};

const tutorialZu2: Piece = {
  id: 8,
  name: '卒2',
  width: 1,
  height: 1,
  x: 2,
  y: 2,
  img: 'assets/img/chinese-puzzle/卒.png'
};

// 教程关卡棋子数组
export const tutorialPieces: Piece[] = [
  tutorialCaocao,
  tutorialZu1,
  tutorialZu2
];

// 教程步骤定义 - 超级简单明了
export const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    type: 'explain',
    title: '欢迎来到华容道！',
    description: '目标很简单：将红色的曹操移动到底部出口。',
    autoPlay: false,
    waitForUser: false
  },
  {
    id: 2,
    type: 'highlight',
    title: '这是曹操',
    description: '红色的2x2大块就是曹操。',
    targetPieceId: 1,
    autoPlay: false,
    waitForUser: false
  },
  {
    id: 3,
    type: 'highlight',
    title: '这是出口',
    description: '底部这个2x2区域就是出口，我们要把曹操移动到这里。',
    highlightArea: { x: 1, y: 3, width: 2, height: 2 },
    autoPlay: false,
    waitForUser: false
  },
  {
    id: 4,
    type: 'interact',
    title: '第一步：移走左边小兵',
    description: '小兵挡住了曹操的路，先把左边小兵向左移动。',
    targetPieceId: 7,
    targetPosition: { x: 0, y: 2 },
    moveDirection: Direction.Left,
    waitForUser: true,
    strictMovement: true,
    showDirectionArrow: true,
    highlightTargetPosition: true
  },
  {
    id: 5,
    type: 'interact',
    title: '第二步：移走右边小兵',
    description: '现在把右边小兵向右移动。',
    targetPieceId: 8,
    targetPosition: { x: 3, y: 2 },
    moveDirection: Direction.Right,
    waitForUser: true,
    strictMovement: true,
    showDirectionArrow: true,
    highlightTargetPosition: true
  },
  {
    id: 6,
    type: 'interact',
    title: '第三步：曹操移动到出口',
    description: '太好了！现在拖拽曹操向下移动到出口。',
    targetPieceId: 1,
    targetPosition: { x: 1, y: 3 },
    moveDirection: Direction.Down,
    waitForUser: true,
    strictMovement: true,
    showDirectionArrow: true,
    highlightTargetPosition: true
  },
  {
    id: 7,
    type: 'explain',
    title: '完成！',
    description: '恭喜！你学会了华容道的基本玩法：移开阻挡的棋子，为目标开路！',
    autoPlay: false,
    waitForUser: false
  }
];

// 教程关卡完整定义
export const tutorialLevel: Level = {
  id: '教程关卡',
  name: '教程关卡',
  difficulty: '教程',
  minSteps: 3,
  pieces: tutorialPieces,
  isTutorial: true,
  tutorialSteps: tutorialSteps
};

// 教程关卡的数据集条目（用于 dataSet 对象）
export const tutorialDataSetEntry = {
  '教程关卡': tutorialPieces
};