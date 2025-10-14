# 三国华容道项目文档

## 项目概述

三国华容道是一款基于Ionic和Angular开发的移动端/桌面端益智游戏，实现了经典的中国古代华容道游戏。玩家需要通过移动不同大小的棋子，最终将曹操（2x2的大棋子）移动到棋盘底部的出口位置。

## 技术栈

### 前端框架
- **Angular 19** - 主要前端框架
- **Ionic 8** - 移动端UI框架和原生功能集成
- **Capacitor 7** - 原生应用打包和设备API访问

### UI/样式
- **Tailwind CSS 3** - CSS框架，提供响应式和暗色模式支持
- **Angular Material CDK** - 拖拽功能支持

### 游戏引擎
- **Fabric.js 6.7** - Canvas绘图库，用于游戏棋盘和棋子的渲染

### 状态管理
- **Angular Signals** - 响应式状态管理

### 数据存储
- **Ionic Storage** - 基于IndexedDB和LocalStorage的本地存储

### 音效
- **Howler.js** - 音频播放库

### 开发工具
- **TypeScript** - 类型安全的JavaScript
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化
- **Karma/Jasmine** - 单元测试

## 项目结构

```
src/
├── app/                          # 应用程序主模块
│   ├── app.module.ts             # 根模块
│   ├── app-routing.module.ts     # 根路由
│   ├── app.component.*           # 根组件
│   └── chinese-puzzle/           # 游戏功能模块
│       ├── chinese-puzzle.module.ts      # 游戏模块
│       ├── chinese-puzzle-routing.module.ts # 游戏路由
│       ├── chinese-puzzle.store.ts       # 状态管理
│       ├── chinese-puzzle.type.ts        # 类型定义
│       ├── components/              # 通用组件
│       │   ├── level-preview/      # 关卡预览组件
│       │   └── scatter-flowers/    # 撒花效果组件
│       ├── data/                   # 游戏数据
│       │   ├── data-set.ts         # 关卡数据定义
│       │   └── tutorial-data.ts    # 教程数据
│       ├── directives/             # 指令
│       │   └── click-sound.directive.ts # 点击音效指令
│       ├── pages/                  # 页面组件
│       │   ├── home/               # 首页
│       │   ├── level-select/       # 关卡选择
│       │   ├── chinese-puzzle-board/ # 基础游戏棋盘（CDK拖拽）
│       │   ├── game-board-fabric/  # Fabric.js游戏棋盘
│       │   └── level-generator/    # 关卡生成器
│       └── services/               # 服务层
│           ├── audio.service.ts    # 音效管理
│           ├── canvas-drawing.service.ts # Canvas绘图
│           ├── canvas-resize.service.ts # Canvas尺寸调整
│           ├── game-management.service.ts # 游戏管理
│           ├── game-storage.service.ts # 游戏存储
│           ├── image-loading.service.ts # 图片加载
│           ├── image-preloader.service.ts # 图片预加载
│           ├── piece-image.service.ts # 棋子图片管理
│           ├── piece-movement.service.ts # 棋子移动逻辑
│           └── tools.service.ts    # 工具函数
├── assets/                        # 静态资源
│   ├── audios/                    # 音效文件
│   ├── img/chinese-puzzle/        # 棋子图片
│   └── icons/                     # 应用图标
├── environments/                  # 环境配置
└── global.css                     # 全局样式
```

## 核心功能模块

### 1. 状态管理 (ChinesePuzzleStore)

使用Angular Signals实现响应式状态管理，主要管理：

- **游戏状态**：棋盘状态、棋子位置、游戏完成状态
- **用户设置**：暗色模式、音效开关、震动开关等
- **关卡数据**：当前关卡、关卡列表
- **棋盘尺寸**：4x5的标准华容道棋盘

```typescript
// 核心状态信号
private _pieces = signal<Piece[]>([]);
private _board = signal<string[][]>([]);
private _settings = signal<UserSettings>({...});
```

### 2. 游戏引擎

项目实现了两套游戏引擎：

#### a) 基于CDK拖拽的实现 (ChinesePuzzleBoardComponent)
- 使用Angular Material CDK的拖拽功能
- 适合简单的拖拽交互
- 响应式布局，支持PC和移动端

#### b) 基于Fabric.js的实现 (GameBoardFabricComponent)
- 使用Canvas渲染，性能更好
- 支持更复杂的动画效果
- 包含三个核心服务：
  - `FabricGameService` - 游戏主逻辑
  - `FabricDrawingService` - 绘图功能
  - `FabricInteractionService` - 交互处理

### 3. 游戏数据管理

#### 关卡系统
- 定义在`data-set.ts`中，包含18个经典关卡
- 每个关卡有独立的棋子布局和难度评级
- 支持教程关卡，引导新玩家

#### 教程系统
- 分步骤引导玩家学习游戏规则
- 支持高亮、动画演示和交互式学习
- 记录教程完成状态

### 4. 存储系统 (GameStorageService)

使用Ionic Storage实现数据持久化：

- **用户设置**：保存用户的个性化设置
- **游戏进度**：记录每个关卡的完成情况
- **游戏历史**：保存每次游戏的详细记录
- **游戏统计**：计算总游戏时间、步数、连续天数等

