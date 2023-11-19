import { DirectorySuperInterface, FilerInterface } from "../types";

export const DirectoryKeySet = new Set(); // 预留对象，多文件夹加载可用
export const DirectoryMap = new Map(); // 预留对象，多文件夹加载可用
export let curDirectory: null | FilerInterface | DirectorySuperInterface = null; // 当前目录

/**
 * 读取本地文件目录及内容
 * @param id 文件路径
 * @returns 读取到的目录结构
 */
export const getDirectory = async (
  id?: string | symbol,
): Promise<DirectorySuperInterface | FilerInterface | null> => {
  let DirectoryHandler: FileSystemFileHandle | FileSystemDirectoryHandle | null;
  try {
    // @ts-ignore
    DirectoryHandler = await window.showDirectoryPicker({
      id,
      mode: "readwrite",
    });
  } catch (error) {
    DirectoryHandler = null;
  }
  if (DirectoryHandler !== null) {
    // 打开的当前文件夹目录 { kind: 'directory', name: 'xxx' }
    const directory = await getDirectoryHandlerDeep(DirectoryHandler);
    curDirectory = directory;
    return directory;
  }

  return null;
};

/**
 * 读取文件对象内容
 * @param file 文件对象
 * @returns
 */
export const getFileContent = (file: File): Promise<string> => {
  return new Promise(resolve => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      resolve(<string>fileReader.result);
    };
    fileReader.readAsText(file, "utf-8");
  });
};

/**
 * 格式化目录结构
 * @param directoryHandler 目录对象
 * @param path 路径
 * @param children
 * @returns 处理之后的目录结构
 */
export const directoryDataFormatter = async <
  T extends FileSystemDirectoryHandle | FileSystemFileHandle,
>(
  directoryHandler: T,
  path: string = "",
  children: (FilerInterface | DirectorySuperInterface)[] = [],
): Promise<
  T extends FileSystemDirectoryHandle ? FilerInterface : DirectorySuperInterface
> => {
  const obj: any = {
    handler: directoryHandler,
    name: directoryHandler.name,
    kind: directoryHandler.kind,
    path,
  };

  if (
    (directoryHandler.kind === "directory" &&
      directoryHandler.name !== "node_modules") ||
    (directoryHandler.kind === "directory" &&
      directoryHandler.name !== "node_modules")
  ) {
    obj.children = children;
  } else if (directoryHandler.kind === "file") {
    obj.content =
      (await getFileContent(await directoryHandler.getFile())) || "";
  }
  return obj;
};

/**
 * 递归遍历目录
 * @param directoryHandler
 * @param path
 * @returns
 */
export const getDirectoryHandlerDeep = async (
  directoryHandler: FileSystemDirectoryHandle | FileSystemFileHandle,
  path: string = "",
): Promise<DirectorySuperInterface | FilerInterface> => {
  // 需要被处理的文件夹路径
  path = `${path}/${directoryHandler.name}`;
  // 如果是文件，将内容格式化
  if (directoryHandler.kind === "file") {
    return await directoryDataFormatter(directoryHandler, path);
  }

  const children = [];
  // @ts-ignore
  for await (const handler of directoryHandler?.values()) {
    if (
      (handler.kind === "directory" && handler.name === "node_modules") ||
      (handler.kind === "directory" && handler.name === ".git")
    ) {
      continue;
    }

    children.push(await getDirectoryHandlerDeep(handler, path));
  }
  return await directoryDataFormatter(directoryHandler, path, children);
};

export const clearCurDirectory = () => {
  curDirectory = null
}
