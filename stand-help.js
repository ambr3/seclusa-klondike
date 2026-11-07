window.STAND_COPY = {
  "name": "Seclusa Klondike",
  "source": "https://github.com/ambr3/seclusa-klondike",
  "corner": "right",
  "sound": true,
  "sounds": [
    { "label": "Sounds", "key": "ssc.pref_key_sound_enabled" },
    { "label": "Winning sound", "key": "ssc.pref_key_sound_win_enabled", "follow": "ssc.pref_key_sound_enabled" }
  ],
  "rules": [
    "Deal all 52 cards into seven columns, then build the four foundations up by suit from Ace to King.",
    "Only a King, or a column headed by a King, may go on an empty column.",
    "Build down in alternating colours on the tableau, and up in suit on the foundations.",
    "The stock deals one card at a time. The waste recycles until the stock runs out.",
    "You win when every card is on a foundation.",
    "Hint opens a move hint or the full rules. Settings holds sound, card backs and the rest."
  ],
  "about": [
    "Simple Solitaire Collection - https://github.com/TobiasBielefeld/Simple-Solitaire - Copyright 2016 - Tobias Bielefeld - tobias.bielefeld@gmail.com - Licensed under GPLv3+ https://www.gnu.org/licenses/gpl-3.0",
    "Modified to run Klondike in the browser, with no ads and no tracking. Games and settings stay on this device."
  ]
};
