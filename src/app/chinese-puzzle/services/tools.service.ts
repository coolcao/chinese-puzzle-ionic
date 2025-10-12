import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class ToolsService {
  deepClone<T>(obj: T): T {
    if (typeof obj !== 'object' || obj === null) {
      // primitive type
      return obj;
    }

    const cloneObj: any = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          // reference type
          cloneObj[key] = this.deepClone(obj[key]);
        } else {
          // primitive type
          cloneObj[key] = obj[key];
        }
      }
    }
    return cloneObj;
  }
}
