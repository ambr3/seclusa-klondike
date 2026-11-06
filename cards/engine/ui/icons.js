/*
 * Material Design Icons (Apache License 2.0) — the same icons the Android app ships in
 * `app/src/main/res/drawable/`. The path data below is transcribed 1:1 from those vector
 * drawables so the PWA shows the identical icons.
 *
 * About screen credit in the Android app:
 *   "Material design icons — Used for all icons in this application" (Apache 2.0)
 *   https://github.com/google/material-design-icons/blob/master/LICENSE
 
 *
 * PORT TO JAVASCRIPT (plain ES modules, no build step).
 *
 * Derived from the TypeScript port of the Android app by Tobias Bielefeld
 * (GPL-3.0), which is itself derived from the original Java sources in
 * `Solitaire/app/src/main/java/de/tobiasbielefeld/solitaire/`. Type
 * annotations are dropped; naming, structure, comments and behaviour are
 * unchanged. The GPL-3.0 notice above must survive every further copy.
*/
const ICONS = {
    // icon_star.xml
    star: {
        fill: ['M12,2 L14.9,8.6 L22,9.3 L16.7,14 L18.2,21 L12,17.3 L5.8,21 L7.3,14 L2,9.3 L9.1,8.6 Z'],
    },
    // icon_undo.xml
    undo: {
        stroke: [
            {
                data: 'M8.5,7.2 L4.5,9.8 L8.5,12.4 M4.5,9.8 L13,9.8 C16,9.8 17.2,11 17.2,14 C17.2,17 16,18.2 13,18.2 L6.5,18.2',
                width: 3,
            },
        ],
    },
    // icon_new_game.xml
    newGame: {
        fill: [
            'M7.5,10 L12,10 L12,5.5 C12,4.9477 12.4477,4.5 13,4.5 C13.5523,4.5 14,4.9477 14,5.5 L14,10 L18.5,10 C19.0523,10 19.5,10.4477 19.5,11 C19.5,11.5523 19.0523,12 18.5,12 L14,12 L14,16.5 C14,17.0523 13.5523,17.5 13,17.5 C12.4477,17.5 12,17.0523 12,16.5 L12,12 L7.5,12 C6.9477,12 6.5,11.5523 6.5,11 C6.5,10.4477 6.9477,10 7.5,10 Z',
        ],
    },
    // icon_menu.xml
    menu: {
        fill: [
            'M3.5,5.5 C3.5,4.6716 4.1716,4 5,4 L19,4 C19.8284,4 20.5,4.6716 20.5,5.5 C20.5,6.3284 19.8284,7 19,7 L5,7 C4.1716,7 3.5,6.3284 3.5,5.5 Z',
            'M3.5,11.5 C3.5,10.6716 4.1716,10 5,10 L19,10 C19.8284,10 20.5,10.6716 20.5,11.5 C20.5,12.3284 19.8284,13 19,13 L5,13 C4.1716,13 3.5,12.3284 3.5,11.5 Z',
            'M3.5,17.5 C3.5,16.6716 4.1716,16 5,16 L19,16 C19.8284,16 20.5,16.6716 20.5,17.5 C20.5,18.3284 19.8284,19 19,19 L5,19 C4.1716,19 3.5,18.3284 3.5,17.5 Z',
        ],
    },
    // icon_lightbulb_on.xml
    lightbulb: {
        fill: [
            'M9,21 L9,20 L15,20 L15,21 C15,21.5523 14.5523,22 14,22 L10,22 C9.4477,22 9,21.5523 9,21 Z',
            'M12,2 C8.69,2 6,4.69 6,8 C6,10.21 7.22,12.13 9,13.17 L9,16 C9,16.55 9.45,17 10,17 L14,17 C14.55,17 15,16.55 15,16 L15,13.17 C16.78,12.13 18,10.21 18,8 C18,4.69 15.31,2 12,2 Z',
        ],
    },
    // icon_settings_black.xml
    settings: {
        stroke: [
            {
                data: 'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z',
                width: 2.4,
            },
        ],
    },
    // icon_arrow_up.xml
    arrowUp: { fill: ['M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z'] },
    // icon_arrow_down.xml
    arrowDown: { fill: ['M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z'] },
    // icon_arrow_left.xml
    arrowLeft: { fill: ['M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z'] },
    // icon_arrow_right.xml
    arrowRight: { fill: ['M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z'] },
    // ic_close.xml
    close: {
        fill: ['M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12 19,6.41z'],
    },
};
/** Builds an inline `<svg>` string for the given icon. */
export function iconSvg(name, size = 24) {
    const def = ICONS[name];
    // Every caller passes a literal name today, so this never fires — but `def.fill`
    // on a miss throws a TypeError that takes down whatever was building the node, and
    // an unknown icon is exactly the kind of typo that gets introduced later. A missing
    // icon is a cosmetic problem; it should not be a crash.
    if (!def) return '';
    // The result of this function is assigned to innerHTML at every call site, and `size`
    // lands in a `width`/`height` attribute. It is coerced to a number here rather than
    // trusted, so a non-numeric size cannot close the attribute and inject markup.
    const px = Number(size);
    if (!Number.isFinite(px)) {
        return '';
    }
    const parts = [];
    for (const data of def.fill ?? []) {
        parts.push(`<path d="${data}" fill="currentColor"/>`);
    }
    for (const path of def.stroke ?? []) {
        parts.push(`<path d="${path.data}" fill="none" stroke="currentColor" stroke-width="${path.width}" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    return `<svg viewBox="0 0 24 24" width="${px}" height="${px}" aria-hidden="true" focusable="false">${parts.join('')}</svg>`;
}
export function iconElement(name, size = 24) {
    const wrap = document.createElement('div');
    wrap.innerHTML = iconSvg(name, size);
    return wrap.firstElementChild;
}
