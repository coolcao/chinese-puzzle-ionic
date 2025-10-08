import { Level, Piece } from "./chinese-puzzle.type";

const caocao = { id: 1, name: '曹操', width: 2, height: 2, x: 1, y: 0, img: 'assets/img/chinese-puzzle/曹操.png' };
const guanyu = { id: 2, name: '关羽', width: 2, height: 1, x: 1, y: 2, img: 'assets/img/chinese-puzzle/关羽.png' };
const zhangfei = { id: 3, name: '张飞', width: 1, height: 2, x: 0, y: 0, img: 'assets/img/chinese-puzzle/张飞.png' };
const zhaoyun = { id: 4, name: '赵云', width: 1, height: 2, x: 3, y: 0, img: 'assets/img/chinese-puzzle/赵云.png' };
const machao = { id: 5, name: '马超', width: 1, height: 2, x: 0, y: 2, img: 'assets/img/chinese-puzzle/马超.png' };
const huangzhong = { id: 6, name: '黄忠', width: 1, height: 2, x: 3, y: 2, img: 'assets/img/chinese-puzzle/黄忠.png' };
const zu1 = { id: 7, name: '卒1', width: 1, height: 1, x: 0, y: 4, img: 'assets/img/chinese-puzzle/卒.png' };
const zu2 = { id: 8, name: '卒2', width: 1, height: 1, x: 1, y: 3, img: 'assets/img/chinese-puzzle/卒.png' };
const zu3 = { id: 9, name: '卒3', width: 1, height: 1, x: 2, y: 3, img: 'assets/img/chinese-puzzle/卒.png' };
const zu4 = { id: 10, name: '卒4', width: 1, height: 1, x: 3, y: 4, img: 'assets/img/chinese-puzzle/卒.png' };

