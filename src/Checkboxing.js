// @flow

import * as React from 'react';
import produce from "immer";

import './Checkboxing.css';

import * as Settings from './Settings';
import * as EditSettings from './EditSettings';

const swapPlayer = Settings.swapPlayer;

function min(a:number, b:number):number {
  return a < b ? a : b;
}

function max(a:number, b:number):number {
  return a > b ? a : b;
}

// class Segment {
//   constructor(size, toggled) {
//     this.size = size;
//     this.toggled = toggled;
//     this.first = -1;
//     this.last = -1;
//   }
//
//   render = (onClick, onMouseOver, highlight) => {
//     let units = [];
//     // console.log("Segment.render: onClick=", onClick, "highlight=", highlight);
//
//     const first1 = this.first < this.last ? this.first : this.last;
//     const last1 = this.first > this.last ? this.first : this.last;
//     const divClass = (highlight ? 'seg highlight' : 'seg notHighlight');
//
//     for (let i = 0; i < this.size; ++i) {
//       units.push(<input type="checkbox" className='box' checked={this.toggled || (i >= first1 && i <= last1)} readOnly
//         onClick={() => onClick(i)}
//         onMouseOver={() => onMouseOver(i)}/>);
//     }
//
//     return (
//       <div className={divClass}>
//         {units}
//       </div>
//     );
//   }
//
//   setFirst = (x) => {
//     this.first = this.last = x;
//   }
//
//   doMove = () => {
//     let res = [];
//     const first = min(this.first, this.last);
//     const last = max(this.first, this.last);
//
//     if (!this.toggled && first >= 0 && first < this.size && last >= 0 && last < this.size) {
//       if (first > 0) {
//         res.push(new Segment(first, false));
//       }
//
//       res.push(new Segment(last - first + 1, true));
//
//       if (last < this.size - 1) {
//         res.push(new Segment(this.size - 1 - last, false));
//       }
//     } else {
//       res.push(this);
//     }
//
//     return res;
//   }
// }

function segment_constructor(size: number, toggled: boolean) {
  return {
    size: size,
    toggled: toggled,
    first: -1,
    last: -1
  };
}

type Segment = {
  size: number,
  toggled: boolean,
  first: number,
  last: number
}

function segment_render(that:Segment, onClick:number => void, onMouseOver: number => void, highlight: boolean, idx: number): React.Node {
  let units:Array<React.Node> = [];
  // console.log("segment_render: onClick=", onClick, "highlight=", highlight);

  const first1 = that.first < that.last ? that.first : that.last;
  const last1 = that.first > that.last ? that.first : that.last;
  const divClass = (highlight ? 'seg highlight' : 'seg notHighlight');

  for (let i = 0; i < that.size; ++i) {
    units.push(<input key={i} title={that.toggled ? "" : that.size} type="checkbox" className='box' checked={that.toggled || (i >= first1 && i <= last1)} readOnly
      onClick={() => onClick(i)}
      onMouseOver={() => onMouseOver(i)}/>);
  }

  return (
    <div key={idx} className={divClass} title={that.size}>
      {units}
    </div>
  );
}

function segment_setFirst(that: Segment, x: number) {
  that.first = that.last = x;
}

function segment_doMove(that: Segment): Array<Segment> {
  let res = [];
  const first = min(that.first, that.last);
  const last = max(that.first, that.last);

  if (!that.toggled && first >= 0 && first < that.size && last >= 0 && last < that.size) {
    if (first > 0) {
      res.push(segment_constructor(first, false));
    }

    res.push(segment_constructor(last - first + 1, true));

    if (last < that.size - 1) {
      res.push(segment_constructor(that.size - 1 - last, false));
    }
  } else {
    res.push(that);
  }

  return res;
}

// class Row {
//   constructor(size) {
//     this.size = size;
//     this.segments = [segment_constructor(size, false)];
//   }
//
//   render = (onClick, onMouseOver, highlightSegIdx) => {
//     let i = 0;
//     // console.log("Row.render: this.segments", this.segments, highlightSegIdx);
//
//     return (
//       <div className='row'>
//         {this.segments.map(seg => {
//           const idx = i++;
//           return segment_render(seg, onClick(idx), onMouseOver(idx), highlightSegIdx != null && highlightSegIdx === idx);
//         })}
//       </div>
//     );
//   }
//
// }

type Row = {
  segments: Array<Segment>
}

function row_constructor(size: number) {
  return {
    segments: [segment_constructor(size, false)]
  };
}

