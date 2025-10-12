import { Injectable } from '@angular/core';
import { ImagePreloaderService } from './image-preloader.service';
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

  constructor(private imagePreLoader: ImagePreloaderService) { }

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
      // 预加载木质纹理图片
      const woodDarkImg = new Image();
      woodDarkImg.src = 'assets/img/wood_dark.png';
      woodDarkImg.onload = () => {
        this.woodDarkImage = woodDarkImg;
        // 如果棋子图片已经加载完成，则resolve
        if (!this.resourceLoading) {
          resolve({
            pieceImages: this.pieceImages,
            woodDarkImage: this.woodDarkImage,
            woodLightImage: this.woodLightImage
          });
        }
      };
      woodDarkImg.onerror = () => {
        // 即使wood dark图片加载失败也要resolve
        if (!this.resourceLoading) {
          resolve({
            pieceImages: this.pieceImages,
            woodDarkImage: this.woodDarkImage,
            woodLightImage: this.woodLightImage
          });
        }
      };

      const woodLightImg = new Image();
      woodLightImg.src = 'assets/img/wood_light.png';
      woodLightImg.onload = () => {
        this.woodLightImage = woodLightImg;
        // 如果棋子图片已经加载完成，则resolve
        if (!this.resourceLoading) {
          resolve({
            pieceImages: this.pieceImages,
            woodDarkImage: this.woodDarkImage,
            woodLightImage: this.woodLightImage
          });
        }
      };
      woodLightImg.onerror = () => {
        // 即使wood light图片加载失败也要resolve
        if (!this.resourceLoading) {
          resolve({
            pieceImages: this.pieceImages,
            woodDarkImage: this.woodDarkImage,
            woodLightImage: this.woodLightImage
          });
        }
      };

      // 预加载棋子图片
      const imageUrls = [...new Set(pieces.filter(p => !!p.img).map(piece => piece.img!))];
      if (!imageUrls || imageUrls.length == 0) {
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

      this.imagePreLoader.preloadImages(imageUrls).then(success => {
        if (success) {
          // 加载成功后，为每个棋子创建图片对象
          let loadedImages = 0;
          const totalImages = imageUrls.length;

          imageUrls.forEach(imageUrl => {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
              this.pieceImages.set(imageUrl, img);
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
        } else {
          console.error('图片预加载失败');
          this.resourceLoading = false;
          // 即使预加载失败也要resolve
          requestAnimationFrame(() => {
            resolve({
              pieceImages: this.pieceImages,
              woodDarkImage: this.woodDarkImage,
              woodLightImage: this.woodLightImage
            });
          });
        }
      });
    });
  }
}