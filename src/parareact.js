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
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };

  nextUnitOfWork = wipRoot;
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

// root of our virual dom
let wipRoot = null;

// last rendered virtual dom
let currentRoot = null;

// start the loop
requestIdleCallback(workLoop);

function workLoop(deadline) {
  // determines when we should give back the control to browser
  let shouldYield = false;

  // when there is a unit of work and we shouldnt yield
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);

    // if deadline is here, yield to the browser
    shouldYield = deadline.timeRemaining() < 1;
  }

  // if there are no more work, start the rendering phase
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  // ask the browser to execute the loop again next time
  requestIdleCallback(workLoop);
}

function commitRoot() {
  // starts the committing phase from the first child of the root
  commitWork(wipRoot.child);

  // set currentRoot after commit ends
  currentRoot = wipRoot;

  // clears root so commit will only run a single time
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  const domParent = fiber.parent.dom;
  domParent.appendChild(fiber.dom);

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let prevSibling = null;

  while (index < elements.length) {
    const element = elements[index];

    const newFiber = {
      type: element.type,
      props: element.props,
      parent: wipFiber,
      dom: null,
    };

    if (index === 0) {
      wipFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}

function performUnitOfWork(fiber) {
  // if the fiber doesn't have a dom, create it
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // for each child, we create a fiber
  const elements = fiber.props.children;

  reconcileChildren(fiber, elements);

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
