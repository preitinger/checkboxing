// @flow

import * as React from 'react';
import produce from "immer";

import './Checkboxing.css';

import * as Settings from './Settings';
import {EditSettings} from './EditSettings';

type SegEventHandler = (segKey: number, unit: number) => void;

function min(a: ?number, b: ?number) {
  if (a == null || b == null) return 0;
  return a < b ? a : b;
}

function max(a: ?number, b: ?number) {
  if (a == null || b == null) return 0;
  return a > b ? a : b;
}

class Segment {
  key: number;
  size: number;
  toggled: boolean;

  constructor(key: number, size: number, toggled: boolean) {
    this.key = key;
    this.size = size;
    this.toggled = toggled;
  }
}

class Move {
  segKey: number;
  first: number;
  last: number;

  constructor(segKey:number, first:number, last:number) {
    this.segKey = segKey;
    this.first = first;
    this.last = last;
  }

  execute(draft: CheckboxingState) {
    forEachSeg(draft, (seg, row, idx) => {
      if (seg.key === this.segKey) {
        // gefunden
        if (seg.toggled) {
          throw 'Segment schon toggled in Move.execute()';
        }
        const segs = draft.rows[row];
        segs.splice(idx, 1);

        if (this.last < seg.size - 1) {
          segs.splice(idx, 0,
            new Segment(draft.nextSegKey++, seg.size - 1 - this.last, false));
        }

        segs.splice(idx, 0,
          new Segment(draft.nextSegKey++, this.last - this.first + 1, true));

        if (this.first > 0) {
          segs.splice(idx, 0,
            new Segment(draft.nextSegKey++, this.first, false));
        }
      }
    });
  }
}

type CheckboxingProps = {}

type CheckboxingStatemachine =
  "BEFORE_FIRST" |
  "BEFORE_LAST" |
  "ANIMATE_BOT_MOVE" |
  "SHOW_WINNER";

type Player = 0 | 1;

function otherPlayer(p: Player): Player {
  return p === 0 ? 1 : 0;
}

type CheckboxingState = {
  settingsVisible: boolean,
  rulesVisible: boolean,
  tipVisibilities: Array<boolean>,
  settings: Settings.Settings,
  rows: Array<Array<Segment>>,
  nextSegKey: number,
  highlightedSegKey: number,
  curMove?: Move,
  st: CheckboxingStatemachine,
  player: Player,
  winner?: Player,
  preWinner?: Player,
  finishMoveTimeout:?number,
};

function forEachSeg(draft: CheckboxingState, cb: (Segment, row: number, seg: number) => void): void {
  for (let i: number = 0; i < draft.rows.length; ++i) {
    for (let j: number = 0; j < draft.rows[i].length; ++j) {
      cb(draft.rows[i][j], i, j);
    }
  }
}

function createRows(draft: CheckboxingState): void {
  const x: Array<Array<Segment>> = draft.rows;
  x.splice(0, x.length);
  draft.nextSegKey = 0;

  for (let i = 0; i < draft.settings.gameSettings.rows; ++i) {
    x.push([new Segment(draft.nextSegKey++, i + 1, false)]);
  }
}

// s wird nicht geaendert.
function calcXorSum(s: CheckboxingState): number {
  let xorSum = 0;
  forEachSeg(s, seg => { xorSum ^= seg.toggled ? 0 : seg.size; });
  return xorSum;
}

function ifNotMoreUntoggledLongerThanOneThenLongestElseNull(s: CheckboxingState):?Segment {
  let numLongerThanOne = 0;
  let maxSize = 0;
  let longest = null;

  for (let i = 0; i < s.rows.length; ++i) {
    for (let j = 0; j < s.rows[i].length; ++j) {
      const seg = s.rows[i][j];

      if (!seg.toggled) {
        if (seg.size > 1) {
          ++numLongerThanOne;

          if (numLongerThanOne > 1) {
            return null;
          }
        }

        if (seg.size > maxSize) {
          maxSize = (longest = seg).size;
        }
      }
    }
  }

  return longest;
}

function randomShortest(moves: Array<Move>) {
  let minSize = -1;
  let shortest = null;

  moves.forEach((move) => {
    const size = move.last - move.first;
    if (minSize === -1 || size < minSize) {
      shortest = move;
      minSize = size;
    }
  });

  const allShortest: Array<Move> = [];
  moves.forEach((move) => {
    const size = move.last - move.first;
    if (size === minSize) {
      allShortest.push(move);
    }
  });

  return allShortest[Math.floor(Math.random() * allShortest.length)];
}

