import Parareact from './parareact';

/** @jsx Parareact.createElement */
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);

const container = document.getElementById('root');
Parareact.render(element, container);