function row_render(that: Row, onClick: number => number=> void, onMouseOver: number => number => void, highlightSegIdx: number | null, rowIdx: number) {
  let i: number = 0;
  // console.log("row_render: that.segments", that.segments, highlightSegIdx);

  return (
    <div key={rowIdx} className='row'>
      {that.segments.map(seg => {
        const idx = i++;
        return segment_render(seg, onClick(idx), onMouseOver(idx), highlightSegIdx != null && highlightSegIdx === idx, idx);
      })}
    </div>
  );
}

// CheckboxingState1 = Class.freeze({
//   BEFORE_FIRST: "BEFORE_FIRST",
//   BEFORE_LAST: "BEFORE_LAST",
//   ANIMATE_BOT_MOVE: "ANIMATE_BOT_MOVE",
//   SHOW_WINNER: "SHOW_WINNER"
// });

type CheckboxingState =
  "BEFORE_FIRST" |
  "BEFORE_LAST" |
  "ANIMATE_BOT_MOVE" |
  "SHOW_WINNER";


// class CheckboxingState {
//   constructor(name) {
//     this.name = name;
//   }
//
//   static BEFORE_FIRST = new CheckboxingState("BEFORE_FIRST");
//   static BEFORE_LAST = new CheckboxingState("BEFORE_LAST");
//   static ANIMATE_BOT_MOVE = new CheckboxingState("ANIMATE_BOT_MOVE");
//   static SHOW_WINNER = new CheckboxingState("SHOW_WINNER");
//
//   toString = () => {
//     return this.name;
//   }
// }

class Move {
  row: number;
  seg: number;
  first: number;
  last: number;

  constructor(row: number, seg: number, first: number, last: number) {
    if (seg == null) {
      console.error("Move.constructor", row, seg, first, last);
    }
    this.row = row;
    this.seg = seg;
    this.first = first;
    this.last = last;
  }

  toString: void => string = () => {
    return "Move(" + JSON.stringify(this) + ")";
  }
}

function calcXorSum(moves: Array<Move>): number {
  let sum = 0;

  for (let i = 0; i < moves.length; ++i) {
    const size = moves[i].last - moves[i].first + 1;
    sum ^= size;
  }

  return sum;
}

function calcXorSumForBoard(board:Array<Row>): number {
  let sum = 0;

  for (let i = 0; i < board.length; ++i) {
    const row = board[i].segments;

    for (let j = 0; j < row.length; ++j) {
      const seg = row[j];

      if (!seg.toggled) {
        sum ^= seg.size;
      }
    }
  }

  return sum;
}

class Strategy {

  onlyOneUntoggledGt1 = (board: Array<Row>, outCount:[number]): ?Move => {
    let move = null;
    outCount[0] = 0;

    for (let i = 0; i < board.length; ++i) {
      const row = board[i].segments;

      for (let j = 0; j < row.length; ++j) {
        if (!row[j].toggled && row[j].size > 1) {
          if (++outCount[0] > 1) {
            return null;
          } else {
            if (row[j].size < 2) {
              console.error("row", row, ", j=", j);
            }
            move = new Move(i, j, 0, row[j].size - 2);
          }
        }
      }
    }

    return move;
  }

  longestSegmentIfOneOrNoneLongerThan1 = (moves: Array<Move>):?Move => {
    // setzt voraus, dass fuer alle Element in moves first == 0 ist, so dass nur last beruecksichtigt werden muss.
    let longest = null;
    let countGt1 = 0;
    let maxSize = 0;


    for (let i = 0; i < moves.length; ++i) {
      const size = moves[i].last + 1;

      if (size > maxSize) {
        longest = moves[i];
        maxSize = size;
      }

      if (size > 1) {
        ++countGt1;

        if (countGt1 > 1) {
          // mind. 2 laenger als 1, also null
          return null;
        }
      }
    }

    return longest;
  }

  // Sammle alle ungetoggelten Segmente in allen Reihen.
  // Sammle sie als Move-Objekte mit first = 0, last = size - 1; damit Zeilen- und Segment-Index nicht verloren gehen.
  collectUntoggledSegs = (board: Array<Row>): Array<Move> => {
    const moves = [];

    for (let i = 0; i < board.length; ++i) {
      const segs = board[i].segments;

      for (let j = 0; j < segs.length; ++j) {
        if (!segs[j].toggled) {
          moves.push(new Move(i, j, 0, segs[j].size - 1));
        }
      }
    }

    return moves;
  }

  pushAllPossibleMoves = (moves:Array<Move>, foundMoves:Array<Move>):void => {
    for (let i = 0; i < moves.length; ++i) {
      const m = moves[i];

      for (let first = 0; first <= m.last; ++first) {
        for (let last = first; last <= m.last; ++last) {
          foundMoves.push(new Move(m.row, m.seg, first, last));
        }
      }
    }
  }

