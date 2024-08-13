import { initWidgets } from './widgets.js';
import { WidgetContainer } from "./container.js";

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

            customElements.define('widget-container', WidgetContainer);

            // ban contextmenu
            bindListeners();

            initWidgets();
        })

    // background-image
    setWallpaper(
        await window.__TAURI__.path.resolveResource(dataObj['wallpaper_file_path'] ?? 'wallpapers/default.jpg')
    );

    window.wallpaper_change_listener = await window.__TAURI__.event.listen('wallpaper-change', e => setWallpaper(e.payload));

    function setWallpaper(absolutePath) {
        document.getElementById('screen').style.backgroundImage = `url('${window.__TAURI__.core.convertFileSrc(absolutePath)}')`;
    }
}


// TODO
function bindListeners() {
    document.body.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    })
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
    const seconds = pad(now.getSeconds());
    const weekdays = window.LANG.WEEKDAYS[now.getDay()];

    // Update date and time display
    dateTime.textContent = `${month}/${day} ${weekdays} ${hours}:${minutes}:${seconds}`;
}

