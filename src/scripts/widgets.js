const invoke = window.__TAURI__.core.invoke;
const storedWidgets = new window.__TAURI_PLUGIN_STORE__.Store('widgets.bin');
const WIDGET_TYPE = {
    steamGames: "steamgames",
    note: "note"
};

const widgetLayer = document.querySelector('#widget_layer');

// 
// Rander Stored Widgets
// Bind event
// 
export async function initWidgets() {
    // widgets > data[] > {type, id, (a), (b)}
    const widgetsArr = await storedWidgets.get('data');

    if (widgetsArr) {
        // rander widgets
        for (const widget of widgetsArr) {
            let { type, id, a, b } = widget;
            appendWidget(type, id, a, b);
        }
        bindEventListener();
    }

    document.querySelector('#addwidget_note').addEventListener('click', createNoteWidget);
    document.querySelector('#addwidget_steamgames').addEventListener('click', createSteamGamesWidget);
}

async function appendWidget(type, id, a, b) {
    const widgetContainer = createElementWithAttributes('widget-container', { 'widget-id': id });

    const labelDiv = createElementWithAttributes('div', { 'slot': 'label' });
    const contentDiv = createElementWithAttributes('div', { 'slot': 'content' });

    widgetContainer.appendChild(labelDiv);
    widgetContainer.appendChild(contentDiv);

    let label, content;
    switch (type) {
        case WIDGET_TYPE.note:
            [label, content] = makeNoteWidget(id, a, b);
            labelDiv.appendChild(label);
            contentDiv.appendChild(content);
            break;

        case WIDGET_TYPE.steamGames:
            [label, content] = await makeSteamGamesWidget(id);
            labelDiv.appendChild(label);
            content.forEach(e => contentDiv.appendChild(e));
    }

    // 将 widget-container 添加到容器中
    widgetLayer.appendChild(widgetContainer);
}

// fn makeNoteWidget() -> [label, content]
function makeNoteWidget(id, a, b) {
    const labelP = createElementWithAttributes('p', {
        'contenteditable': 'true',
        'class': 'contenteditable padding_nowarp',
        'spellcheck': 'false',
        'widget-id': id,
        'data-key': 'a'
    });
    labelP.textContent = a ?? '';
    const contentP = createElementWithAttributes('p', {
        'contenteditable': 'true',
        'class': 'contenteditable',
        'spellcheck': 'false',
        'widget-id': id,
        'data-key': 'b'
    });
    contentP.textContent = b ?? '';
    return [labelP, contentP];
}

// fn makeSteamGamesWidget() -> [label, content]
async function makeSteamGamesWidget(id) {
    if (!window.mSGW_cache) {
        window.mSGW_cache = await invoke('get_steam_games');
    }

    const { SECOND, MINUTE, HOUR, DAY, WEEK } = window.LANG.DATETIME;

    const getStateStr = (stateNumStr) => {
        if (window.LANG.STEAM_GAME_STATE.hasOwnProperty(stateNumStr)) {
            return window.LANG.STEAM_GAME_STATE[stateNumStr];
        } else return window.LANG.STEAM_GAME_STATE["UNKNOWN"];
    };

    const getSizeStr = (byteNumStr) => `${(Number.parseInt(byteNumStr) / 1024 / 1024 / 1024).toFixed(2)}GB`;

    const getLastPlayedStr = (LastPlayedNumStr) => {
        if (LastPlayedNumStr === '0') return window.LANG.STEAM_GAME_LASTPLAYED_NOT;
        const sec = Math.round(Date.now() / 1000) - Number.parseInt(LastPlayedNumStr);

        if (sec < 60) {
            return `${sec}${SECOND} ago`;
        } else if (sec < 3600) {
            return `${Math.round(sec / 60)}${MINUTE} ago`;
        } else if (sec < 86400) {
            return `${Math.round(sec / 3600)}${HOUR} ago`;
        } else if (sec < 604800) {
            return `${Math.round(sec / 86400)}${DAY} ago`;
        } else {
            return `${Math.round(sec / 604800)}${WEEK} ago`;
        }
    };


    // filter
    const steamGamefilterOut = ['228980'];

    const contentArr = [];

    for (const steamgame of window.mSGW_cache) {
        // filter out [228980]
        if (steamGamefilterOut.includes(steamgame.appid)) continue;

        const wrapper = createElementWithAttributes('div', { 'class': 'steamgameitem', "data-appid": steamgame.appid });
        // >
        const name = createElementWithAttributes('span', { 'class': 'steamgame_name' });
        name.textContent = steamgame.name;
        const info = createElementWithAttributes('span', { 'class': 'steamgame_state' });
        info.textContent = `${getStateStr(steamgame.state_flags)} ${getSizeStr(steamgame.size_on_disk)} ${getLastPlayedStr(steamgame.last_played)}`

        console.log(info.textContent, steamgame);
        // >
        // const [span1, span2, span3] = [createElement('span'), createElement('span'), createElement('span')];
        // span1.textContent = getStateStr(steamgame.state_flags);
        // span2.textContent = getSizeStr(steamgame.size_on_disk);
        // span3.textContent = getLastPlayStr(steamgame.last_played);

        wrapper.appendChild(name);
        wrapper.appendChild(info);
        // info.appendChild(span1);
        // info.appendChild(span2);
        // info.appendChild(span3);

        contentArr.push(wrapper);
    }

    const labelP = createElementWithAttributes('p', { 'class': 'padding_nowarp' });
    labelP.textContent = window.LANG.STEAM_CONTAINER_LABEL;

    return [labelP, contentArr];
}

function createElementWithAttributes(tagName, attributes) {
    const element = document.createElement(tagName);
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }
    return element;
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

    // document.addEventListener('contextmenu', (e) => {
    //     // right
    //     e.stopPropagation();
    // })
}

async function createNoteWidget() {
    const id = make_widgetID();
    let arr = await storedWidgets.get('data');
    if (!arr) arr = [];
    arr.push({ type: WIDGET_TYPE.note, id: id, a: window.LANG.NOTE.UNTITLED, b: window.LANG.NOTE.UNTITLED_CONTENT });
    appendWidget(WIDGET_TYPE.note, id, window.LANG.NOTE.UNTITLED, window.LANG.NOTE.UNTITLED_CONTENT);
    // widgetLayer.innerHTML += makeNoteWidget(id, window.LANG.NOTE.UNTITLED, window.LANG.NOTE.UNTITLED_CONTENT);
    await storedWidgets.set('data', arr);
    await storedWidgets.save();
}

async function createSteamGamesWidget() {
    const id = make_widgetID();
    let arr = await storedWidgets.get('data');
    if (!arr) arr = [];
    arr.push({ type: WIDGET_TYPE.steamGames, id: id });
    appendWidget(WIDGET_TYPE.steamGames, id);
    // widgetLayer.innerHTML += await makeSteamGamesWidget(id);
    await storedWidgets.set('data', arr);
    await storedWidgets.save();
}

function make_widgetID() {
    let res = 'xxxx.'.replace(/x/g, () => (Math.random() * 36 | 0).toString(36));
    return res + Date.now().toString(36)
}