  findMove = (board: Array<Row>, winWithLast: boolean, moveSettings: Settings.MoveSettings): [Move | null, boolean] => {
    console.log("in findMove: moveSettings=", moveSettings);
    // Fuer die Strategie sind nur nicht-getoggelte Segmente relevant.
    // Die Zeilenzugehoerigkeit von Segmenten ist fuer die Strategie ausserdem irrelevant.
    // Also fuer einfachere weitere Handhabung erst mal alle nicht-getoggelten in einem Array sammeln, aber als Moves, damit Zeilen- und Segmentindexe erhalten bleiben
    const moves = this.collectUntoggledSegs(board);
    let winning = false;

    if (winWithLast === undefined) {
      console.error("winWithLast undefined");
    }

    // Bilde xor-Summe ueber die Laengen aller noch nicht gecheckten Segmente.
    // Spezialfall, falls hoechstens ein Segment laenger als 1 ist. Sei size(longest) dessen Laenge.
    //   Dann gibt es einen Gewinnzug genau dann, wenn:
    //   xorSum > 1 || ((xorSum == 1) == winWithLast)
    //   Falls (((xorSum ^ size(longest)) & 1) == 0) == winWithLast ist, muss dann das laengste Segment komplett gestrichen werden.
    //   Andernfalls muss genau eine Checkbox uebrig gelassen werden, so dass die neue xorSum zum Wert von winWithLast passt.

    // Sonst (wenn mind. 2 Segmente laenger als 1 sind) gilt:
    //   Es gibt einen oder mehrere Gewinnzuege genau dann, wenn:
    //   xorSum == 0

    const xorSum = calcXorSum(moves);
    // longest: Move
    const longest = this.longestSegmentIfOneOrNoneLongerThan1(moves);

    const foundMoves = [];

    if (longest) {
      const size = longest.last + 1;
      winning = (xorSum > 1 || (xorSum === 1) === winWithLast);

      if (size === 1) {
        // Jeder Zug gleich, da es nur noch Segmente der Laenge 1 gibt. Also zufaellig eines auswaehlen:
        this.pushAllPossibleMoves(moves, foundMoves);
      } else {
        // { size > 1 }
        if ((((xorSum ^ size) & 1) === 0) === winWithLast) {
          // longest komplett checken
          foundMoves.push(longest);
        } else {
          // links oder rechts genau ein Kaestchen ungecheckt lassen
          foundMoves.push(new Move(longest.row, longest.seg, 0, longest.last - 1));
          foundMoves.push(new Move(longest.row, longest.seg, 1, longest.last));
        }
      }
    } else {
      // { Es existieren noch mind. 2 ungecheckte Segmente, die laenger als 1 sind. }

      if (xorSum === 0) {
        // Sieg nicht erzwingbar; alle moeglichen Zuege bilden
        winning = false;
        this.pushAllPossibleMoves(moves, foundMoves);
      } else {
        // Sieg erzwingbar; alle Zuege ermittlen, die eine neue xorSum == 0 bewirken, so dass dann der Gegner den Sieg wiederum nicht erzwingen kann
        winning = true;

        for (let i = 0; i < moves.length; ++i) {
          const m = moves[i];
          const size = m.last + 1;
          if (m.first !== 0) {
            console.error("Unerwarteter first wert in Element in moves: ", m);
            return [null, winning];
          }
          for (let first = 0; first <= m.last; ++first) {
            for (let last = first; last <= m.last; ++last) {
              if ((xorSum ^ size ^ first ^ (m.last - last)) === 0) {
                // Gewinnzug
                foundMoves.push(new Move(m.row, m.seg, first, last));
              }
            }
          }
        }
      }
    }

    console.log("moveSettings.botStrategy", moveSettings.botStrategy);
    console.log("typeof moveSettings.botStrategy", typeof moveSettings.botStrategy);
    if (moveSettings.botStrategy === "FAST") {
      console.log("FAST");
    } else {
      console.log("not FAST");
    }
    const bs: Settings.BotStrategy = moveSettings.botStrategy;
    switch (bs) {
      case "SLOW": {
        // moeglichst wenige Einzelkaestchen im zug checken
        let m = 0;
        let best = null;

        for (let i = 0; i < foundMoves.length; ++i) {
          const n = foundMoves[i].last - foundMoves[i].first + 1; // + 1 koennte man sich theoretisch noch sparen ;-)
          if (best === null) {
            best = foundMoves[i];
            m = n;
          } else {
            if (n < m) {
              best = foundMoves[i];
              m = n;
            }
          }
        }

        return [best, winning];
      }
      case "FAST": {
        // moeglichst viele Einzelkaestchen im Zug checken
        let m = 0;
        let best = null;
        console.log("fast:");

        for (let i = 0; i < foundMoves.length; ++i) {
          console.log("Betrachte ", foundMoves[i]);
          const n = foundMoves[i].last - foundMoves[i].first + 1; // + 1 koennte man sich theoretisch noch sparen ;-)
          if (best === null) {
            best = foundMoves[i];
            m = n;
          } else {
            if (n > m) {
              best = foundMoves[i];
              m = n;
            }
          }
        }

        return [best, winning];
      }
      default: case "RANDOM": {
        // zufaellige auswahl:
        return [foundMoves[Math.floor(Math.random() * foundMoves.length)], winning];
      }
      // default:  // jetzt unreachable dank flow! :-)
      //   console.error("unknown botStrategy");
      //   return [null, false];
      //   break;
    }
  }
}