function randomLongest(moves: Array<Move>) {
  let maxSize = -1;
  let longest = null;

  moves.forEach((move) => {
    const size = move.last - move.first;
    if (size > maxSize) {
      longest = move;
      maxSize = size;
    }
  });

  const allLongest: Array<Move> = [];
  moves.forEach((move) => {
    const size = move.last - move.first;
    if (size === maxSize) {
      allLongest.push(move);
    }
  });

  return allLongest[Math.floor(Math.random() * allLongest.length)];
}

function findBotMove(s: CheckboxingState): [Move, boolean] {
  // Vorbedingung: { Es gibt noch mind. ein Segment mit toggled===false. }

  // Bilde xor-Summe ueber die Laengen aller noch nicht gecheckten Segmente.
  // Spezialfall, falls hoechstens ein Segment laenger als 1 ist. Sei
  // size(longest) dessen Laenge.
  //   Dann gibt es einen Gewinnzug genau dann, wenn:
  //   xorSum > 1 || ((xorSum === 1) === winWithLast)
  //   Falls (((xorSum ^ size(longest)) & 1) === 0) === winWithLast ist,
  //   muss dann das laengste Segment komplett gestrichen werden.
  //   Andernfalls muss genau eine Checkbox uebrig gelassen werden, so dass
  //   die neue xorSum zum Wert von winWithLast passt.

  // Sonst (wenn mind. 2 Segmente laenger als 1 sind) gilt:
  //   Es gibt einen oder mehrere Gewinnzuege genau dann, wenn:
  //   xorSum == 0

  let found: Array<Move> = [];
  let willWin = false;
  const xorSum = calcXorSum(s);
  const longest:?Segment = ifNotMoreUntoggledLongerThanOneThenLongestElseNull(s);

  if (longest != null) {
    // Spezialfall: max. ein Segment ist laenger als 1 und longest ist ein
    // max. langes Segment.
    // Insbesondere wenn alle die Laenge 1 haben ist auch longest != null.
    const winWithLast = s.settings.gameSettings.winWithLast;
    willWin = (xorSum > 1 || ((xorSum === 1) === winWithLast));

    if (longest.size === 1) {
      // noch mal Spezialfall: dann ist natuerlich jeder Zug gleichwertig
      forEachSeg(s, seg => {
        if (!seg.toggled) {
          found.push(new Move(seg.key, 0, 0));
        }
      });
    } else {
      if ((((xorSum ^ longest.size) & 1) === 0) === winWithLast) {
        // longest komplett streichen
        found.push(new Move(longest.key, 0, longest.size - 1));
      } else {
        // 2 moegliche Zuege:
        found.push(new Move(longest.key, 0, longest.size - 2));
        found.push(new Move(longest.key, 1, longest.size - 1));
      }
    }
  } else {
    // es gibt noch mind. 2 Segmente laenger als 1.
    willWin = (xorSum !== 0); // Es gibt einen Gewinnzug genau dann wenn xorSum nicht 0 ist.

    forEachSeg(s, seg => {
      if (!seg.toggled) {
        for (let first = 0; first < seg.size; ++first) {
          for (let last = first; last < seg.size; ++last) {
            if (!willWin ||
              (xorSum ^ seg.size ^ first ^ (seg.size - 1 - last)) === 0) {

              found.push(new Move(seg.key, first, last));
            }
          }
        }
      }
    });
  }

  let move;

  switch (s.settings.moveSettings[s.player].botStrategy) {
    case "SLOW":
      move = randomShortest(found);
      break;
    case "FAST":
      move = randomLongest(found);
      break;
    default: case "RANDOM":
      move = found[Math.floor(Math.random() * found.length)];
      break;
  }

  if (move == null) {
    throw 'move == null';
  } else {
    return [move, willWin];
  }
}

function startMove(draft: CheckboxingState, setFinishMoveTimeout: (CheckboxingState) => void) {
    const gs = draft.settings.gameSettings;

    if (gs.bot[draft.player]) {
      let curMove: Move;
      let willWin: boolean;
      [curMove, willWin] = findBotMove(draft);
      draft.curMove = curMove;
      draft.highlightedSegKey = draft.curMove.segKey;
      draft.st = "ANIMATE_BOT_MOVE";

      if (willWin) {
        draft.preWinner = draft.player;
      }
      setFinishMoveTimeout(draft);
    } else {
      draft.st = "BEFORE_FIRST";
      draft.curMove = undefined;
    }
}

