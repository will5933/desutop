export async function getWallpaperFilesPathArr() {
    const { BaseDirectory, readDir } = window.__TAURI_PLUGIN_FS__;

    const entries = await readDir('wallpapers', { baseDir: BaseDirectory.Resource });
    const wallpaperFileArr = [];

    await processEntriesRecursive('wallpapers', entries);

    return wallpaperFileArr;

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
}