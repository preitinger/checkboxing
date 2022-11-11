// @flow
import * as React from 'react';
import produce from "immer";

import './Checkboxing.css';

import * as Settings from './Settings'

function renderHint(hint:?string): React.Node {
  return ((hint ? ( <span className='lightHint'>{hint}</span>)
    : (<></>)));
}

class LabeledCheckbox extends React.Component<{label:string, checked:bool, onChange:{target:{checked:boolean}} => void, hint:?string}> {
  // props = { label: <string>, checked: <bool>, onChange:function(bot:bool) }

  render(): React.Node {
    return (
      <tr className='setting'>
      <td>{this.props.label}</td>
      <td>
      <input
        type="checkbox"
        checked={this.props.checked}
        onChange={this.props.onChange}/>
        {renderHint(this.props.hint)}
      </td>
      </tr>
    );
    // return (
    //   <div className='setting'>
    //   <input
    //     type="checkbox"
    //     checked={this.props.checked}
    //     onChange={this.props.onChange}/>{this.props.label}&nbsp;
    //     {renderHint(this.props.hint)}
    //   </div>
    // );
  }
}

class SelectBotStrategy extends React.Component<{value:string, idx:number, onChange:{target: {value:Settings.BotStrategy}} => void}> {
  render(): React.Node {
    return (
      <tr className='setting'>
      <td>
        Zugauswahl für Spieler {this.props.idx + 1} als Computer:
      </td>
      <td>
        <select value={this.props.value} onChange={this.props.onChange}>
          <option value={"RANDOM"}>Zufällig</option>
          <option value={"SLOW"}>Möglichst wenig Kästchen</option>
          <option value={"FAST"}>Möglichst viele Kästchen</option>
        </select>
      </td>
      </tr>

    );
    // return (
    //   <div className='setting'>
    //     Zugauswahl für Spieler {this.props.idx + 1} als Computer:&nbsp;
    //     <select value={this.props.value} onChange={this.props.onChange}>
    //       <option value={BotStrategy.RANDOM}>Zufällig</option>
    //       <option value={BotStrategy.SLOW}>Möglichst wenig Kästchen</option>
    //       <option value={BotStrategy.FAST}>Möglichst viele Kästchen</option>
    //     </select>
    //   </div>
    //
    // );
  }
}

class AnimationMsInput extends React.Component<{idx:number, value:number, onChange:{target:{value:string}} => void}> {
  render(): React.Node {
    return (
      <tr className='setting'>
        <td>
          Animation von Computer-Spieler {this.props.idx + 1}:
        </td>
        <td>
          <input type='number' min='0' max='10000' value={this.props.value} onChange={this.props.onChange}/>ms
        </td>
      </tr>
    );
    // return (
    //   <div className='setting'>
    //     Dauer der Animation von Zügen von Computer-Spieler {this.props.idx + 1}:&nbsp;
    //     <input type='number' min='0' max='10000' value={this.props.value} onChange={this.props.onChange}/>ms
    //   </div>
    // );
  }
}

class EditSettings extends React.Component<{settings: Settings.Settings, onApply:Settings.Settings => void}, {settings: Settings.Settings, dirty: boolean}> {
  // props enthaelt settings: Settings, onApply: function(settings)
  constructor(props: {settings: Settings.Settings, onApply:Settings.Settings => void}) {
    super(props);
    this.state = {
      settings: props.settings,
      dirty: false,
    }
  }

  // onChange = (settings) => {
  //   this.setState({
  //     settings: settings
  //   })
  // }

  onChangeBot: Settings.Player => {target:{checked:boolean}} => void = (player) => (event) => {
    this.setState(produce(this.state, (draft) => {
      const p = player;
      draft.settings.gameSettings.bot[p] = event.target.checked;
      draft.dirty = true;
    }));
  }

  onChangeWinWithLast: {target: {checked: boolean}} => void = (event) => {
    this.setState(produce(this.state, (draft) => {
      draft.settings.gameSettings.winWithLast = event.target.checked;
      draft.dirty = true;
    }));
  }

  onChangeRows: { target: {value:number}} => void = (event) => {
    this.setState(produce(this.state, (draft) => {
      draft.settings.gameSettings.rows = event.target.value;
      draft.dirty = true;
    }));
  }

  onChangeAnimation: number => {target:{value:string}} => void = (idx) => (event) => {
    this.setState(produce(this.state, (draft) => {
      draft.settings.moveSettings[idx].animationMs = Number(event.target.value);
      draft.dirty = true;
    }));
  }

  onStrategy: Settings.Player => {target: {value:Settings.BotStrategy}} => void = (idx) => (event) => {
    this.setState(produce(this.state, (draft) => {
      draft.settings.moveSettings[idx].botStrategy = event.target.value;
      draft.dirty = true;
      console.log("onStrategy", idx, event.target.value)
    }));
  }

  onApply: void => void = () => {
    this.setState(produce(this.state, (draft) => {
      draft.dirty = false;
      }));
    this.props.onApply(this.state.settings);
  }

  render(): React.Node {
    const st = this.state;
    const s = st.settings;
    console.log("EditSettings.render: s.moveSettings[0].botStrategy=", s.moveSettings[0].botStrategy)
    return (
      <div className='editSettings'>
        <h3 className='setting'>
          Einstellungen {st.dirty ? <span className='lightHint'>(noch nicht übernommen)</span> : <></>}
        </h3>
        <table className='setting'>
        <tbody>
        <LabeledCheckbox label="Spieler 1 ist Computer" hint="(erst nach Neustart aktiv)" checked={s.gameSettings.bot[0]} onChange={this.onChangeBot(0)}/>
        <LabeledCheckbox label="Spieler 2 ist Computer" hint="(erst nach Neustart aktiv)" checked={s.gameSettings.bot[1]} onChange={this.onChangeBot(1)}/>
        <tr className='setting'>
          <td>Anzahl Reihen:</td>
          <td><input type="number" min="1" max="100" value={s.gameSettings.rows} onChange={this.onChangeRows}/>&nbsp;
          {renderHint("(erst nach Neustart aktiv)")}</td>
        </tr>
        <LabeledCheckbox label = "Wer den letzten Zug macht, gewinnt." checked={s.gameSettings.winWithLast} onChange={this.onChangeWinWithLast} hint="(erst nach Neustart aktiv)"/>
        <SelectBotStrategy idx={0} onChange={this.onStrategy(0)} value={s.moveSettings[0].botStrategy}/>
        <SelectBotStrategy idx={1} onChange={this.onStrategy(1)} value={s.moveSettings[1].botStrategy}/>
        <AnimationMsInput idx={0} onChange={this.onChangeAnimation(0)} value={s.moveSettings[0].animationMs}/>
        <AnimationMsInput idx={1} onChange={this.onChangeAnimation(1)} value={s.moveSettings[1].animationMs}/>
        </tbody>
        </table>
        <button onClick={this.onApply}>Übernehmen</button>
      </div>
    );
  }
}

export{EditSettings};
