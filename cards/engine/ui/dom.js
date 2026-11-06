/*
 * Seclusa Games — card engine DOM helpers.
 * Original app copyright (C) 2016  Tobias Bielefeld, GPL-3.0.
 *
 * Tiny DOM helpers. Deliberately not a framework: the card games use plain elements plus
 * CSS custom properties, as the Android app used Views plus styles.
 *
 * PORT TO JAVASCRIPT (plain ES modules, no build step).
 *
 * Derived from the TypeScript port of the Android app by Tobias Bielefeld (GPL-3.0),
 * which is itself derived from the original Java sources in
 * `Solitaire/app/src/main/java/de/tobiasbielefeld/solitaire/`. Type annotations are
 * dropped; naming, structure, comments and behaviour are unchanged. The GPL-3.0 notice
 * above must survive every further copy.
 */

export function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}
export function button(className, label, onClick) {
    const node = el('button', className);
    node.type = 'button';
    node.textContent = label;
    node.addEventListener('click', onClick);
    return node;
}
export function clear(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}
export function setVisible(node, visible) {
    node.style.display = visible ? '' : 'none';
}
