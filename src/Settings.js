// @flow

type Player = 0 | 1;

export type {Player};

export function swapPlayer(p:Player):Player {
  return p === 0 ? 1 : 0;
}

export class GameSettings {
  bot: Array<boolean>;
  rows: number;
  winWithLast: boolean;

  constructor() {
    // default settings:
    this.bot = [ false, true];
    this.rows = 5;
    this.winWithLast = false;
  }

}

// Enum-Ersatz fuer Varianten von Computerzuegen.
// Es wird zwar immer "gnadenlos" gespielt, d.h. wenn es mind. einen Gewinnzug gibt,
// wird ein solcher ausgefuehrt. Fuer mehrere vorhandene Gewinnzuege bzw. keine
// vorhandenen Gewinnzuege, gibt die Strategie-Variante hier an, wie einer der
// gleichwertigen Zuege ausgewaehlt wird.
export type BotStrategy =
  // zufaelligen waehlen.
  "RANDOM" |
  // moeglichst wenige Kaestchen in einem Zug streichen
  "SLOW" |
  // moeglichst viele Kaestchen in einem Zug streichen
  "FAST"
;


// Zugeinstellungen fuer einen Computerspieler
export class MoveSettings {
  botStrategy: BotStrategy = ("RANDOM": BotStrategy); // BotStrategy
  animationMs: number = 1000; // int

  toString(): string {
    return "(MoveSettings botStrategy=" + this.botStrategy + ", animationMs=" + this.animationMs + ")";
  }
}

const SETTINGS_KEY: string = "settings.3";

export class Settings {
  gameSettings: GameSettings = new GameSettings();
  moveSettings: Array<MoveSettings> = [new MoveSettings(), new MoveSettings()]; // je Computerspieler, auch wenn evtl. gerade nicht alle aktiv

  loadFromLocalStorage(): void {
    let st = window.localStorage;
    st.removeItem("settings"); // alte Version
    // st.removeItem("settings.2");
    let settingsString = st.getItem(SETTINGS_KEY);
    console.log("settingsString", settingsString);
    if (settingsString) {
      Object.assign(this, JSON.parse(settingsString));
    }

    // JSON.stringify(settingsString)
  }

  saveToLocalStorage(): void {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(this));
  }

  static removeInLocalStorage(): void {
    window.localStorage.removeItem(SETTINGS_KEY);
  }
}
// export default BotStrategy;
// export default Settings;
// export { GameSettings, BotStrategy };
