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

  // reset deletions
  deletions = [];
  nextUnitOfWork = wipRoot;
};

function createDom(fiber) {
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type);

  updateDom(dom, {}, fiber.props);

  return dom;
}

let nextUnitOfWork = null;

// root of our virual dom
let wipRoot = null;

// last rendered virtual dom
let currentRoot = null;

// fibers to be deleted
let deletions = null;

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
  deletions.forEach(commitWork);
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

  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  // if the fiber is placement, we append the dom node
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom !== null) {
    domParent.appendChild(fiber.dom);
    // if its deletion, we remove it
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent);
    // if its update, we call the new update dom function
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom !== null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
  }
}

// checks if the prop is an event listener
const isEvent = key => key.startsWith('on');

// checks if the prop is not children or event handler
const isProperty = key => key !== 'children' && !isEvent(key);

// checks if the prop is new
const isNew = (prev, next) => key => prev[key] !== next[key];

// checks if the prop doesnt exist anymore
const isGone = (prev, next) => key => !(key in next);

function updateDom(dom, prevProps, nextProps) {
  // Remove outdated event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    // if it exists in the nextProps, check if its new
    .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach(name => {
      // event name is the 'on' removed
      const eventType = name.toLowerCase().substring(2);

      dom.removeEventListener(eventType, prevProps[name]);
    });

  // Remove old props
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = '';
    });

  // Set new or changed props
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name];
    });

  // Add new event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);

      dom.addEventListener(eventType, nextProps[name]);
    });
}

function reconcileChildren(wipFiber, elements) {
  let index = 0;

  // we will also iterate over the children of the old fiber if it exists
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;

  let prevSibling = null;

  // while there is either an element or and oldFiber
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;

    // check if new and old is the same type
    const sameType = oldFiber && element && element.type == oldFiber.type;

    // if they are the same type we need to update the node
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      };
    }

    // if there is a new element of different type we need to create node
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null, // because this is new
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
      };
    }

    // if there is no new element we need to delete the node
    if (oldFiber && !sameType) {
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }

    // set the oldFiber to continue the loop
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

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
  // when using function components the type that will be passed will be the function itself
  const isFunctionComponent = fiber.type instanceof Function;

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
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

function updateFunctionComponent(fiber) {
  // calling the function would return the children
  const children = [fiber.type(fiber.props)];

  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber) {
  // if the fiber doesn't have a dom, create it
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // for each child, we create a fiber
  const elements = fiber.props.children;

  reconcileChildren(fiber, elements);
}

export default Parareact;
