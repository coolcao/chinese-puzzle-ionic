import { Injectable } from '@angular/core';
import { ImagePreloaderService } from './image-preloader.service';
import { PieceImageService } from './piece-image.service';
import { Piece } from '../chinese-puzzle.type';

@Injectable({
  providedIn: 'root'
})
export class ImageLoadingService {
  // 图片资源 (key: imageUrl, value: ImageElement)
  private pieceImages: Map<string, HTMLImageElement> = new Map();
  private woodDarkImage: HTMLImageElement | null = null;
  private woodLightImage: HTMLImageElement | null = null;

  private resourceLoading = false;

  constructor(
    private imagePreLoader: ImagePreloaderService,
    private pieceImageService: PieceImageService
  ) { }

  // 获取棋子图片
  getPieceImage(imageUrl: string): HTMLImageElement | undefined {
    return this.pieceImages.get(imageUrl);
  }

  // 获取木质深色图片
  getWoodDarkImage(): HTMLImageElement | null {
    return this.woodDarkImage;
  }

  // 获取木质浅色图片
  getWoodLightImage(): HTMLImageElement | null {
    return this.woodLightImage;
  }

  // 检查资源是否正在加载
  isResourceLoading(): boolean {
    return this.resourceLoading;
  }

  // 预加载图片
  preLoadImage(pieces: Piece[]): Promise<{ pieceImages: Map<string, HTMLImageElement>, woodDarkImage: HTMLImageElement | null, woodLightImage: HTMLImageElement | null }> {
    this.resourceLoading = true;

    // 清空之前的图片缓存
    this.pieceImages.clear();
    this.woodDarkImage = null;
    this.woodLightImage = null;

    return new Promise((resolve) => {
      // 获取所有需要预加载的图片路径（现在包含所有棋子图片）
      const allImageUrls = this.pieceImageService.getAllRequiredImagePaths(pieces);
      
      // 添加背景纹理图片到预加载列表
      const backgroundImages = [
        'assets/img/wood_dark.png',
        'assets/img/wood_light.png',
        'assets/img/wood-pattern.png'
      ];
      
      // 合并所有图片路径
      const allImagesToLoad = [...allImageUrls, ...backgroundImages];
      
      if (!allImagesToLoad || allImagesToLoad.length == 0) {
        this.resourceLoading = false;
        // 即使没有图片也要resolve
        requestAnimationFrame(() => {
          resolve({
            pieceImages: this.pieceImages,
            woodDarkImage: this.woodDarkImage,
            woodLightImage: this.woodLightImage
          });
        });
        return;
      }

      // 统一加载所有图片（棋子图片 + 背景图片）
      let loadedImages = 0;
      const totalImages = allImagesToLoad.length;

      allImagesToLoad.forEach(imageUrl => {
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => {
          // 根据图片类型分别存储
          if (imageUrl.includes('wood_dark.png')) {
            this.woodDarkImage = img;
          } else if (imageUrl.includes('wood_light.png')) {
            this.woodLightImage = img;
          } else {
            // 棋子图片和其他图片统一存储到pieceImages中
            this.pieceImages.set(imageUrl, img);
          }
          
          loadedImages++;
          // 所有图片加载完成后resolve
          if (loadedImages === totalImages) {
            this.resourceLoading = false;
            // 使用requestAnimationFrame确保在下次重绘之前执行
            requestAnimationFrame(() => {
              resolve({
                pieceImages: this.pieceImages,
                woodDarkImage: this.woodDarkImage,
                woodLightImage: this.woodLightImage
              });
            });
          }
        };
        img.onerror = () => {
          console.warn(`图片加载失败: ${imageUrl}`);
          loadedImages++;
          // 即使有图片加载失败也要resolve
          if (loadedImages === totalImages) {
            this.resourceLoading = false;
            // 使用requestAnimationFrame确保在下次重绘之前执行
            requestAnimationFrame(() => {
              resolve({
                pieceImages: this.pieceImages,
                woodDarkImage: this.woodDarkImage,
                woodLightImage: this.woodLightImage
              });
            });
          }
        };
      });
    });
  }
}