var strategy = new Strategy();

type CheckboxingSt = {
  settings: Settings.Settings,
  showDebugInfo: boolean,
  hint: string,
  finishTimeout: any,
  player: Settings.Player,
  st: ?CheckboxingState,
  curMove: Move | null,
  board: Array<Row>,
  preWinner: ?Settings.Player,
  winner: ?Settings.Player,
};

class Checkboxing extends React.Component<{}, CheckboxingSt> {
  _isMounted: boolean = false;

  // state: {
  //   settings:Settings.Settings,
  //   showDebugInfo: boolean,
  //   hint: string,
  //   finishTimeout: any
  // }

  // @flow
  startMoveWithImmer(draft: CheckboxingSt): void {


    if (draft.settings.gameSettings.bot[draft.player]) {
      let winning: boolean = false;
      const moveSettings: Settings.MoveSettings = draft.settings.moveSettings[draft.player];
      console.log("vor findMove: moveSettings=", moveSettings);
      let curMove: Move | null;
      [curMove, winning] = strategy.findMove(draft.board, draft.settings.gameSettings.winWithLast, moveSettings);
      draft.curMove = curMove;

      console.log("strategy found move: ", draft.curMove);
      if (draft.curMove) {
        // folgendes muss fehler ausloesen und daher dann angepasst werden
        draft.board[draft.curMove.row].segments[draft.curMove.seg].first = draft.curMove.first;
        draft.board[draft.curMove.row].segments[draft.curMove.seg].last = draft.curMove.last;
        if (winning) {
          draft.preWinner = draft.player;
        }
        if (this._isMounted) {
          draft.finishTimeout = setTimeout(this.finishMoveWithImmer, draft.settings.moveSettings[draft.player].animationMs);
          // console.log("finishMove timeout by startMove");
        }
      }
      if (draft.settings.gameSettings.bot[swapPlayer(draft.player)]) {
        // Computer gegen Computer.
        draft.hint = "Computer " + (draft.player === 0 ? "1" : "2") + " ist am Zug.";
      } else {
        // Mensch gegen Computer
        draft.hint = "Bitte warten bis der Computer zieht...";
      }
      draft.st = "ANIMATE_BOT_MOVE";
    } else {
      draft.curMove = null;
      if (draft.settings.gameSettings.bot[0] === draft.settings.gameSettings.bot[1]) {
        // Hinweis, welcher Spieler am Zug ist notwendig
        draft.hint = "Spieler " + (draft.player === 0 ? "1" : "2") + " ist am Zug. ";
      } else {
        draft.hint = "";
      }
      draft.hint += "Bitte Kästchen am Anfang des Bereichs anklicken, der gestrichen werden soll.";
      draft.st = "BEFORE_FIRST";
    }
  };

