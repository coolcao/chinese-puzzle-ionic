import { Piece } from "./chinese-puzzle.type";

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
