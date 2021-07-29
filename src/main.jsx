import Parareact from './parareact';

/** @jsx Parareact.createElement */
function App(props) {
  return <h1>Hi, {props.name}</h1>;
}

const element = <App name="Parasut" />;
const container = document.getElementById('root');
Parareact.render(element, container);