  // startMove = (changes) => {
  //   // BEGIN vorerst stateIm als frozen copy, spaeter optimiert direkt this.state verwenden, wenn sicher ist dass es nicht geaendert wird
  //   let stateIm = {};
  //   Object.assign(stateIm, this.state);
  //   Object.freeze(stateIm);
  //   // END
  //
  //   // let stateIm = this.state; // spaeter dann
  //
  //   let st;
  //   let curMove;
  //   const settingsIm = (changes.settings === undefined ? stateIm.settings : changes.settings);
  //   console.log("this.state", this.state);
  //   console.log("settingsIm", settingsIm);
  //   const boardMutable = (changes.board === undefined ? structuredClone(stateIm.board) : changes.board);
  //   let hint;
  //   let finishTimeout = null;
  //   const playerIm = (changes.player === undefined ? stateIm.player : changes.player);
  //
  //   if (settingsIm.bot[playerIm]) {
  //     const winning = [false];
  //     curMove = strategy.findMove(boardMutable, settingsIm.winWithLast, /*out*/ winning);
  //     console.log("strategy found move: ", curMove);
  //     if (curMove) {
  //       // folgendes muss fehler ausloesen und daher dann angepasst werden
  //       boardMutable[curMove.row].segments[curMove.seg].first = curMove.first;
  //       boardMutable[curMove.row].segments[curMove.seg].last = curMove.last;
  //       if (winning[0]) {
  //         changes.preWinner = playerIm;
  //       }
  //       if (this._isMounted) {
  //         finishTimeout = setTimeout(this.finishMove, 1000);
  //         // console.log("finishMove timeout by startMove");
  //       }
  //     }
  //     if (settingsIm.bot[1 - playerIm]) {
  //       // Computer gegen Computer.
  //       hint = "Computer " + (playerIm === 0 ? "1" : "2") + " ist am Zug.";
  //     } else {
  //       // Mensch gegen Computer
  //       hint = "Bitte warten bis der Computer zieht...";
  //     }
  //     st = CheckboxingState.ANIMATE_BOT_MOVE;
  //   } else {
  //     curMove = null;
  //     if (settingsIm.gameSettings.bot[0] === settingsIm.gameSettings.bot[1]) {
  //       // Hinweis, welcher Spieler am Zug ist notwendig
  //       hint = "Spieler " + (playerIm === 0 ? "1" : "2") + " ist am Zug. ";
  //     } else {
  //       hint = "";
  //     }
  //     hint += "Bitte Kästchen am Anfang des Bereichs anklicken, der gestrichen werden soll.";
  //     st = CheckboxingState.BEFORE_FIRST;
  //   }
  //
  //   // TODO folgendes noch nicht vollstaendig, muessen noch die aenderungen fuer board rein:
  //   Object.assign(changes, {
  //     st: st,
  //     board: boardMutable,
  //     curMove: curMove,
  //     hint: hint,
  //     finishTimeout: finishTimeout
  //   });
  //   // console.log("nach Object.assign in startMove");
  // }

  // changes enthaelt Aenderungen, die spaeter mit setState() gesetzt werden sollen
  checkGameOverWithImmer: (draft:CheckboxingSt) => boolean = ((draft) => {
    // { this.state.player enthaelt den Spieler, der als naechstes dran ist, falls es noch einen Zug gibt }
    // const s = this.state;

    const rows = draft.board;
    const settings = draft.settings;
    const player = draft.player;
    let anyUntoggled = false;

    for (let i = 0; i < rows.length; ++i) {
      const row = rows[i].segments;
      for (let j = 0; j < row.length; ++j) {
        if (!row[j].toggled) {
          anyUntoggled = true;
          break;
        }
      }
    }

    if (!anyUntoggled) {
      if (settings.gameSettings.winWithLast) {
        // Wer nun dran waere, aber nicht mehr ziehen kann, hat verloren.
        draft.winner = swapPlayer(player);
      } else {
        // Wer nun dran waere, aber nicht mehr ziehen, kann hat gewonnen.
        draft.winner = player;
      }
      draft.st = "SHOW_WINNER";
      draft.hint = "";
      // console.log("SHOW_WINNER set");
      return true;
    }

    return false;
  });

  // // changes enthaelt Aenderungen, die spaeter mit setState() gesetzt werden sollen
  // checkGameOver = (changes) => {
  //   // { this.state.player enthaelt den Spieler, der als naechstes dran ist, falls es noch einen Zug gibt }
  //   const s = this.state;
  //
  //   const rowsIm = (changes.board === undefined ? s.board : changes.board);
  //   const settingsIm = (changes.settings === undefined ? s.settings : changes.settings);
  //   const playerIm = (changes.player === undefined ? s.player : changes.player);
  //   let anyUntoggled = false;
  //
  //   for (let i = 0; i < rowsIm.length; ++i) {
  //     const rowIm = rowsIm[i].segments;
  //     for (let j = 0; j < rowIm.length; ++j) {
  //       if (!rowIm[j].toggled) {
  //         anyUntoggled = true;
  //         break;
  //       }
  //     }
  //   }
  //
  //   if (!anyUntoggled) {
  //     if (settingsIm.winWithLast) {
  //       // Wer nun dran waere, aber nicht mehr ziehen kann, hat verloren.
  //       changes.winner = 1 - playerIm;
  //     } else {
  //       // Wer nun dran waere, aber nicht mehr ziehen, kann hat gewonnen.
  //       changes.winner = playerIm;
  //     }
  //     changes.st = CheckboxingState.SHOW_WINNER;
  //     changes.hint = "";
  //     // console.log("SHOW_WINNER set");
  //     return true;
  //   }
  //
  //   return false;
  // }

