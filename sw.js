/*
 * Offline cache for this game. The version is the manifest version, so a bump
 * retires the previous cache. GitHub Pages serves this file from the repo root.
 */
const PREFIX = "seclusa-klondike-";
const SHELL = [
    "./Klondike.js",
    "./assets/fonts/dm-sans-latin-400-normal.woff2",
    "./assets/fonts/dm-sans-latin-600-normal.woff2",
    "./assets/fonts/dm-sans-latin-700-normal.woff2",
    "./assets/fonts/sora-latin-600-normal.woff2",
    "./assets/fonts/sora-latin-700-normal.woff2",
    "./assets/fonts/sora-latin-800-normal.woff2",
    "./cards/assets/cards/backgrounds_cards.png",
    "./cards/assets/cards/backgrounds_menu.png",
    "./cards/assets/cards/backgrounds_menu_text.png",
    "./cards/assets/cards/backgrounds_stacks.png",
    "./cards/assets/cards/card_previews.png",
    "./cards/assets/cards/cards_abstract.png",
    "./cards/assets/cards/cards_basic.png",
    "./cards/assets/cards/cards_classic.png",
    "./cards/assets/cards/cards_dondorf.png",
    "./cards/assets/cards/cards_modern.png",
    "./cards/assets/cards/cards_oxygen_dark.png",
    "./cards/assets/cards/cards_oxygen_light.png",
    "./cards/assets/cards/cards_paris.png",
    "./cards/assets/cards/cards_poker.png",
    "./cards/assets/cards/cards_simple.png",
    "./cards/assets/sounds/card_return.ogg",
    "./cards/assets/sounds/card_set.ogg",
    "./cards/assets/sounds/deal_cards.ogg",
    "./cards/assets/sounds/hint.ogg",
    "./cards/assets/sounds/show_autocomplete.ogg",
    "./cards/assets/sounds/win.wav",
    "./cards/cards.css",
    "./cards/engine/boot.js",
    "./cards/engine/game/AutoComplete.js",
    "./cards/engine/game/Card.js",
    "./cards/engine/game/CardAndStack.js",
    "./cards/engine/game/CardHighlight.js",
    "./cards/engine/game/DealCards.js",
    "./cards/engine/game/DeckShuffle.js",
    "./cards/engine/game/DifficultyPolicy.js",
    "./cards/engine/game/EnsureMovability.js",
    "./cards/engine/game/Game.js",
    "./cards/engine/game/GameLogic.js",
    "./cards/engine/game/HelperCardMovement.js",
    "./cards/engine/game/Hint.js",
    "./cards/engine/game/MovingCards.js",
    "./cards/engine/game/Preferences.js",
    "./cards/engine/game/RecordList.js",
    "./cards/engine/game/Scheduler.js",
    "./cards/engine/game/Scores.js",
    "./cards/engine/game/SharedData.js",
    "./cards/engine/game/Sounds.js",
    "./cards/engine/game/Stack.js",
    "./cards/engine/game/Timer.js",
    "./cards/engine/render/Animate.js",
    "./cards/engine/render/Bitmaps.js",
    "./cards/engine/render/Renderer.js",
    "./cards/engine/ui/AboutScreen.js",
    "./cards/engine/ui/Dialogs.js",
    "./cards/engine/ui/GameManager.js",
    "./cards/engine/ui/GameSelector.js",
    "./cards/engine/ui/ManualScreen.js",
    "./cards/engine/ui/SettingsScreen.js",
    "./cards/engine/ui/StatisticsScreen.js",
    "./cards/engine/ui/dom.js",
    "./cards/engine/ui/icons.js",
    "./cards/engine/ui/strings.js",
    "./cards/engine/ui/theme.js",
    "./cards/engine/util/prng.js",
    "./icon-192.png",
    "./icon-512.png",
    "./icon-maskable-512.png",
    "./index.html",
    "./main.js",
    "./manifest.json",
    "./mono.css",
    "./offline.html",
    "./seclusa-base.css",
    "./stand-help.js",
    "./stand.css",
    "./stand.js",
    "./theme-game.js",
    "./theme.css"
];

let resolved = null;

function resolveCache() {
    if (resolved) return Promise.resolve(resolved);
    return fetch(new URL("./manifest.json", self.location), { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
            resolved = PREFIX + "v" + data.version;
            return resolved;
        })
        .catch(() => caches.keys().then((keys) => {
            resolved = keys.find((key) => key.indexOf(PREFIX) === 0) || (PREFIX + "v0");
            return resolved;
        }));
}

self.addEventListener("install", (event) => {
    event.waitUntil(resolveCache().then((name) => caches.open(name).then((cache) => cache.addAll(SHELL))));
});

self.addEventListener("activate", (event) => {
    event.waitUntil(resolveCache().then((name) => caches.keys().then((keys) => Promise.all(
        keys.filter((key) => key.indexOf(PREFIX) === 0 && key !== name).map((key) => caches.delete(key))
    ))));
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    event.respondWith(resolveCache().then((name) => caches.open(name).then((cache) => fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
    }).catch(() => cache.match(req).then((hit) => hit || cache.match("./offline.html"))))));
});
