import logo from './logo.svg';
import './App.css';
import Checkboxing from './Checkboxing';

class State {
  static STROKE_BEGIN = new State("STROKE_BEGIN");
  static STROKE_END = new State("STROKE_END");
};

function App() {


  return (
    <Checkboxing/>
  );
  // return (
  //   <div className="App">
  //     <header className="App-header">
  //       <img src={logo} className="App-logo" alt="logo" />
  //       <p>
  //         Edit <code>src/App.js</code> and save to reload.
  //       </p>
  //       <a
  //         className="App-link"
  //         href="https://reactjs.org"
  //         target="_blank"
  //         rel="noopener noreferrer"
  //       >
  //         Learn React
  //       </a>
  //     </header>
  //   </div>
  // );
}

export default App;
