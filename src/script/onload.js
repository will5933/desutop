const { invoke, convertFileSrc } = window.__TAURI__.core;
const resolveResource = window.__TAURI__.path.resolveResource;

const storedWidgets = new window.__TAURI_PLUGIN_STORE__.Store('widgets.bin');

const WIDGET_TYPE = {
    steamGames: "steamgames",
    note: "note"
};

const dateTime = document.querySelector('#datetime');

// TODO
document.querySelector('#addwidget_note').addEventListener('click', createNoteWidget);
// TODO
document.querySelector('#addwidget_steamgames').addEventListener('click', createSteamGamesWidget);

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
        makeSteamGamesWidget();
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
    // cDate.textContent = `${weekdays} ${month}/${day}`;
    // cDate.textContent = `${month}/${day}`;
    // cTime.textContent = `${hours}:${minutes}:${seconds}`;
    dateTime.textContent = `${month}/${day} ${weekdays} ${hours}:${minutes}:${seconds}`;
}

// fn randerStoredWidgets()
async function randerStoredWidgets() {
    // widgets > data[] > {type, id, (a), (b)}
    const widgetsArr = await storedWidgets.get('data');

    if (widgetsArr) {
        const widgetHtmlArr = [];

        // rander widgets
        for (const widget of widgetsArr) {
            let { type, id, a, b } = widget;
            switch (type) {
                case WIDGET_TYPE.note:
                    widgetHtmlArr.push(makeNoteWidget(id, a, b));
                    break;
                case WIDGET_TYPE.steamGames:
                    widgetHtmlArr.push(await makeSteamGamesWidget(id));
                    break;
            }
        }
        document.querySelector('#widget_layer').innerHTML = widgetHtmlArr.join('');
        bindEventListener();
    }
}

// fn makeNoteWidget() -> String
function makeNoteWidget(id, a, b) {
    return `<widget-container widget-id="${id}"><div slot="label"><p contenteditable="true" class="contenteditable padding_nowarp" spellcheck="false" widget-id="${id}" data-key="a">${a ?? ''}</p></div><div slot="content"><p contenteditable="true" class="contenteditable" spellcheck="false" widget-id="${id}" data-key="b">${b ?? ''}</p></div></widget-container>`;
}

// async fn makeSteamGamesWidget() -> String
async function makeSteamGamesWidget(id) {
    if (!window.res_arr) {
        window.res_arr = await invoke('get_steam_games');
    }

    const getStateStr = (stateNum) => {
        if (window.LANG.STEAM_GAME_STATE.hasOwnProperty(stateNum)) {
            return window.LANG.STEAM_GAME_STATE[stateNum];
        } else return window.LANG.STEAM_GAME_STATE["UNKNOWN"];
    }

    const htmlArr = [`<widget-container widget-id="${id}"><div slot="label">${window.LANG.STEAM_CONTAINER_LABEL}</div><div slot="content">`];

    const steamGamefilterOut = ['228980'];

    for (const steamgame of window.res_arr) {
        // filter out [228980]
        if (steamGamefilterOut.includes(steamgame.appid)) continue;
        htmlArr.push(`<div class="steamgameitem" data-appid="${steamgame.appid}"><span class="steamgame_name">${steamgame.name}</span><span class="steamgame_state">${getStateStr(steamgame.state_flags)}<span class="steamgame_appid"> ${steamgame.appid}</span></span></div>`);
    }

    htmlArr.push(`</div></widget-container>`);

    return htmlArr.join('');
}

// bindEventListener
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
            (e) => {
                clearTimeout(window.inputTimer);
                window.inputTimer = setTimeout(async () => {
                    console.log(e.target);
                    const id = e.target.getAttribute('widget-id'), key = e.target.getAttribute('data-key');
                    await storedWidgets.set('data', (await storedWidgets.get('data')).map((v) => {
                        if (v['id'] == id) {
                            v[key] = e.target.innerText;
                        }
                        return v;
                    }));
                    await storedWidgets.save();
                }, 5000)
            }
        )
    }

    document.addEventListener('contextmenu', (e) => {
        // right
        e.stopPropagation();
    })
}

async function createSteamGamesWidget() {
    const id = make_widgetID();
    let arr = await storedWidgets.get('data');
    if (!arr) arr = [];
    arr.push({ type: WIDGET_TYPE.steamGames, id: id });
    document.querySelector('#widget_layer').innerHTML += await makeSteamGamesWidget(id);
    await storedWidgets.set('data', arr);
    await storedWidgets.save();
}

async function createNoteWidget() {
    const id = make_widgetID();
    let arr = await storedWidgets.get('data');
    if (!arr) arr = [];
    arr.push({ type: WIDGET_TYPE.note, id: id, a: window.LANG.NOTE.UNTITLED, b: window.LANG.NOTE.UNTITLED_CONTENT });
    document.querySelector('#widget_layer').innerHTML += makeNoteWidget(id, window.LANG.NOTE.UNTITLED, window.LANG.NOTE.UNTITLED_CONTENT);
    await storedWidgets.set('data', arr);
    await storedWidgets.save();
}

function make_widgetID() {
    let res = 'xxxx.'.replace(/x/g, () => (Math.random() * 36 | 0).toString(36));
    return res + Date.now().toString(36)
}