  finishMoveWithImmer: () => void = () => {
    this.setState(produce(this.state, (draft) => {
      if (draft.curMove == null) {
        console.log("oh oh");
      }
      // console.log("finishMove: this.state=", this.state);

      if (draft.curMove !== null) {
        let curMove: Move = draft.curMove;
        const theRow = draft.board[curMove.row];
        const theSeg = theRow.segments[curMove.seg];
        const newSegments = segment_doMove(theSeg);
        theRow.segments = theRow.segments.slice(0, curMove.seg).concat(newSegments).concat(theRow.segments.slice(curMove.seg + 1, theRow.segments.length));
        draft.player = swapPlayer(draft.player);

        if (!this.checkGameOverWithImmer(draft)) {
          // falls nicht zuende:
          this.startMoveWithImmer(draft);
        }
      } else {
        console.error("draft.curMove null unexpected!");
      }
    }));
  };

  // finishMove = (changes1) => {
  //   let changes = changes1;
  //
  //   if (!changes) {
  //     changes = {};
  //   }
  //
  //   const s = this.state;
  //
  //   if (s.curMove == null) {
  //     console.log("oh oh");
  //   }
  //   // console.log("finishMove: this.state=", this.state);
  //
  //   if (changes.board === undefined) {
  //     changes.board = structuredClone(s.board);
  //   }
  //
  //   if (changes.player === undefined) {
  //     changes.player = s.player;
  //   }
  //
  //   const theRow = changes.board[s.curMove.row];
  //   const theSeg = theRow.segments[s.curMove.seg];
  //   const newSegments = segment_doMove(theSeg);
  //   theRow.segments = theRow.segments.slice(0, s.curMove.seg).concat(newSegments).concat(theRow.segments.slice(s.curMove.seg + 1, theRow.segments.length));
  //   changes.player = 1 - changes.player;
  //
  //   if (!this.checkGameOver(changes)) {
  //     // falls nicht zuende:
  //     this.startMove(changes);
  //   }
  //
  //   this.setState(changes);
  // }

  constructor(props:{}) {
    super(props);

    this._isMounted = false;

    this.state = {
      showDebugInfo: false,
      hint: "",
      finishTimeout: null,
      board:[],
      curMove:null,
      player:0,
      preWinner:undefined,
      settings:new Settings.Settings(),
      st:undefined,
      winner:undefined
    };


    // cumbersome old version without immer:
    // let stateChanges = {};
    // this.restart(stateChanges);
    // Object.assign(this.state, stateChanges);

    // new with immer
    this.restartWithImmer(this.state);
  }

  onClick: number => number => number => void = (row:number) => (seg:number) => (unit:number) => {
    const s = this.state;
    const st = this.state.st;

    switch (st) {
      case "BEFORE_FIRST": {

        // // alt ohne Immer:
        // console.log("vor structureClone: s.board=", s.board);
        // const boardMutable = structuredClone(s.board);
        // let theRow = boardMutable[row];
        // const segments = theRow.segments;
        // let theSeg = segments[seg];
        // segment_setFirst(theSeg, unit);
        //
        // this.setState({
        //   board: boardMutable,
        //   hint: "Bitte Kästchen am Ende des Bereichs anklicken, der gestrichen werden soll.",
        //   st: CheckboxingState.BEFORE_LAST,
        //   curMove: new Move(row, seg, unit, unit)
        // });

        // neu mit immer:
        this.setState(produce(this.state, (draft) => {
          let theRow = draft.board[row];
          const segments = theRow.segments;
          let theSeg = segments[seg];
          segment_setFirst(theSeg, unit);
          Object.assign(draft, {
            hint: "Bitte Kästchen am Ende des Bereichs anklicken, der gestrichen werden soll.",
            st: "BEFORE_LAST",
            curMove: new Move(row, seg, unit, unit)
          });
        }));
        break;
      }

        case "BEFORE_LAST": {
          // Invariante: st != "BEFORE_LAST" || curMove != null

          if (s.curMove) {
            // aktuelles Segment ersetzen durch 1 bis 3 neue Segmente
            if (row !== s.curMove.row || seg !== s.curMove.seg) {
              return;
            }

            // this.finishMove(); // calls setState()
            this.finishMoveWithImmer();
          } else {
            console.error("!s.curMove in BEFORE_LAST");
          }
          break;
        }

      default:
        console.log("in state ", st);
    }
  };

