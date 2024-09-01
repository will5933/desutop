import { getWallpaperFilesPathArr } from "../wallpaper.js";
const settingStore = new window.__TAURI_PLUGIN_STORE__.Store('settings.bin');

{ // prevent keys
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey) {
            if (['p', 'f', 'r', 'j'].includes(event.key)) {
                event.preventDefault();
            }
        }
        if (['F3', 'F5', 'F7'].includes(event.key)) {
            event.preventDefault();
        }
    });
}

{ // btn
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

{ // init
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
    const language_selector = document.getElementById('display-language-select'),
        font_selector = document.getElementById('display-font-select'),
        font_selector2 = document.getElementById('display-font-select2'),
        set_wallpaper_for_windows = document.getElementById('set-wallpaper-for-system-switch'),
        auto_start_switch = document.getElementById('auto-start-switch');

    // rander
    const dataObj = await settingStore.get('data');
    set_wallpaper_for_windows.checked = dataObj["set_wallpaper_for_windows"];
    auto_start_switch.checked = await window.__TAURI_PLUGIN_AUTOSTART__.isEnabled();
    language_selector.value = dataObj["language_json_filename"];
    {
        const availableFonts = await window.queryLocalFonts();
        const fontFamilyArr = [];
        for (const fontData of availableFonts) {
            if (!fontFamilyArr.includes(fontData.family)) fontFamilyArr.push(fontData.family);
        }
        fontFamilyArr.forEach(fontFamilyName => {
            const option = document.createElement('option');
            option.value = fontFamilyName;
            option.textContent = fontFamilyName;
            font_selector.appendChild(option);
            font_selector2.appendChild(option.cloneNode(true));
        });
        font_selector.value = dataObj["font_family"] ?? 'NOTSPECIFIED';
        font_selector2.value = dataObj["font_family2"] ?? 'NOTSPECIFIED';
    }

    // set_wallpaper_for_windows
    set_wallpaper_for_windows.addEventListener('change', () => saveConfig('set_wallpaper_for_windows', set_wallpaper_for_windows.checked));

    auto_start_switch.addEventListener('change', async () => {
        if (auto_start_switch.checked) await window.__TAURI_PLUGIN_AUTOSTART__.enable();
        else await window.__TAURI_PLUGIN_AUTOSTART__.disable();
    });
    // language_json_filename
    language_selector.addEventListener('change', () => saveConfig(
        'language_json_filename',
        language_selector.value,
        refreshAllWindows,
    ));
    // font-family
    font_selector.addEventListener('change', () => saveConfig(
        'font_family',
        font_selector.value,
        refreshAllWindows,
    ));
    font_selector2.addEventListener('change', () => saveConfig(
        'font_family2',
        font_selector2.value,
        refreshAllWindows,
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

async function refreshAllWindows() {
    await window.__TAURI__.event.emit('ask-to-refresh', 0);
    location.reload();
}

// { // enable drop and save wallpaper
//     const imageTypes = ['image/webp', 'image/jpeg', 'image/png'];

//     document.addEventListener('dragover', (e) => {
//         e.preventDefault();
//         e.stopPropagation();
//     });
//     document.addEventListener('drop', (e) => {
//         e.preventDefault();
//         e.stopPropagation();

//         console.log(e.dataTransfer);

//         if (e.dataTransfer.items) {
//             for (let i = 0; i < e.dataTransfer.items.length; i++) {
//                 if (imageTypes.includes(e.dataTransfer.items[i].type)) {
//                     console.log(e.dataTransfer.items[i]);
//                 }
//                 //  else if (e.dataTransfer.items[i].kind === 'file') {
//                 //     const file = e.dataTransfer.items[i].getAsFile();
//                 //     console.log('File:', file.name);
//                 // }
//             }
//         }
//     });
// }