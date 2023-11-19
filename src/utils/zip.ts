import jszip from 'jszip';
import { DirectoryInterface, EmptyFileInterface, FilerInterface, isDirectory, isFiler } from '../types';
import { OutputType as OT, JSZipGeneratorOptions as JO, OnUpdateCallback as OC } from 'jszip'

export interface OutputByType {
  base64: string;
  string: string;
  text: string;
  binarystring: string;
  array: number[];
  uint8array: Uint8Array;
  arraybuffer: ArrayBuffer;
  blob: Blob;
  nodebuffer: Buffer;
}

export class Zip {
  zip: jszip;
  constructor () {
    this.zip = new jszip();
  }
  public addFile (file: EmptyFileInterface | FilerInterface) {
    if ('content' in file) {
      this.zip.file(file.path, file.content);
    } else {
      this.zip.file(file.path, '');
    }
    return this
  }

  public addFolder(path: string) {
    this.zip.folder(path);
    return this
  }

  public addDirectory (directory: DirectoryInterface) {

    const { path, children } = directory
    this.zip.folder(path)
    const stack = [...children]
    while (stack.length) {
      const cur = stack.shift()!
      if (isFiler(cur)) {
        this.addFile(cur)
      } else if (isDirectory(cur)) {
        this.addFolder(cur.path)
        stack.push(...cur.children)
      }
    }
    return this
  }

  public generateAsync <T extends OT = 'blob'>(options?: JO<T>, onUpdate?: OC): Promise<OutputByType[T] | undefined> {
    try {
      return this.zip.generateAsync(options, onUpdate)
    } catch (error) {
      console.log(error);
      return Promise.resolve(undefined)
    }
  }

  public async downloadZip () {
    const zipFile = await this.generateAsync<'blob'>({ type: 'blob' })
    if (!zipFile) {
      return ''
    }
    return window.URL.createObjectURL(zipFile)
  }
}