function startGame(draft: CheckboxingState,
    setFinishMoveTimeout: CheckboxingState => void)
{
  draft.settings.loadFromLocalStorage();
  createRows(draft);
  draft.player = 0;
  draft.winner = undefined;
  draft.preWinner = undefined;

  startMove(draft, setFinishMoveTimeout);
}

// s not changed here
function findSeg(s: CheckboxingState, segKey: number): ?Segment {
  for (let i = 0; i < s.rows.length; ++i) {
    for (let j = 0; j < s.rows[i].length; ++j) {
      if (s.rows[i][j].key === segKey) {
        return s.rows[i][j];
      }
    }
  }

  return null;
}

// s treated here as immutable
function classNameFor(s: CheckboxingState, segKey: number): string {
  switch (s.st) {
    case "BEFORE_FIRST": {
      const seg = findSeg(s, segKey);
      return seg == null ? '' : !seg.toggled ? 'allowed' : 'unallowed';
    }
    case "BEFORE_LAST": {
      if (s.curMove == null) {
        console.error("curMove == null in BEFORE_LAST");
        return '';
      } else {
        return s.curMove.segKey === segKey ? 'allowed' : 'unallowed';
      }
    }
    case "ANIMATE_BOT_MOVE":
    return 'wait';
    default: case "SHOW_WINNER":
    return 'unallowed';
  }
}

function tryGameOver(draft: CheckboxingState): boolean {
  // { draft.player ist noch der Spieler, der eben einen Zug gemacht hat }

  for (let i = 0; i < draft.rows.length; ++i) {
    for (let j = 0; j < draft.rows[i].length; ++j) {
      if (!draft.rows[i][j].toggled) {
        return false;
      }
    }
  }

  // Ja, game over.
  // { draft.player hat den letzten Zug im Spiel gemacht }

  draft.winner = (draft.settings.gameSettings.winWithLast ? draft.player : otherPlayer(draft.player));

  if (draft.preWinner != null && draft.preWinner !== draft.winner) {
    throw 'Oops, preWinner !== winner';
  }

  draft.st = "SHOW_WINNER";
  return true;
}

function finishMove(draft: CheckboxingState, setFinishMoveTimeout: CheckboxingState => void): void {
  if (draft.curMove == null) {
    throw 'curMove null in finishMove';
  }
  draft.curMove.execute(draft);
  draft.curMove = undefined;
  draft.highlightedSegKey = -1;

  if (!tryGameOver(draft)) {
    draft.player = otherPlayer(draft.player);
    startMove(draft, setFinishMoveTimeout);
  }

}

type SegmentCompProps = {
  seg: Segment,
  onClick?: SegEventHandler,
  onMouseOver: SegEventHandler,
  st: CheckboxingState,
}

class SegmentComp extends React.Component<SegmentCompProps> {
  onClick = (unit:number) => {
    if (this.props.onClick) {
      this.props.onClick(this.props.seg.key, unit);
    } else {
      console.warn("SegmentComp: onClick empty");
    }
  }
  render(): React.Node {
    console.log("SegmentComp.render: highlightedSegKey=", this.props.st.highlightedSegKey);
    let units: Array<React.Node> = [];

    for (let i = 0; i < this.props.seg.size; ++i) {
      console.log(this.props.seg.toggled, this.props.st.curMove);
      const left = min(this.props.st.curMove?.first, this.props.st.curMove?.last);
      const right = max(this.props.st.curMove?.first, this.props.st.curMove?.last);

      const checked: boolean = this.props.seg.toggled ||
          (this.props.st.curMove == null ? false : (this.props.st.curMove.segKey === this.props.seg.key &&
          i >= left && i <= right));
      console.log("segKey", this.props.seg.key, "checked", checked);
      console.log("this.props.st.curMove", this.props.st.curMove);
      units.push(<input type='checkbox'
        key={this.props.seg.key + "." + i}
        className={this.props.st.highlightedSegKey === this.props.seg.key ? 'box highlighted' : 'box'}
        checked={checked}
        readOnly={true}
        onClick={() => this.onClick(i)}
        onMouseOver={() => this.props.onMouseOver(this.props.seg.key, i)}/>);
    }

    return (
      <div className={classNameFor(this.props.st, this.props.seg.key) + (this.props.st.highlightedSegKey === this.props.seg.key ? ' highlighted' : '')}
      title={this.props.seg.toggled ? '' : this.props.seg.size}
      >
      {units}
      </div>
    );
  }
}