  onMouseOver: number => number => number => void = (row:number) => (seg:number) => (unit:number) => {
    const s = this.state;

    switch (s.st) {
      case "BEFORE_LAST": {

        // // alt ohne Immer:
        // if (!s.curMove || row !== s.curMove.row || seg !== s.curMove.seg) {
        //   return;
        // }
        //
        // const boardMutable = structuredClone(s.board);
        // boardMutable[row].segments[seg].last = unit;
        // this.setState({
        //   board: boardMutable
        // });

        // neu mit Immer:
        this.setState(produce(this.state, (draft) => {
          if (!draft.curMove || row !== draft.curMove.row || seg !== draft.curMove.seg) {
            return;
          }
          draft.board[row].segments[seg].last = unit;
        }));
        break;
      }

      default:
      break;
    }
  };

  // sets new values for state in changes that shall to set in new state afterwards
  restartWithImmer: CheckboxingSt => void = (draft) => {
    // erst ggf. finishTimeout stoppen!

    if (draft.finishTimeout) {
      clearTimeout(draft.finishTimeout);
      draft.finishTimeout = null;
    }

    let settings = new Settings.Settings();
    settings.loadFromLocalStorage();
    let board = [];

    for (let i = 0; i < settings.gameSettings.rows; ++i) {
      board.push(row_constructor(i + 1));
    }

    Object.assign(draft, {
      settings: settings,
      board: board,
      player: 0,
      curMove: null,
      preWinner: null
    });
    this.startMoveWithImmer(draft);

  }

  // // sets new values for state in changes that shall to set in new state afterwards
  // restart: Checkbox = (changes) => {
  //   const s = this.state;
  //   // erst ggf. finishTimeout stoppen!
  //
  //   if (s.finishTimeout) {
  //     clearTimeout(s.finishTimeout);
  //     changes.finishTimeout = null;
  //   }
  //
  //   let settings = new Settings();
  //   settings.gameSettings.loadFromLocalStorage();
  //   let board = [];
  //
  //   for (let i = 0; i < settings.gameSettings.rows; ++i) {
  //     board.push(row_constructor(i + 1));
  //   }
  //
  //   Object.assign(changes, {
  //     settings: settings,
  //     board: board,
  //     player: 0,
  //     curMove: null,
  //     preWinner: null
  //   });
  //   this.startMove(changes);
  //
  // }

  onRestartWithImmer: void => void = () => {
    this.setState(produce(this.state, this.restartWithImmer));
  }

  // onRestart = () => {
  //   let changes = {};
  //   this.restart(changes);
  //   // console.log("onRestart - vor setState: changes=", changes);
  //   this.setState(changes);
  // }

  onSettings: void => void = () => {
    window.alert("Would show settings now");
  }

  onDebugInfoChange: any => void = (event) => {
    this.setState({
      showDebugInfo: event.target.checked
    });
  }

  computerOrHuman: number => string = (p) => {
    return this.state.settings.gameSettings.bot[p] ? " [Computer] " : " [Mensch] ";
  }

  updateSettings: Settings.Settings => void = (settings) => {
    console.log("updateSettings: settings=", settings);
    settings.saveToLocalStorage();
    this.setState(produce(this.state, (draft) => {
      draft.settings.moveSettings = settings.moveSettings;
    }));
  }

  onShowXor: void => void = () => {
    window.alert(calcXorSumForBoard(this.state.board));
  }

