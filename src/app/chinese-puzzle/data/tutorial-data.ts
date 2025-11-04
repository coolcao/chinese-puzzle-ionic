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
    title: 'tutorial.tutorialSteps.welcome.title',
    description: 'tutorial.tutorialSteps.welcome.description',
    autoPlay: false,
    waitForUser: false
  },
  {
    id: 2,
    type: 'highlight',
    title: 'tutorial.tutorialSteps.caocao.title',
    description: 'tutorial.tutorialSteps.caocao.description',
    targetPieceId: 1,
    autoPlay: false,
    waitForUser: false
  },
  {
    id: 3,
    type: 'highlight',
    title: 'tutorial.tutorialSteps.exit.title',
    description: 'tutorial.tutorialSteps.exit.description',
    highlightArea: { x: 1, y: 3, width: 2, height: 2 },
    autoPlay: false,
    waitForUser: false
  },
  {
    id: 4,
    type: 'interact',
    title: 'tutorial.tutorialSteps.moveLeft.title',
    description: 'tutorial.tutorialSteps.moveLeft.description',
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
    title: 'tutorial.tutorialSteps.moveRight.title',
    description: 'tutorial.tutorialSteps.moveRight.description',
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
    title: 'tutorial.tutorialSteps.moveCaocao.title',
    description: 'tutorial.tutorialSteps.moveCaocao.description',
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
    title: 'tutorial.tutorialSteps.congratulations.title',
    description: 'tutorial.tutorialSteps.congratulations.description',
    autoPlay: false,
    waitForUser: false
  }
];

// 教程关卡完整定义
export const tutorialLevel: Level = {
  id: 'tutorial-level',
  name: 'Tutorial Level',
  nameEn: 'Tutorial Level',
  difficulty: 'tutorial',
  minSteps: 3,
  pieces: tutorialPieces,
  isTutorial: true,
  tutorialSteps: tutorialSteps
};

// 教程关卡的数据集条目（用于 dataSet 对象）
export const tutorialDataSetEntry = {
  'tutorial-level': tutorialPieces
};