export const dataSet: Record<string, Piece[]> = {
  '横刀立马': [
    caocao, guanyu, zhangfei, zhaoyun, machao, huangzhong, zu1, zu2, zu3, zu4
  ],
  '将拥曹营': [
    { ...caocao, x: 1, y: 0 },
    { ...zhangfei, x: 0, y: 1 },
    { ...zhaoyun, x: 3, y: 1 },
    { ...machao, x: 1, y: 2 },
    { ...huangzhong, x: 2, y: 2 },
    { ...zu1, x: 0, y: 3 },
    { ...zu2, x: 3, y: 3 },
    { ...guanyu, x: 0, y: 4 },
    { ...zu3, x: 2, y: 4 },
    { ...zu4, x: 3, y: 4 }
  ],
  '齐头并进': [
    { ...zhangfei, x: 0, y: 0 },
    { ...caocao, x: 1, y: 0 },
    { ...zhaoyun, x: 3, y: 0 },
    { ...zu1, x: 0, y: 2 },
    { ...zu2, x: 1, y: 2 },
    { ...zu3, x: 2, y: 2 },
    { ...zu4, x: 3, y: 2 },
    { ...machao, x: 0, y: 3 },
    { ...guanyu, x: 1, y: 3 },
    { ...huangzhong, x: 3, y: 3 },
  ],
  '指挥若定': [
    { ...zhangfei, x: 0, y: 0 },
    { ...caocao, x: 1, y: 0 },
    { ...zhaoyun, x: 3, y: 0 },
    { ...zu1, x: 0, y: 2 },
    { ...guanyu, x: 1, y: 2 },
    { ...zu2, x: 3, y: 2 },
    { ...machao, x: 0, y: 3 },
    { ...zu3, x: 1, y: 3 },
    { ...zu4, x: 2, y: 3 },
    { ...huangzhong, x: 3, y: 3 }
  ],
  '兵分两路': [
    { ...zu1, x: 0, y: 0 },
    { ...caocao, x: 1, y: 0 },
    { ...zu2, x: 3, y: 0 },
    { ...zhangfei, x: 0, y: 1 },
    { ...guanyu, x: 1, y: 2 },
    { ...zhaoyun, x: 3, y: 1 },
    { ...machao, x: 0, y: 3 },
    { ...zu3, x: 1, y: 3 },
    { ...zu4, x: 2, y: 3 },
    { ...huangzhong, x: 3, y: 3 }
  ],
  '兵临城下': [
    { ...caocao, x: 1, y: 0 },
    { ...zu1, x: 0, y: 0 },
    { ...zu2, x: 0, y: 1 },
    { ...zu3, x: 3, y: 0 },
    { ...zu4, x: 3, y: 1 },
    { ...zhangfei, x: 0, y: 2 },
    { ...zhaoyun, x: 1, y: 2 },
    { ...machao, x: 2, y: 2 },
    { ...huangzhong, x: 3, y: 2 },
    { ...guanyu, x: 1, y: 4 }
  ],
  '一路进军': [
    { ...caocao, x: 1, y: 0 },
    { ...zhangfei, x: 0, y: 0 },
    { ...zhaoyun, x: 0, y: 2 },
    { ...machao, x: 1, y: 2 },
    { ...huangzhong, x: 2, y: 2 },
    { ...zu1, x: 3, y: 0 },
    { ...zu2, x: 3, y: 1 },
    { ...zu3, x: 3, y: 2 },
    { ...zu4, x: 3, y: 3 },
    { ...guanyu, x: 1, y: 4 }
  ],
  '一路顺风': [
    { ...caocao, x: 1, y: 0 },
    { ...zhangfei, x: 0, y: 0 },
    { ...zu1, x: 3, y: 0 },
    { ...zu2, x: 3, y: 1 },
    { ...zhaoyun, x: 0, y: 2 },
    { ...huangzhong, x: 3, y: 2 },
    { ...guanyu, x: 1, y: 2 },
    { ...machao, x: 2, y: 3 },
    { ...zu3, x: 1, y: 3 },
    { ...zu4, x: 1, y: 4 }
  ],
  '兵临曹营': [
    { ...caocao, x: 1, y: 0 },
    { ...zu1, x: 0, y: 0 },
    { ...zu2, x: 0, y: 1 },
    { ...zu3, x: 3, y: 0 },
    { ...zu4, x: 3, y: 1 },
    { ...zhangfei, x: 0, y: 2 },
    { ...zhaoyun, x: 3, y: 2 },
    { ...guanyu, x: 1, y: 2 },
    { ...machao, x: 1, y: 3 },
    { ...huangzhong, x: 2, y: 3 }
  ],
  '雨声淅沥': [
    { ...caocao, x: 1, y: 0 },
    { ...zhangfei, x: 0, y: 0 },
    { ...zu1, x: 3, y: 0 },
    { ...zu2, x: 3, y: 1 },
    { ...zhaoyun, x: 0, y: 2 },
    { ...guanyu, x: 1, y: 2 },
    { ...machao, x: 3, y: 2 },
    { ...huangzhong, x: 1, y: 3 },
    { ...zu3, x: 0, y: 4 },
    { ...zu4, x: 3, y: 4 }
  ],
  '桃花园中': [
    { ...caocao, x: 1, y: 0 },
    { ...zhangfei, x: 0, y: 1 },
    { ...zhaoyun, x: 3, y: 1 },
    { ...zu1, x: 0, y: 0 },
    { ...zu2, x: 3, y: 0 },
    { ...huangzhong, x: 1, y: 2 },
    { ...machao, x: 2, y: 2 },
    { ...zu3, x: 0, y: 3 },
    { ...zu4, x: 3, y: 3 },
    { ...guanyu, x: 1, y: 4 }
  ],
  '捷足先登': [
    { ...caocao, x: 1, y: 0 },
    { ...zu1, x: 0, y: 0 },
    { ...zu2, x: 3, y: 0 },
    { ...zu3, x: 0, y: 1 },
    { ...zu4, x: 3, y: 1 },
    { ...guanyu, x: 1, y: 2 },
    { ...zhangfei, x: 0, y: 3 },
    { ...zhaoyun, x: 1, y: 3 },
    { ...machao, x: 2, y: 3 },
    { ...huangzhong, x: 3, y: 3 }
  ],
  '围而不歼': [
    { ...caocao, x: 1, y: 0 },
    { ...zhangfei, x: 0, y: 0 },
    { ...machao, x: 0, y: 2 },
    { ...zu1, x: 3, y: 0 },
    { ...zu2, x: 3, y: 1 },
    { ...zu3, x: 3, y: 2 },
    { ...zu4, x: 3, y: 3 },
    { ...guanyu, x: 1, y: 2 },
    { ...zhaoyun, x: 1, y: 3 },
    { ...huangzhong, x: 2, y: 3 }
  ],
  '将守角楼': [
    { ...caocao, x: 1, y: 0 },
    { ...zhangfei, x: 0, y: 0 },
    { ...zhaoyun, x: 3, y: 0 },
    { ...guanyu, x: 1, y: 2 },
    { ...zu1, x: 0, y: 2 },
    { ...zu2, x: 3, y: 2 },
    { ...machao, x: 0, y: 3 },
    { ...huangzhong, x: 3, y: 3 },
    { ...zu3, x: 1, y: 3 },
    { ...zu4, x: 2, y: 3 }
  ],
  '屯兵东路': [
    { ...caocao, x: 0, y: 0 },
    { ...zhangfei, x: 2, y: 0 },
    { ...zhaoyun, x: 3, y: 0 },
    { ...guanyu, x: 0, y: 2 },
    { ...machao, x: 0, y: 3 },
    { ...huangzhong, x: 1, y: 3 },
    { ...zu1, x: 2, y: 2 },
    { ...zu2, x: 3, y: 2 },
    { ...zu3, x: 2, y: 3 },
    { ...zu4, x: 3, y: 3 }
  ],
  '简易': [
    { ...zu1, x: 0, y: 0 },
    // { ...caocao, x: 1, y: 0 },
    { ...caocao, x: 1, y: 2 },
    { ...zu2, x: 3, y: 0 },
    { ...zhangfei, x: 0, y: 1 },
    { ...guanyu, x: 1, y: 0 },
    { ...zhaoyun, x: 3, y: 1 },
    { ...machao, x: 0, y: 3 },
    { ...zu3, x: 1, y: 1 },
    { ...zu4, x: 2, y: 1 },
    { ...huangzhong, x: 3, y: 3 }
  ],
};

