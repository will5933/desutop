export async function getWallpaperFilesPathArr() {
    const { BaseDirectory, readDir } = window.__TAURI_PLUGIN_FS__;

    const baseDirectoryEntries = await readDir('wallpapers', { baseDir: BaseDirectory.Resource });
    const wallpaperFileArr = [];

    // appdata
    await processEntriesRecursive('wallpapers', baseDirectoryEntries);

    async function processEntriesRecursive(parent, entries) {
        for (const entry of entries) {
            if (entry.isFile && /\.(jpg|jpeg|png|webp|JPG|JPEG|PNG|WEBP)$/.test(entry.name)) {
                wallpaperFileArr.push(`${parent}/${entry.name}`);
            }
            else if (entry.isDirectory) {
                const dir = `${parent}/${entry.name}`;
                processEntriesRecursive(dir, await readDir(dir, { baseDir: BaseDirectory.Resource }))
            }
        }
    }

    return wallpaperFileArr;
}