type RowProps = {
  segs: Array<Segment>,
  onClick: SegEventHandler,
  onMouseOver: SegEventHandler,
  st: CheckboxingState,
}

class RowComp extends React.Component<RowProps> {
  render(): React.Node {
    const segs = this.props.segs.map((seg, i) =>
      <SegmentComp
        key={seg.key}
        seg={seg}
        onClick={this.props.onClick}
        onMouseOver={this.props.onMouseOver}
        st={this.props.st}
      />
    );

    return (
      <div className='row'>
      {segs}
      </div>
    );
  }
}

type BoardProps = {
  rows: Array<Array<Segment>>,
  onClick: SegEventHandler,
  onMouseOver: SegEventHandler,
  st: CheckboxingState,
}

type BoardState = {

}

class Board extends React.Component<BoardProps, BoardState> {
  renderRow(row: Array<Segment>): React.Node {

  }

  render(): React.Node {
    return (
      <div className='board'>
      {this.props.rows.map((row, i) =>
        <RowComp key={i}
          segs={row}
          onClick={this.props.onClick}
          onMouseOver={this.props.onMouseOver}
          st={this.props.st}
        />)}
      </div>
    )
  }
}


class RulesComp extends React.Component<{}> {
  render(): React.Node {
    return (
      <div className='rules'>
      <h3>Spielregeln</h3>
      <p>
      In diesem Spiel für 2 Spieler streichen bzw. selektieren diese
      abwechselnd ein zusammenhängendes Segment von Checkboxen in einer
      beliebigen Zeile. Der Spieler, der das letzte Segment streicht, verliert
      oder gewinnt, je nach vereinbarter Variante.
      </p>
      </div>
    );
  }
}

type TipsProps = {
  paragraphs: Array<React.Node>,
  visibilities: Array<boolean>
}

class Tips extends React.Component<TipsProps> {

  classFor(i: number):string {
    return this.props.visibilities[i] ? "tip" : "none";
  }

  render(): React.Node {
    return (
      <div>
        {
          this.props.paragraphs.map((tip, i) =>
          <div key={i} className={this.classFor(i)}>
            <h3>Tipp {i + 1}</h3>
            {tip}
          </div>
        )}
      </div>
    );
  }
}


class Checkboxing extends React.Component<CheckboxingProps, CheckboxingState> {
  _isMounted: boolean = false;

  constructor(props:{}) {
    super(props);

    this.state = {
      settingsVisible: false,
      rulesVisible: false,
      tipVisibilities: [],
      settings: new Settings.Settings(),
      rows: [],
      nextSegKey: 0,
      highlightedSegKey: -1, // -1 which is never used for any Segment
      curMove: undefined,
      st: "BEFORE_FIRST", // irgendwas, wird spaeter gesetzt entsprechend settings
      player: 0,
      winner: undefined,
      preWinner: undefined,
      finishMoveTimeout: undefined,
    };
    startGame(this.state, this.setFinishMoveTimeout);

    // TODO entsprechend settings Spiel starten und st setzen

    // // fake(s) for testing:
    // this.state.highlightedSegKey = 1;
    // this.state.curMove = new Move(3, 1, 2);
    // this.state.rows[4][0].toggled = true;

  }

  // s wird hier nur gelesen.
  setFinishMoveTimeout: CheckboxingState => void = (s) => {
    if (this._isMounted) {
      setTimeout(this.onFinishMoveTimeout, s.settings.moveSettings[s.player].animationMs);
    }
  }

  onFinishMoveTimeout: void => void = () => {
    if (this._isMounted) { // sollte ueberfluessig sein, schadet nicht.
      this.setState(produce(this.state, draft => {
        finishMove(draft, this.setFinishMoveTimeout);
      }));
    }
  }

  onMouseOver: SegEventHandler = (segKey, unit) => {
    const s = this.state;

    switch (s.st) {
      case "BEFORE_LAST": {
        if (s.curMove == null) {
          throw 'curMove null in BEFORE_LAST';
        } else {
          let curMove: Move = s.curMove;

          if (segKey === curMove.segKey) {
            this.setState(produce(this.state, draft => {
              if (draft.curMove == null) {
                throw 'curMove null in BEFORE_LAST';
              }
              draft.curMove.last = unit;
            }));
          }
        }

      }
    }
  }