export const levels: Level[] = [
  { id: '横刀立马', name: '横刀立马', difficulty: '高级', minSteps: 81, pieces: dataSet['横刀立马'] },
  { id: '将拥曹营', name: '将拥曹营', difficulty: '初级', minSteps: 72, pieces: dataSet['将拥曹营'] },
  { id: '齐头并进', name: '齐头并进', difficulty: '中级', minSteps: 60, pieces: dataSet['齐头并进'] },
  { id: '指挥若定', name: '指挥若定', difficulty: '中级', minSteps: 70, pieces: dataSet['指挥若定'] },
  { id: '兵分两路', name: '兵分两路', difficulty: '高级', minSteps: 72, pieces: dataSet['兵分两路'] },
  { id: '兵临城下', name: '兵临城下', difficulty: '初级', minSteps: 54, pieces: dataSet['兵临城下'] },
  { id: '一路进军', name: '一路进军', difficulty: '初级', minSteps: 58, pieces: dataSet['一路进军'] },
  { id: '一路顺风', name: '一路顺风', difficulty: '初级', minSteps: 39, pieces: dataSet['一路顺风'] },
  { id: '兵临曹营', name: '兵临曹营', difficulty: '初级', minSteps: 34, pieces: dataSet['兵临曹营'] },
  { id: '雨声淅沥', name: '雨声淅沥', difficulty: '初级', minSteps: 47, pieces: dataSet['雨声淅沥'] },
  { id: '桃花园中', name: '桃花园中', difficulty: '初级', minSteps: 70, pieces: dataSet['桃花园中'] },
  { id: '捷足先登', name: '捷足先登', difficulty: '初级', minSteps: 32, pieces: dataSet['捷足先登'] },
  { id: '围而不歼', name: '围而不歼', difficulty: '初级', minSteps: 62, pieces: dataSet['围而不歼'] },
  { id: '将守角楼', name: '将守角楼', difficulty: '初级', minSteps: 100, pieces: dataSet['将守角楼'] },
  { id: '屯兵东路', name: '屯兵东路', difficulty: '初级', minSteps: 102, pieces: dataSet['屯兵东路'] },
  { id: '简易', name: '简易', difficulty: '初级', pieces: dataSet['简易'] },
];


