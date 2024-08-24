import { createElementWithAttributes, initWidgets, createNoteWidget } from './widgets.js';
// import { WidgetContainer } from "./container.js";
import { showMenu, closeMenu, clipMenuItemStr } from "./menu.js";

const dateTime = document.getElementById('datetime');

{
    // locale
    const settingsStore = new window.__TAURI_PLUGIN_STORE__.Store('settings.bin');
    const dataObj = await settingsStore.get('data');
    window.__TAURI__.core.invoke('get_lang_json_string', { "languageJsonFilename": dataObj["language_json_filename"] })
        .then((jsonStr) => {
            window.LANG = JSON.parse(jsonStr);

            // showCurrentDateTime
            showCurrentDateTime();
            setInterval(showCurrentDateTime, 1000);

            initWidgets();

            setTimeout(() => {
                document.getElementById('widget_layer').style.opacity = '1';
                document.getElementById('widget_layer').style.transform = 'scale(1)';
            }, 300);
        })

    // background-image
    setWallpaper(
        await window.__TAURI__.path.resolveResource(dataObj['wallpaper_file_path'] ?? 'wallpapers/default.jpg')
    );

    window.wallpaper_change_listener = await window.__TAURI__.event.listen('wallpaper-change', e => setWallpaper(e.payload));

    function setWallpaper(absolutePath) {
        document.getElementById('screen').style.backgroundImage = `url('${window.__TAURI__.core.convertFileSrc(absolutePath)}')`;
    }

    // reload
    window.reload_listener = await window.__TAURI__.event.listen('language-change', () => location.reload());
}

{ // windows task bar height
    document.documentElement.style.setProperty('--windows-task-bar-height', `${window.screen.height - window.screen.availHeight}px`);
    window.screen.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--windows-task-bar-height', `${e.target.height - e.target.availHeight}px`);
    });
}


{ // enable drag & drop
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (window.is_menu_open || window.is_concentrating) return;

        if (e.dataTransfer.items) {
            for (let i = 0; i < e.dataTransfer.items.length; i++) {
                console.log(`type ${e.dataTransfer.items[i].type} dropped`);
                if (e.dataTransfer.items[i].type === 'text/plain') {
                    e.dataTransfer.items[i].getAsString(str => {
                        createNoteWidget(str, [e.x, e.y]);
                    });
                }
                //  else if (e.dataTransfer.items[i].kind === 'file') {
                //     const file = e.dataTransfer.items[i].getAsFile();
                //     console.log('File:', file.name);
                // }
            }
        }
    });
}

{
    const { writeText, readText } = window.__TAURI_PLUGIN_CLIPBOARD_MANAGER__;
    const clipboardStore = new window.__TAURI_PLUGIN_STORE__.Store('clipboard.bin');
    const clipboardBar = document.getElementById('clipboard_bar');
    const clipArr = (await clipboardStore.get('data')) ?? [];
    if (clipArr.length > 0) setClipboardBar(clipArr);
    else clipboardBar.textContent = window.LANG['CLIPBOARD_MENU_TITLE'];

    window.clipboard_change = await window.__TAURI__.event.listen('clipboard-change', onClipboardChange);

    async function onClipboardChange() {
        try {
            const str = (await readText()).trim();
            if (str.length === 0) return;

            clipArr.push(str);
            while (clipArr.length > 50) {
                clipArr.shift();
            }

            setClipboardBar(clipArr);

            clearTimeout(window.clipboard_store_timeout);
            window.clipboard_store_timeout = setTimeout(async () => {
                await clipboardStore.set('data', clipArr);
                await clipboardStore.save();
            }, 200);
        } catch (err) {
            console.warn('Failed to read clipboard content: ', err);
        }
    }


    function setClipboardBar(clipArr) {
        clipboardBar.textContent = clipMenuItemStr(clipArr[clipArr.length - 1], 15);
        clipboardBar.classList.add('topbar_ele_on');
        clearTimeout(window.set_clipboard_bar);
        window.set_clipboard_bar = setTimeout(() => {
            clipboardBar.classList.remove('topbar_ele_on');
        }, 5000);
    }

    { // setAddWidgetMenu
        clipboardBar.addEventListener('mousedown', e => {
            if (clipArr.length === 0) return;
            const btn = e.currentTarget;
            showMenu(
                window.LANG['CLIPBOARD_MENU_TITLE'],
                getItemArr(),
                btn.getBoundingClientRect(),
                () => btn.classList.add('topbar_ele_on'),
                () => btn.classList.remove('topbar_ele_on')
            );
        });

        function getItemArr() {
            return clipArr.toReversed().map(str => {
                const ele = createElementWithAttributes('p', { 'class': 'menu-item', 'draggable': 'true' });
                ele.textContent = clipMenuItemStr(str, 40);
                ele.addEventListener('click', async () => {
                    closeMenu();
                    await writeText(str);
                });
                ele.addEventListener('dragstart', (event) => {
                    event.dataTransfer.setData('text/plain', str);
                });
                return ele;
            });
        }
    }
}

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

// fn showCurrentDateTime()
function showCurrentDateTime() {
    const now = new Date();

    // Helper function to format numbers with leading zero
    const pad = (num) => String(num).padStart(2, '0');

    // Extract and format date and time components
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const weekdays = window.LANG.WEEKDAYS[now.getDay()];

    // Update date and time display
    dateTime.textContent = `${month}/${day} ${weekdays} ${hours}:${minutes}`;
}

