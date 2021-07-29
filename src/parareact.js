const Parareact = {};

Parareact.createElement = function (type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === 'object' ? child : createTextElement(child),
      ),
    },
  };
};

function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

Parareact.render = function (element, container) {
  // creates the dom node that will be rendered
  const dom =
    element.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(element.type);

  // helper function to separate props from children
  const isProp = key => key !== 'children';

  // Go through each prop and assign them to node
  Object.keys(element.props)
    .filter(isProp)
    .forEach(prop => {
      dom[prop] = element.props[prop];
    });

  // recursively do the same for each children
  element.props.children.forEach(child => {
    Parareact.render(child, dom);
  });

  container.appendChild(dom);
};

export default Parareact;
