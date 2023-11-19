import { FileSystemTree, WebContainer } from "@webcontainer/api";
import { v4 as uuid } from "uuid";
import { DirectoryInterface, FileInterface, DataNode } from "../types";
/**
 * 创建目录结构
 * @param path 路径
 * @param webcontainerInstance
 * @returns
 */
export function createDir(path: string, webcontainerInstance: WebContainer) {
  return webcontainerInstance?.fs.mkdir(path, {
    recursive: true,
  });
}

/**
 * 在制定路径中写入文件内容
 * @param path 文件路径
 * @param content 最新内容
 * @param webcontainerInstance 实例
 * @returns
 */
export function writeFile(
  path: string,
  content: string | Uint8Array,
  webcontainerInstance: WebContainer,
) {
  return webcontainerInstance?.fs.writeFile(path, content, {
    encoding: "utf-8",
  });
}

/**
 * 创建文件
 * @param path 路径
 * @param webcontainerInstance
 * @returns
 */
export function createFile(path: string, webcontainerInstance: WebContainer) {
  return writeFile(path, "", webcontainerInstance);
}

/**
 * 将本地文件写入 webContainer 系统
 * @param dir
 * @param webcontainerInstance
 * @returns
 */
export async function writeDirByLocal(
  dir: any,
  webcontainerInstance: WebContainer,
) {
  if (dir.kind === "file") {
    // 如果是文件，直接写入内容
    await writeFile(dir.path, dir.content ?? "", webcontainerInstance);
    return;
  }
  // 否则先创建目录
  await createDir(dir.path, webcontainerInstance);
  // 遍历children，递归处理，children
  for (const file of dir.children) {
    await writeDirByLocal(file, webcontainerInstance);
  }
}

/**
 * 删除目录和文件
 * @param path 路径
 * @param webcontainerInstance
 * @returns
 */
export function rm(path: string, webcontainerInstance: WebContainer) {

  return webcontainerInstance?.fs.rm(path, { force: true, recursive: true });
}

/**
 * 读取文件内容
 * @param path 文件路径
 * @param webcontainerInstance 实例
 * @returns 文件内容
 */
export async function readFile(
  path: string,
  webcontainerInstance: WebContainer,
) {
  const u8 = await webcontainerInstance?.fs.readFile(path, "utf-8");
  return u8;
}

/**
 * 读取 instance 文件 中的内容，并转换成制定文件对象
 * @param webcontainerInstance
 * @param path
 * @returns 文件内容对象
 */
export async function readLocalTypeFile (
  webcontainerInstance: WebContainer,
  path: string,
): Promise<FileInterface> {
  return {
    name: path.split('/').splice(-1, 1)?.[0] || '',
    path,
    content: await webcontainerInstance?.fs.readFile(path, "utf-8"),
    kind: 'file'
  }
}

/**
 * 重命名文件和目录
 * @param path 路径
 * @param name 新名字
 * @param webcontainerInstance
 */
export async function renameFile(
  path: string,
  name: string,
  webcontainerInstance: WebContainer,
) {
  const content = await readFile(path, webcontainerInstance);
  await rm(path, webcontainerInstance);

  const newPath = [...path.split("/").slice(0, -1), name].join("/");

  await writeFile(newPath, content, webcontainerInstance);
}

/**
 * 读取instance中的文件，转换成制定结构，渲染目录结构
 * @param webcontainerInstance
 * @param path
 * @returns
 */
export async function readFileSystem(
  webcontainerInstance: WebContainer,
  path = "/",
): Promise<DataNode[]> {
  const dirs = await webcontainerInstance?.fs.readdir(path, {
    withFileTypes: true,
  });

  return Promise.all(
    dirs.map(async item => ({
      key: uuid(),
      title: item.name,
      isLeaf: item.isFile(),
      children: item.isDirectory()
        ? await readFileSystem(webcontainerInstance, `${path}/${item.name}`)
        : undefined,
    })),
  );
}

/**
 * 将数据转换成 webcontainer 内置 FileSystemTree 格式
 * @param webcontainerInstance
 * @param path
 * @returns
 */
async function readAsFileSystemTree(
  webcontainerInstance: WebContainer,
  path = "/",
): Promise<FileSystemTree> {
  const dirs = await webcontainerInstance?.fs.readdir(path, {
    withFileTypes: true,
  });

  console.log('readAsFileSystemTree', dirs)
  const arrayTree = await Promise.all(
    dirs
      .filter(item => !(item.isDirectory() && item.name === "node_modules"))
      .map(async item => ({
        name: item.name,
        contents: item.isFile()
          ? await readFile(`${path}/${item.name}`, webcontainerInstance)
          : undefined,
        directory: item.isDirectory()
          ? await readAsFileSystemTree(
              webcontainerInstance,
              `${path}/${item.name}`,
            )
          : undefined,
      })),
  );

  return arrayTree.reduce(
    (tree, { name, contents, directory }) => ({
      ...tree,
      [name]: directory
        ? {
            directory,
          }
        : {
            file: { contents },
          },
    }),
    {},
  );
}

/**
 * 读取 instance 中的文件树，转换格式
 * @param webcontainerInstance
 * @param path 读取路径
 * @returns 制定格式的读取结果 {}
 */
export async function readLocalTypeFileTree(webcontainerInstance: WebContainer, path: string = "/"): Promise<DirectoryInterface> {
  const dirs = await webcontainerInstance?.fs.readdir(path, {
    withFileTypes: true,
  });
  console.log('dirs 999', dirs)
  const children: (FileInterface | DirectoryInterface)[] = []

  for (const item of dirs) {
    if (item.isFile()) {
      children.push(await readLocalTypeFile(webcontainerInstance, `${path === '/' ? '/' : `${path}/`}${item.name}`))
    } else if (item.isDirectory()) {
      children.push(await readLocalTypeFileTree(webcontainerInstance, `${path === '/' ? '/' : `${path}/`}${item.name}`))
    }
  }

  return {
    name: path.split('/').splice(-1, 1)?.[0] || 'project',
    path: `${path}`,
    kind: 'directory',
    children
  }
}

export async function saveFileSystemTree(webcontainerInstance: WebContainer) {
  const tree =
    webcontainerInstance && (await readAsFileSystemTree(webcontainerInstance));
  return tree
}