  render: void => React.Node = () => {

    let i = 0;
    const s = this.state;

    if (!s.st || !s.settings) {
      return <></>;
    }

    const st = s.st;

    // console.log("Checkboxing.render: state=", s);
    let curMove = s.curMove;

    const optDebugInfo = s.showDebugInfo ? (
      <div className='stateDiv'>
      Whole state<br/>
      {JSON.stringify(s)}<br/>
      <p>
      {st.toString()}
      </p>

      </div>

    ) : (<></>);

    const variant = "Variante: " +
      (s.settings.gameSettings.winWithLast ? "Wer das letzte Kästchen checkt, gewinnt." : "Wer das letzte Kästchen checkt, verliert!");

    let optWinner: React.Node = <></>;

    if (s.st === "SHOW_WINNER") {
      if (s.winner === null || s.winner === undefined) {
        console.error("winner null in SHOW_WINNER");
      } else {
        const botWins = s.settings.gameSettings.bot[s.winner];

        // neu:
        if (s.settings.gameSettings.bot[0] !== s.settings.gameSettings.bot[1]) {
          // Mensch gegen Computer - egal in welcher Reihenfolge

          if (botWins) {
            optWinner = <p className='winner'>Du verlierst, da du den letzten Zug{s.settings.gameSettings.winWithLast ? " nicht" : ""} gemacht hast!</p>
          } else {
            optWinner = (
              <div>
              <p className='congrats'>Herzlichen Glückwunsch!</p>
              <p className='winner'>{s.settings.gameSettings.winWithLast ? "Du gewinnst, da du den letzten Zug gemacht hast." : "Der Computer verliert, da er den letzten Zug gemacht hat."}</p>
              </div>
            );
          }
        } else if (s.settings.gameSettings.bot[0]) {
          // Computer gegen Computer
          optWinner = (
            <div>
            <p className='winner'>Computer {s.winner === 0 ? "1" : "2"} gewinnt, da er {s.settings.gameSettings.winWithLast ? "" : "nicht "}den letzten Zug gemacht hat.</p>
            </div>
          );
        } else {
          // Mensch gegen Mensch
          optWinner = (
            <div>
            <p className='congrats'>Herzlichen Glückwunsch, Spieler {s.winner === 0 ? "1" : "2"}!</p>
            <p className='winner'>Spieler {(s.winner === 0) === (s.settings.gameSettings.winWithLast) ? "1" : "2"} {s.settings.gameSettings.winWithLast ? "gewinnt" : "verliert"}, da er den letzten Zug gemacht hat.</p>
            </div>
          );
        }

        //
        // // alt:
        // let optCongrats = <></>;
        //
        // if (!botWins) {
        //   optCongrats = <p className='congrats'>Herzlichen Gl&uuml;ckwunsch!</p>;
        // }
        // const winnerDesc = (s.winner == 0
        //   ? (<p className='winner'>Spieler 1 {this.computerOrHuman(0)} (der den ersten Zug gemacht hat) gewinnt</p>)
        //   : (<p className='winner'>Spieler 2 {this.computerOrHuman(1)} (der den zweiten Zug gemacht hat) gewinnt!</p>));
        // optWinner = <div>{optCongrats}{winnerDesc}</div>
      }
    }

    let optPreWinner: React.Node = <></>;
    console.log("s.preWinner: ", s.preWinner);

    if (s.preWinner !== null && s.preWinner !== undefined) {
      const preWinner: Settings.Player = s.preWinner;

      optPreWinner = (
        <p className='preWinner'>
          Computer{s.settings.gameSettings.bot[swapPlayer(preWinner)] ? (preWinner === 0 ? "1" : "2") : ""}:&nbsp;
          <q>Gut möglich, dass ich das gewinne. ;-)</q>
        </p>
      );
    } else if (s.settings.gameSettings.bot[0] !== s.settings.gameSettings.bot[1]) {
      optPreWinner = (
        <p className='preWinner'>
          Computer: <q>Mal sehen...</q>
        </p>
      )
    }

    return (
      <div>
        <h1>Checkboxing</h1>
        <h2>Erweitertes React Hello-world von Peter Reitinger</h2>
        <input type="checkbox" onChange={this.onDebugInfoChange}/>Debug-Info anzeigen
        {optDebugInfo}
        <div className='parent'>
          <div className='board'>
            {
              s.board.map((row) => {
                const idx = i++;
                return row_render(row,
                  this.onClick(idx),
                  this.onMouseOver(idx),
                  (curMove && curMove.row === idx ? curMove.seg : null),
                  idx
                );
              })
            }
            <div className='buttons'>
            <button onClick={this.onRestartWithImmer}>Neustart</button>
            <button onClick={this.onSettings}>Einstellungen ...</button>
            <button onClick={this.onShowXor}>Spezialtipp... ;-)</button>
            </div>
          </div>
          <div className='desc'>
            <div>
            <span className='variante'>{variant}</span>
            {optPreWinner}
            {optWinner}
            </div>
            <p className='hint'>
              {s.hint}

            </p>
            <EditSettings.EditSettings settings={s.settings} onApply={this.updateSettings}/>
          </div>
        </div>
      </div>
    )
  }

  componentDidMount() {
    if (!this._isMounted) {
      document.title = 'Checkboxing';
      this._isMounted = true;

      if (this.state.st === "ANIMATE_BOT_MOVE") {
        setTimeout(this.finishMoveWithImmer, 1000);
        // console.log("finishMove timeout was set by componentDidMount");
      }
    } else {
      console.warn("componentDidMount called when already _isMounted");
    }
  }
}

export default Checkboxing;
