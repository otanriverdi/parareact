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
  // sets the root node of the linked list and it will trigger the loop
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element],
    },
  };
};

function createDom(fiber) {
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type);

  const isProp = key => key !== 'children';

  Object.keys(fiber.props)
    .filter(isProp)
    .forEach(prop => {
      dom[prop] = fiber.props[prop];
    });

  return dom;
}

let nextUnitOfWork = null;

// start the loop
requestIdleCallback(workLoop);

function workLoop(deadline) {
  // determines when we should give back the control to browser
  let shouldYield = false;

  console.log('it runs');

  // when there is a unit of work and we shouldnt yield
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);

    // if deadline is here, yield to the browser
    shouldYield = deadline.timeRemaining() < 1;
  }

  // ask the browser to execute the loop again next time
  requestIdleCallback(workLoop);
}

function performUnitOfWork(fiber) {
  // if the fiber doesn't have a dom, create it
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // if the fiber has a parent, append this dom to parent dom
  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom);
  }

  // for each child, we create a fiber
  const elements = fiber.props.children;
  let index = 0;
  let prevSibling = null;

  while (index < elements.length) {
    const element = elements[index];

    // create a new fiber
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
    };

    // if its the first element, we assign it as the child of the fiber
    if (index === 0) {
      fiber.child = newFiber;
    } else {
      // if it's not the first child, it means we already have a previousSibling (index 0 case)
      // we add the the fiber as the sibling of the prevSibling
      prevSibling.sibling = newFiber;
    }

    // set the prevSibling to the new fiber we created
    prevSibling = newFiber;
    index++;
  }

  // if there is a children, we return it as the next unit of work
  if (fiber.child) return fiber.child;

  // otherwise we go up fibers until we find a sibling
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling;

    nextFiber = nextFiber.parent;
  }
}

export default Parareact;
