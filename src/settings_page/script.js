import { getWallpaperFilesPathArr } from "../wallpaper.js";
const settingStore = new window.__TAURI_PLUGIN_STORE__.Store('settings.bin');

// right click
document.body.addEventListener('contextmenu', e => e.preventDefault());

{
    // btn
    const appWindow = new window.__TAURI__.window.Window('settings');

    document
        .getElementById('titlebar-minimize')
        ?.addEventListener('click', appWindow.minimize);
    document
        .getElementById('titlebar-maximize')
        ?.addEventListener('click', appWindow.toggleMaximize);
    document
        .getElementById('titlebar-close')
        ?.addEventListener('click', appWindow.close);
}

{
    // init
    handleHash();

    // #sidebar div
    document.querySelectorAll('#sidebar div').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            location.hash = link.getAttribute('data-target');
        });
    });

    window.addEventListener("hashchange", handleHash, false);

    function handleHash() {
        document.querySelectorAll('.content-section').forEach(section => section.style.display = 'none');
        document.getElementById(location.hash.substring(1)).style.display = 'block';
        document.querySelectorAll('#sidebar div').forEach(div => div.classList.remove('on'));
        document.querySelector(`#sidebar div[data-target="${location.hash.substring(1)}"]`).classList.add('on');
    }
}

// ripple
document.querySelectorAll('.ripple-button').forEach(button => {
    button.addEventListener('click', (e) => {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');

        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

        button.appendChild(ripple);

        ripple.addEventListener('animationend', () => {
            ripple.remove();
        });
    });
});

// 
// SETTINGS
// 
{
    const language_json_filename = document.getElementById('display-language-select'), set_wallpaper_for_windows = document.getElementById('set-wallpaper-for-system');

    // read
    const dataObj = await settingStore.get('data');
    set_wallpaper_for_windows.checked = dataObj["set_wallpaper_for_windows"];
    language_json_filename.value = dataObj["language_json_filename"];

    // set_wallpaper_for_windows
    set_wallpaper_for_windows.addEventListener('change', () => saveConfig('set_wallpaper_for_windows', set_wallpaper_for_windows.checked));

    // language_json_filename
    language_json_filename.addEventListener('change', () => saveConfig(
        'language_json_filename',
        language_json_filename.value,
        () => location.reload(),
    ));
}

window.save_config_settimeout = {};
function saveConfig(key, value, afterFn) {
    clearTimeout(window.save_config_settimeout[key]);
    window.save_config_settimeout[key] = setTimeout(async () => {
        const dataObj = await settingStore.get('data');
        dataObj[key] = value;
        await settingStore.set('data', dataObj);
        await settingStore.save();
        if (afterFn) afterFn();
    }, 50);
}

// WALLPAPER
{
    const eleArr = [];
    for (const filepath of await getWallpaperFilesPathArr()) {
        const assetUrl = window.__TAURI__.core.convertFileSrc(await window.__TAURI__.path.resolveResource(filepath));
        eleArr.push(`<img class="wallpaper-image" src="${assetUrl}" title="${filepath}">`);
    }
    document.getElementById('wallpaper-box').innerHTML = eleArr.join('');

    document.querySelectorAll('img.wallpaper-image').forEach(ele => {
        ele.addEventListener('click', async () => {
            saveConfig('wallpaper_file_path', ele.getAttribute('title'));
            window.__TAURI__.event.emit(
                'wallpaper-change',
                await window.__TAURI__.path.resolveResource(ele.getAttribute('title')),
            );
        });
    });
}