  onClick: SegEventHandler = (segKey, unit) => {
    const s = this.state;

    switch (s.st) {
      case "BEFORE_FIRST": {
        this.setState(produce(this.state, draft => {
          draft.curMove = new Move(segKey, unit, unit);
          draft.highlightedSegKey = segKey;
          draft.st = "BEFORE_LAST";
        }));
        break;
      }
      case "BEFORE_LAST": {
        if (s.curMove == null) {
          throw 'curMove null in BEFORE_LAST';
        } else {
          let curMove: Move = s.curMove;

          if (segKey === curMove.segKey) {
            this.setState(produce(this.state, draft => {
              if (draft.curMove == null) {
                throw 'curMove null in BEFORE_LAST';
              }
              draft.curMove.last = unit;
              if (draft.curMove.last < draft.curMove.first) {
                const tmp = draft.curMove.first;
                draft.curMove.first = draft.curMove.last;
                draft.curMove.last = tmp;
              }
              finishMove(draft, this.setFinishMoveTimeout);
            }));
          }
        }
        break;
      }
      default:
        break;
    }
  }

  onSettings: void => void = () => {
    this.setState(produce(this.state, draft => {
      draft.settingsVisible = !draft.settingsVisible;
    }));
  }

  onRules: void => void = () => {
    this.setState(produce(this.state, draft => {
      draft.rulesVisible = !draft.rulesVisible;
    }));
  }

  onTip: number => void => void = (i) => () => {
    console.log("onTip: i=", i);
    this.setState(produce(this.state, draft => {
      draft.tipVisibilities[i] = !draft.tipVisibilities[i];
    }));
  }

  componentDidMount() {
    if (!this._isMounted) {
      document.title = 'Checkboxing';
      this._isMounted = true;

      if (this.state.st === "ANIMATE_BOT_MOVE") {
        this.setFinishMoveTimeout(this.state);
      }
    } else {
      console.info("componentDidMount called when already _isMounted");
    }
  }

