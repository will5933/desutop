const { invoke, convertFileSrc } = window.__TAURI__.core;
const resolveResource = window.__TAURI__.path.resolveResource;

const storedWidgets = new window.__TAURI_PLUGIN_STORE__.Store('widgets.bin');

const WIDGET_TYPE = {
    steamGames: "steamgames",
    note: "note"
};

const cDate = document.querySelector('#date');
const cTime = document.querySelector('#time');

// TODO
cDate.addEventListener('click', () => {
    createSteamGamesWidget();
});
// TODO
cTime.addEventListener('click', () => {
    createNoteWidget();
});

// 
// onload begin
// 
window.onload = async () => {
    // background-image
    const assetUrl = convertFileSrc(await resolveResource('pic/wp.jpg'));
    document.querySelector("#screen").style.backgroundImage = `url('${assetUrl}')`;

    // locale
    invoke('get_lang_json_string').then((jsonStr) => {
        window.LANG = JSON.parse(jsonStr);

        // showCurrentDateTime
        showCurrentDateTime();
        setInterval(showCurrentDateTime, 1000);

        randerStoredWidgets();

        // Get Steam Games
        getSteamGames();
    })
};
// 
// onload end
// 

// fn showCurrentDateTime()
function showCurrentDateTime() {
    const now = new Date();
    // const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const weekdays = window.LANG.WEEKDAYS[now.getDay()];
    cDate.textContent = `${weekdays} ${month}/${day}`;
    // cDate.textContent = `${month}/${day}`;
    cTime.textContent = `${hours}:${minutes}:${seconds}`;
}

// fn randerStoredWidgets()
async function randerStoredWidgets(widgetsArr) {
    // widgets > data[] > {type, id, (a), (b)}
    if (!widgetsArr) widgetsArr = await storedWidgets.get('data');

    if (widgetsArr) {
        const widgetHtmlArr = [];

        // rander widgets
        for (const widget of widgetsArr) {
            let { type, id, a, b } = widget;
            switch (type) {
                case WIDGET_TYPE.note:
                    widgetHtmlArr.push(`<widget-container widget-id="${id}"><div slot="label"><p contenteditable="true" class="contenteditable nowrap" spellcheck="false" widget-id="${id}" data-key="a">${a ?? ''}</p></div><div slot="content"><p contenteditable="true" class="contenteditable" spellcheck="false" widget-id="${id}" data-key="b">${b ?? ''}</p></div></widget-container>`);
                    break;
                case WIDGET_TYPE.steamGames:
                    widgetHtmlArr.push(await getSteamGames(id));
                    break;
            }
        }

        document.querySelector('#widget_layer').innerHTML = widgetHtmlArr.join('');

        bindEventListener();
    }
}

// fn getSteamGames() -> String
async function getSteamGames(id) {
    const res_arr = await invoke('get_steam_games');

    const getStateStr = (stateNum) => {
        if (window.LANG.STEAM_GAME_STATE.hasOwnProperty(stateNum)) {
            return window.LANG.STEAM_GAME_STATE[stateNum];
        } else return window.LANG.STEAM_GAME_STATE["UNKNOWN"];
    }

    const htmlArr = [`<widget-container widget-id="${id}"><div slot="label">${window.LANG.STEAM_CONTAINER_LABEL}</div><div slot="content">`];

    const steamGamefilterOut = ['228980'];

    for (const steamgame of res_arr) {
        // filter out [228980]
        if (steamGamefilterOut.includes(steamgame.appid)) continue;
        htmlArr.push(`<div class="steamgameitem" data-appid="${steamgame.appid}"><span class="steamgame_name">${steamgame.name}</span><span class="steamgame_state">${getStateStr(steamgame.state_flags)}<span class="steamgame_appid"> ${steamgame.appid}</span></span></div>`);
    }

    htmlArr.push(`</div></widget-container>`);

    return htmlArr.join('');
}

function bindEventListener() {
    // type: steamgames > Run game
    for (const item of document.querySelectorAll('.steamgameitem')) {
        item.addEventListener('click',
            () => {
                invoke('start_steam_game', { appid: item.getAttribute("data-appid") });
            }
        )
    }

    // type: note > save a / b
    for (const item of document.querySelectorAll('p.contenteditable')) {
        item.addEventListener('input',
            function (e) {
                clearTimeout(this.timer);
                this.timer = setTimeout(async () => {
                    const id = this.getAttribute('widget-id'), key = this.getAttribute('data-key');
                    let arr = await storedWidgets.get('data');
                    arr = arr.map((v) => {
                        if (v['id'] == this.getAttribute('widget-id')) {
                            v[key] = this.innerText;
                        }
                        return v;
                    })
                    await storedWidgets.set('data', arr)
                    storedWidgets.save();
                }, 5000)
            }
        )
    }
}

async function createSteamGamesWidget() {
    let arr = await storedWidgets.get('data');
    if (!arr) arr = [];
    arr.push({ type: WIDGET_TYPE.steamGames, id: guid() });
    storedWidgets.set('data', arr);
    randerStoredWidgets(arr);
    storedWidgets.save();
}

async function createNoteWidget() {
    let arr = await storedWidgets.get('data');
    if (!arr) arr = [];
    arr.push({ type: WIDGET_TYPE.note, id: guid(), a: window.LANG.NOTE.UNTITLED, b: window.LANG.NOTE.UNTITLED_CONTENT });
    storedWidgets.set('data', arr);
    randerStoredWidgets(arr);
    storedWidgets.save();
}

function guid() {
    let res = 'xxxx.'.replace(/x/g, () => (Math.random() * 36 | 0).toString(36));
    return res + Date.now().toString(36)
}
