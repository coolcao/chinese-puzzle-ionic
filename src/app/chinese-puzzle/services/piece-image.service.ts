import { Injectable } from '@angular/core';
import { Piece } from '../chinese-puzzle.type';

@Injectable({
  providedIn: 'root'
})
export class PieceImageService {

  constructor() { }

  /**
   * 根据棋子的实际尺寸获取正确的图片路径
   * @param piece 棋子对象
   * @returns 正确的图片路径
   */
  getCorrectImagePath(piece: Piece): string {
    // 获取棋子名称的基础部分（移除数字后缀）
    const baseName = piece.name.replace(/[0-9]$/, ''); // 移除可能的数字后缀（如卒1 -> 卒）
    
    // 检查是否是需要特殊处理的角色（有横竖两个版本的图片）
    const specialCharacters = ['张飞', '马超', '关羽', '赵云', '黄忠'];
    
    if (specialCharacters.some(char => baseName.includes(char))) {
      // 根据棋子的实际尺寸确定正确的图片名称
      const sizeCode = `${piece.width}${piece.height}`;
      return `assets/img/chinese-puzzle/${baseName}${sizeCode}.png`;
    }
    
    // 对于其他角色（如曹操、卒等），直接使用原始图片路径
    return piece.img || `assets/img/chinese-puzzle/${baseName}.png`;
  }

  /**
   * 获取所有可能需要预加载的图片路径（预加载全部棋子图片）
   * @param pieces 棋子数组（此参数现在只用于兼容性，实际会加载所有图片）
   * @returns 需要预加载的图片路径数组
   */
  getAllRequiredImagePaths(pieces: Piece[]): string[] {
    const imageUrls = new Set<string>();
    
    // 定义所有可能的棋子类型和它们的图片
    const allPieceConfigs = [
      // 曹操 - 只有一个版本
      { name: '曹操', sizes: [''] },
      
      // 小兵 - 只有一个版本  
      { name: '卒', sizes: [''] },
      
      // 五虎上将 - 每个都有横竖两个版本
      { name: '张飞', sizes: ['12', '21'] },
      { name: '马超', sizes: ['12', '21'] },
      { name: '关羽', sizes: ['12', '21'] },
      { name: '赵云', sizes: ['12', '21'] },
      { name: '黄忠', sizes: ['12', '21'] }
    ];
    
    // 预加载所有棋子的所有版本图片
    allPieceConfigs.forEach(config => {
      config.sizes.forEach(size => {
        const imageUrl = `assets/img/chinese-puzzle/${config.name}${size}.png`;
        imageUrls.add(imageUrl);
      });
    });
    
    // 还要添加当前关卡中明确指定的图片路径（保持兼容性）
    pieces.filter(p => !!p.img).forEach(piece => {
      imageUrls.add(piece.img!);
    });
    
    return Array.from(imageUrls);
  }

  /**
   * 获取棋子的备用图片路径列表（用于回退）
   * @param piece 棋子对象
   * @returns 备用图片路径数组，按优先级排序
   */
  getFallbackImagePaths(piece: Piece): string[] {
    const baseName = piece.name.replace(/[0-9]$/, '');
    const specialCharacters = ['张飞', '马超', '关羽', '赵云', '黄忠'];
    
    if (specialCharacters.some(char => baseName.includes(char))) {
      const currentSizeCode = `${piece.width}${piece.height}`;
      const alternateSizes = ['12', '21'];
      const fallbackPaths: string[] = [];
      
      // 首先添加正确尺寸的图片
      fallbackPaths.push(`assets/img/chinese-puzzle/${baseName}${currentSizeCode}.png`);
      
      // 然后添加其他尺寸作为回退
      alternateSizes.forEach(size => {
        if (size !== currentSizeCode) {
          fallbackPaths.push(`assets/img/chinese-puzzle/${baseName}${size}.png`);
        }
      });
      
      return fallbackPaths;
    }
    
    // 对于其他角色，只返回原始图片路径
    return piece.img ? [piece.img] : [`assets/img/chinese-puzzle/${baseName}.png`];
  }

  /**
   * 为棋子数组设置正确的图片路径
   * @param pieces 棋子数组
   * @returns 更新后的棋子数组
   */
  updatePiecesImagePaths(pieces: Piece[]): Piece[] {
    return pieces.map(piece => ({
      ...piece,
      img: this.getCorrectImagePath(piece)
    }));
  }
}