### 5. 音效系统 (AudioService)

基于Howler.js实现音效管理：

- **音效类型**：点击音、成功音、失败音、移动音等
- **音效控制**：支持全局开关和音量调节
- **预加载机制**：确保音效播放流畅

## 页面功能

### 1. 首页 (HomeComponent)
- 游戏入口
- 设置面板（暗色模式、音效、震动等）
- 游戏说明
- 教程关卡引导

### 2. 关卡选择 (LevelSelectComponent)
- 显示所有可用关卡
- 关卡难度标识
- 完成状态显示
- 快速进入关卡

### 3. 游戏棋盘 (GameBoardFabricComponent)
**主要功能：**
- 棋盘和棋子渲染
- 拖拽移动棋子
- 移动规则验证
- 游戏完成检测
- 撒花庆祝效果

**特色功能：**
- 响应式设计，自适应不同屏幕尺寸
- 支持PC和移动端不同交互方式
- 暗色模式适配
- 教程模式支持

### 4. 关卡生成器 (LevelGeneratorComponent)
- 自定义关卡编辑功能
- 可视化关卡设计
- 关卡测试功能

## 核心算法

### 1. 棋子移动验证
```typescript
canMove(piece: Piece, direction: Direction): boolean {
  // 1. 检查边界
  // 2. 检查目标位置是否被占用
  // 3. 返回是否可移动
}
```

### 2. 游戏完成检测
```typescript
finished = computed(() => {
  const caocao = this.pieces().find(p => p.name == '曹操');
  return caocao && caocao.x == 1 && caocao.y == 3;
});
```

### 3. 响应式尺寸计算
根据屏幕尺寸动态计算棋盘和棋子大小：
- PC端：考虑侧边栏和信息卡片
- 移动端：全屏适配，考虑不同设备尺寸

## 样式系统

### 1. 主题色彩
- **木质主题**：采用木质纹理色彩，符合古代华容道的视觉风格
- **暗色模式**：提供深色木质配色，保护眼睛

### 2. 响应式设计
- 使用Tailwind CSS的响应式类
- 断点设计：移动端(<1024px)和PC端(≥1024px)
- 自适应棋盘尺寸

### 3. 动画效果
- 棋子移动动画
- 完成游戏撒花效果
- 教程高亮动画

## 数据模型

### 1. 棋子 (Piece)
```typescript
interface Piece {
  id: number;
  name: string;        // 棋子名称（曹操、关羽等）
  width: number;       // 占用列数
  height: number;      // 占用行数
  x: number;          // 起始列
  y: number;          // 起始行
  img?: string;       // 棋子图片路径
}
```

### 2. 用户设置 (UserSettings)
```typescript
interface UserSettings {
  isDarkMode: boolean;
  smoothDragMode: boolean;
  soundEffectsEnabled: boolean;
  backgroundMusicEnabled: boolean;
  vibrationEnabled: boolean;
  tutorialCompleted: boolean;
}
```

### 3. 游戏进度 (GameProgress)
```typescript
interface GameProgress {
  levelId: string;
  isCompleted: boolean;
  bestSteps: number;
  bestTime: number;
  completedAt: string;
  attempts: number;
  stars: number; // 1-3星评价
}
```

## 开发指南

### 1. 添加新关卡
1. 在`data-set.ts`中添加新的关卡数据
2. 在`levels`数组中添加关卡信息
3. 如需教程，在`tutorial-data.ts`中定义教程步骤

### 2. 修改游戏规则
- 棋子移动逻辑：`piece-movement.service.ts`
- 游戏完成条件：`chinese-puzzle.store.ts`
- 棋盘尺寸：修改`_boardWidth`和`_boardHeight`信号

### 3. 添加新音效
1. 将音效文件放入`assets/audios/`目录
2. 在`audio.service.ts`中注册新音效
3. 在需要的地方调用播放方法

### 4. 样式修改
- 主要样式在`global.css`和各组件的样式文件中
- 使用Tailwind CSS类进行快速样式开发
- 木质色彩在`tailwind.config.js`中定义

## 构建和部署

### 开发环境
```bash
npm start
# 或
yarn start
```

### 生产构建
```bash
npm run build
# 或
yarn build
```

### 移动端构建
```bash
# 生成资源
yarn assets-gen

# Android构建
npm run cap:android

# iOS构建
npm run cap:ios
```

## 注意事项

1. **性能优化**：Fabric.js版本在移动端性能更好，推荐使用
2. **存储限制**：Ionic Storage有存储大小限制，历史记录可能会被清理
3. **图片资源**：棋子图片需要提前预加载，避免游戏时延迟
4. **响应式设计**：测试时需要在PC和移动端不同尺寸下验证
5. **音效加载**：首次加载可能需要时间，建议添加加载提示

## 扩展功能建议

1. **多人对战**：添加在线对战功能
2. **关卡分享**：支持自定义关卡的分享和导入
3. **排行榜**：全球或好友排行榜
4. **成就系统**：添加游戏成就和奖励
5. **主题系统**：更多视觉主题选择
6. **云存储**：游戏进度云端同步

---

文档最后更新时间：2025年10月14日