  presentPreWinner(): React.Node {
    const s = this.state;
    const anyBot = s.settings.gameSettings.bot[0] || s.settings.gameSettings.bot[1];
    const botPreWinner = (
      s.preWinner != null && s.settings.gameSettings.bot[s.preWinner]
    );
    const equalBots = (
      s.settings.gameSettings.bot[0] === s.settings.gameSettings.bot[1]);

    return (
      s.winner == null && anyBot ?
        botPreWinner ?
          <p>
            Computer{equalBots && s.preWinner != null ? "" + (s.preWinner + 1) : ""}: <q>Gut möglich, dass ich das gewinne... ;-)</q>
            <img src='/SmilingComputer.gif' alt='Lachender Computer' width='232px'/>
          </p>
        :
          <p>
            Computer{equalBots && s.preWinner ? "" + (s.preWinner + 1) : ""}: <q>Mal sehen...</q>
          </p>
      :
        <></>
    );
  }

  presentWinner(): React.Node {
    const s = this.state;

    if (s.winner == null) {
      throw 'winner null in presentWinner';
    }

    const botWins = s.settings.gameSettings.bot[s.winner];
    const equalBots = (
      s.settings.gameSettings.bot[0] === s.settings.gameSettings.bot[1]);
    const winner1 = s.winner + 1;
    const lastWins = s.settings.gameSettings.winWithLast;

    return (
      // Glueckwunsch nur falls Mensch gewonnen hat:
      <>
      {
        !botWins ?
          <div style={{textAlign: 'center'}}>
          <img src='/Pokal.jpeg' alt='Pokal'/>
          <h3 className='congrats'>
          Herzlichen Glückwunsch{equalBots ? ", Spieler " + winner1 : ""}!
          </h3>
          </div>
        :
          <div><img src='/Pokal.jpeg' alt='Pokal'/><img src='/SmilingComputer.gif' alt='Lachender Computer'  width='232px'/></div>
      }
      {
        botWins ?
          <>{equalBots ? "" : "Der "}Computer {equalBots ? winner1 + " " : ""}
          gewinnt, da er
          {lastWins ? "" : " nicht"} den letzten
          Zug gemacht hat.</>
        :
          equalBots ?
            <>Spieler {winner1} gewinnt, da er{lastWins ? "" : " nicht"} den letzten
            Zug gemacht hat.</>
          :
            <>Du gewinnst, da du
            {lastWins ? "" : " nicht"} den letzten Zug
            gemacht hast.</>
      }
      </>
    );
  }

  updateSettings: Settings.Settings => void = (settings) => {
    settings.saveToLocalStorage();
    this.setState(produce(this.state, (draft) => {
      draft.settings.moveSettings = settings.moveSettings;
    }));

  }

  onRestart: void => void = () => {
    this.setState(produce(this.state, draft => {
      startGame(draft, this.setFinishMoveTimeout);
    }));
  }

  render()/*: React.Node*/ {
    const s = this.state;
    console.log("Checkboxing.render: this.state.highlightedSegKey=", s.highlightedSegKey);

    const tipParagraphs: Array<React.Node> = [

      <p>
      Bei diesem Spiel mit perfekter Information existiert je nach Zeilenanzahl
      eine Gewinnstrategie für den anziehenden oder anderen Spieler.
      </p>,

      <p>
      XOR... ;-)
      </p>,

      <p>
      Die Gewinnstrategie besteht darin, eine bestimmte Invariante im Zusammenhang
      mit der XOR-Summe über die Längen aller verbleibenden Segmente nach jedem
      eigenen Zug herzustellen. Die Frage ist nun welche... ;-)
      </p>,

      <p>
      Für die Variante, in der der gewinnt, der das letzte Segment streicht,
      ist die Invariante <q>XOR-Summe = 0</q>. Für die andere Variante muss diese
      für bestimmte Situationen gegen Ende des Spiels angepasst werden.
      </p>,

      <p>
      {calcXorSum(s)} ;-)
      </p>

    ];

    return (
      <div>
        <header>
          <h1>Checkboxing</h1>
          <h2>Mein "Hello-world" zu ReactJs, Immer und Flow</h2>
          <em>Vielen Dank für diese genialen Libs und Tools!</em>
        </header>
        <div className='main'>
          <div className='left'>
            <Board rows={s.rows}
              onClick={this.onClick}
              onMouseOver={this.onMouseOver}
              st={s}
            />
            <div>
              <button onClick={this.onRestart}>Neues Spiel</button>
              <button className={s.settingsVisible ? 'toggled' : 'untoggled'} onClick={this.onSettings}>Einstellungen ...</button>
              <button className={s.rulesVisible ? 'toggled' : 'untoggled'} onClick={this.onRules}>Spielregeln ...</button>
            </div>
            {tipParagraphs.map((p, i) =>
              <button key={i} className={s.tipVisibilities[i] ? 'toggled' : 'untoggled'} onClick={this.onTip(i)}>Tipp {i + 1} ...</button>
            )}
          </div>
          <div className='right'>
            <p className='lightHint'>Eingestellte Variante: <em>Letzter Zug {s.settings.gameSettings.winWithLast ? "gewinnt" : "verliert"}.</em></p>
            {this.presentPreWinner()}
            {
              s.st === "BEFORE_FIRST" || s.st === "BEFORE_LAST" ?
                s.settings.gameSettings.bot[otherPlayer(s.player)] ?
                  <div>Du bist dran.</div> :
                  <div>Spieler {s.player + 1} ist dran.</div> :
                s.st === "ANIMATE_BOT_MOVE" ?
                  s.settings.gameSettings.bot[otherPlayer(s.player)] ?
                    <div>Computer {s.player + 1} ist dran.</div> :
                    <div>Der Computer ist dran.</div> : // else SHOW_WINNER
                  <div>
                    <p>Das Spiel ist zuende.</p>
                    {this.presentWinner()}
                  </div>
            }
            {
              s.st === "BEFORE_FIRST" ?
                <p className='lightHint'>
                Bitte einen Zug machen mit 2 Klicks erst auf den Anfang, dann
                das Ende des zu streichenden Segments.
                - Und ja, es ist egal ob der Anfang links oder rechts ist. ;-)
                </p>
              :
                s.st === "BEFORE_LAST" ?
                  <p className='lightHint'>
                    Bitte den Zug abschließen und auf das Ende des zu
                    streichenden Segments klicken.
                  </p>
                :
                  s.st === "ANIMATE_BOT_MOVE" ?
                    <p className='lightHint'>
                      Bitte warten.
                    </p>
                  :
                    <p className='lightHint'>
                      Du könntest jetzt ein neues Spiel starten oder die
                      Einstellungen ändern - oder Tipps angucken...
                    </p>
            }
            {
              s.settingsVisible ?
                <EditSettings settings={s.settings} onApply={this.updateSettings}/>
              :
                <></>
            }
            {
              s.rulesVisible ? <RulesComp/> : <></>
            }
            <Tips paragraphs={tipParagraphs} visibilities={s.tipVisibilities}/>
          </div>
        </div>
      </div>
    );
  }
}

export default Checkboxing;
