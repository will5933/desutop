const { invoke, convertFileSrc } = window.__TAURI__.core;
const resolveResource = window.__TAURI__.path.resolveResource;

const cDate = document.querySelector('#date')
const cTime = document.querySelector('#time')

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
    cTime.textContent = `${hours}:${minutes}:${seconds}`;
}

// fn getSteamGames()
function getSteamGames() {
    invoke('get_steam_games').then((res_arr) => {
        if (res_arr.length) {
            const getStateStr = (stateNum) => {
                if (window.LANG.STEAM_GAME_STATE.hasOwnProperty(stateNum)) {
                    return window.LANG.STEAM_GAME_STATE[stateNum];
                } else return window.LANG.STEAM_GAME_STATE["UNKNOWN"];
            }

            const htmlArr = [`
            <widget-container widget-id="steamgame">
                <div slot="label">${window.LANG.STEAM_CONTAINER_LABEL}</div>
                <div slot="content">
            `];

            const steamGamefilterOut = ['228980'];

            for (const steamgame of res_arr) {
                // filter out [228980]
                if (steamGamefilterOut.includes(steamgame.appid)) continue;
                htmlArr.push(`
                    <div class="steamgameitem" data-appid="${steamgame.appid}">
                        <span class="steamgame_name">${steamgame.name}</span>
                        <span class="steamgame_state">${getStateStr(steamgame.state_flags)}
                            <span class="steamgame_appid"> ${steamgame.appid}</span>
                        </span>
                    </div>
                `);
            }

            htmlArr.push(`
                </div>
            </widget-container>
            `);

            document.querySelector('#container_layer').innerHTML += htmlArr.join('');
            // document.querySelector('#container_layer').innerHTML = htmlArr.join('') + document.querySelector('#container_layer').innerHTML;

            // Run game
            for (const item of document.querySelectorAll('.steamgameitem')) {
                console.log(item.getAttribute("data-appid"));
                item.addEventListener('click',
                    (e) => {
                        invoke('start_steam_game', { appid: item.getAttribute("data-appid") });
                    }
                )
            }
        }
    });
}