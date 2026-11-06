/*
 * Copyright (C) 2016  Tobias Bielefeld
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * If you want to contact me, send me an e-mail at tobias.bielefeld@gmail.com
 */
/**
 * PORT TO JAVASCRIPT (plain ES modules, no build step, run directly by the browser).
 *
 * Port of `app/src/main/java/de/tobiasbielefeld/solitaire/dialogs/OptionPillDialog.java`:
 * a Material alert dialog whose choices are outline pill buttons stacked vertically, with a
 * Cancel button underneath. Used for the new-game, redeal, help and win dialogs.
 */
import { el } from './dom.js';
import { shared } from '../game/SharedData.js';
let activeDialog = null;

/**
 * Groups of "pick exactly one", inside a settings picker.
 *
 * A picker lays its choices out in one of these containers; anything else in the dialog --
 * the action pills, the Cancel button -- is not a choice and is left alone.
 */
const CHOICE_GROUPS = '.pill-row, .preview-grid, .color-swatches';
const CHOICES = '.pill-choice, .preview-cell, .color-swatch';

/**
 * Moves the selected ring when a choice is clicked.
 *
 * A picker builds its header once, when the dialog opens, and `afterChange()` only
 * repaints the settings screen *behind* it. So a picker that relied on a rebuild to move
 * the ring left it on the previous answer: the setting changed and the dialog said
 * otherwise. That is worse than no confirmation at all, because the dialog now disagrees
 * with the game.
 *
 * Doing it here rather than in each picker means a new picker cannot forget. The group is
 * the nearest row, grid or swatch set, so a dialog with two independent choices -- portrait
 * and landscape margins -- keeps one ring in each.
 */
function markSingleChoice(dialog) {
    dialog.addEventListener('click', (event) => {
        const picked = event.target.closest(CHOICES);
        if (!picked) {
            return;
        }
        const group = picked.closest(CHOICE_GROUPS);
        if (!group) {
            return;
        }
        for (const node of group.querySelectorAll('.is-selected')) {
            node.classList.remove('is-selected');
        }
        picked.classList.add('is-selected');
    });
}

export function openPillDialog(options) {
    closeDialog();
    const scrim = el('div', 'dialog-scrim');
    const dialog = el('div', 'dialog');
    if (options.title) {
        dialog.appendChild(el('h2', 'dialog-title', options.title));
    }
    if (options.message) {
        dialog.appendChild(el('p', 'dialog-message', options.message));
    }
    if (options.header) {
        dialog.appendChild(options.header);
    }
    const buttons = el('div', 'dialog-buttons');
    for (const option of options.options) {
        const pill = el('button', option.primary ? 'pill is-primary' : 'pill', option.label);
        pill.type = 'button';
        pill.addEventListener('click', () => {
            closeDialog();
            option.onClick();
        });
        buttons.appendChild(pill);
    }
    if (options.cancelLabel) {
        const cancel = el('button', 'pill', options.cancelLabel);
        cancel.type = 'button';
        cancel.addEventListener('click', () => closeDialog());
        buttons.appendChild(cancel);
    }
    dialog.appendChild(buttons);
    markSingleChoice(dialog);
    scrim.appendChild(dialog);
    const handle = {
        root: scrim,
        close: () => {
            if (activeDialog === handle) {
                closeDialog();
            }
        },
    };
    const isModal = options.modal !== false;
    if (isModal) {
        scrim.addEventListener('pointerdown', (event) => {
            if (event.target === scrim) {
                closeDialog();
            }
        });
    }
    activeDialog = handle;
    if (isModal) {
        shared.isDialogVisible = true;
    }
    document.body.appendChild(scrim);
    return handle;
}
export function closeDialog() {
    if (activeDialog) {
        activeDialog.root.remove();
        activeDialog = null;
    }
    shared.isDialogVisible = false;
}
/** Shows the Material 3 toast the Android app used (`SharedData.showToast`). */
let toastTimer = null;
export function showToast(text) {
    const existing = document.getElementById('ssc-toast');
    if (existing) {
        existing.remove();
    }
    if (toastTimer !== null) {
        window.clearTimeout(toastTimer);
    }
    const toast = el('div');
    toast.id = 'ssc-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = text;
    Object.assign(toast.style, {
        position: 'fixed',
        left: '50%',
        bottom: 'calc(24px + env(safe-area-inset-bottom))',
        transform: 'translateX(-50%)',
        padding: '12px 18px',
        borderRadius: '10px',
        background: 'var(--md-sys-color-inverse-surface)',
        color: 'var(--md-sys-color-inverse-on-surface)',
        font: 'var(--type-body-medium)',
        maxWidth: '80%',
        textAlign: 'center',
        zIndex: '60',
        pointerEvents: 'none',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
    });
    document.body.appendChild(toast);
    toastTimer = window.setTimeout(() => {
        toast.remove();
        toastTimer = null;
    }, 2800);
}
