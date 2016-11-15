import React, { PropTypes } from 'react';
import ReactDOM from 'react-dom';


const TRANSITION_DURATION = 300;
const TOUCH_ENABLED = 'ontouchstart' in window;

// Constants for class names added and removed during specific phases.
const CLASS_CONTAINER = 'draggable-list';
const CLASS_ACTIVE = 'draggable-list-active';
const CLASS_DRAG_EL = 'draggable-list-element';

// Default style for draggable list container.
const LIST_STYLES = {
  position: 'relative',
  overflowX: 'hidden',
  overflowY: 'auto',
  width: '100%',
  height: '100%'
};


const DraggableList = React.createClass({

  // Root component element.
  el: null,

  // Element being dragged.
  dragEl: null,

  // The dragged element's index in the array of draggable items.
  dragIndex: -1,

  // The index in the array of draggable items where the dragged item should
  // finally end up when dragging is complete.
  targetIndex: -1,

  // True if dragging is currently happening.
  dragging: false,

  // Array of all items that are valid to drag.
  dragItems: [],

  // A copy of `dragItems` but with items re-ordered via dragging.
  tmpDragItems: [],

  // Array of items that must always keep their original indexes.
  fixedItems: [],

  // Offsets from window and mouse/touch position for purposes of positioning
  // the dragged item during dragging.
  elOffset: null,
  dragOffset: null,

  // True if user is done dragging but items but animating to their final
  // positions.
  finishing: false,

  // A `setTimeout` to delay calling `onDragUpdate` and finishing drag actions
  // until final animation is complete.
  finishDelay: null,

  // Options for DraggableList.
  propTypes: {
    onDragStart: PropTypes.func,
    onDrag: PropTypes.func,
    onDragComplete: PropTypes.func,
    onDragUpdate: PropTypes.func,
    fixed: PropTypes.array,
    duration: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]),
    style: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.bool
    ])
  },

  // Use React to render the container and children; everything else is done
  // outside React with JavaScript.
  render() {
    const style = this.props.style === false ? null :
      assign(LIST_STYLES, this.props.style);
    return (
      <div
        className={CLASS_CONTAINER}
        style={style}>
        {this.props.children}
      </div>
    );
  },

  // On mount, create a reference to the component element so it can be
  // manipulated in JavaScript outside React.
  componentDidMount() {
    this.el = ReactDOM.findDOMNode(this);
    this.initialize();
  },

  // When props change, re-initialize the list (different form re-render).
  componentDidUpdate(prevProps, prevState) {
    this.initialize();
  },

  // Clean up when the component is removed.
  componentWillUnmount() {
    this.destroy();
  },

  // Initialize: finds draggable items and add event listeners.
  initialize() {
    if (this.el.children && this.el.children.length) {
      this.listEl = this.el.children[0];
      this.transition = ['top ', this.initDuration()].join('');
      this.dragItems = [];
      for (let i = 0; i < this.listEl.children.length; i++) {
        this.dragItems[i] = { el: this.listEl.children[i], index: i };
      }
      addListener(this.el, 'down', this.onInputDown);
      addListener(this.el, 'click', this.onInputClick);
      clearTimeout(this.finishDelay);
    } else {
      this.destroy();
    }
  },

  // Transforms the duration animation option into a CSS-ready value.
  initDuration() {
    let n = TRANSITION_DURATION;
    switch (typeof this.props.duration) {
      case 'string':
        n = parseFloat(this.props.duration) * 1000;
        break;
      case 'number':
        n = this.props.duration;
        break;
    }
    this.duration = n;
    return this.duration / 1000 + 's';
  },

  // Clean up: removes event listeners and handlers.
  destroy() {
    if (this.el) {
      removeListener(this.el, 'down', this.onInputDown);
      removeListener(this.el, 'click', this.onInputClick);
      this.removeDragEventHandlers();
      this.cleanupDrag();
    }
  },


  // Mouse/touch "drag" event. If a previous drag is not being finished and the
  // element the user is attempting to drag is valid, then commence dragging.
  onInputDown(event) {
    if (!this.finishing) {
      this.dragEl = this.getDragElement(event.target);
      if (this.dragEl) {
        this.setupDrag(event);
      }
    }
  },

  // Mouse/touch "move" event: perform drag.
  onInputMove(event) {
    this.performDrag(clientY(event));
    event.preventDefault();
  },

  // Mouse/touch "up" event: clean up drag.
  onInputUp(event) {
    this.removeDragEventHandlers();
    if (this.dragging) {
      this.finishDrag();
    } else {
      this.cleanupDrag();
    }
  },

  // If dragging, prevent clicks.
  onInputClick(event) {
    if (this.dragging) {
      event.stopPropagation();
      event.preventDefault();
    }
  },

  // Tests @param target and returns a draggable item if target is or is inside
  // of a draggable item or else null.
  getDragElement(target) {
    while (target && !this.isDragItem(target)) {
      target = target.parentElement;
    }
    if (this.isFixedItem(target)) {
      target = null;
    }
    return target || null;
  },

  // Returns true or false depending on whether @param el is the item
  // currently being dragged.
  isDragItem(el) {
    for (let i = 0; i < this.dragItems.length; i++) {
      if (this.dragItems[i].el === el) {
        return true;
      }
    }
    return false;
  },

  // Returns true or false depending on whether @param el is "fixed", as
  // determined by the `fixed` draggable list option.
  isFixedItem(el) {
    for (let i = 0; this.props.fixed && i < this.props.fixed.length; i++) {
      let fixedEls = this.el.querySelectorAll(this.props.fixed[i]);
      for (let j = 0; j < fixedEls.length; j++) {
        if (fixedEls[j] === el) {
          return true;
        }
      }
    }
    return false;
  },

  // Prepare draggable list container and draggable items for dragging.
  setupDrag(event) {
    const elRect = this.el.getBoundingClientRect();
    const listRect = this.listEl.getBoundingClientRect();
    const dragRect = this.dragEl.getBoundingClientRect();
    this.listHeight = window.getComputedStyle(this.listEl).getPropertyValue('height');
    this.listEl.style.height = listRect.height + 'px';
    this.dragEl.style.zIndex = this.dragItems.length;
    this.elOffset = {
      x: elRect.left,
      y: elRect.top
    };
    this.dragOffset = {
      x: dragRect.left - clientX(event),
      y: dragRect.top - clientY(event)
    };
    this.tmpDragItems = [];
    this.fixedItems = [];
    let pos = [];

    // Loop through the draggable items recording original values so the items
    // can be reset to those original values when dragging is finished.
    this.dragItems.forEach((item, index) => {
      let rect = item.el.getBoundingClientRect();
      let style = window.getComputedStyle(item.el);

      // Record
      item.style = {
        position: style.getPropertyValue('position') || 'static',
        left: style.getPropertyValue('left') || 'auto',
        top: style.getPropertyValue('top') || 'auto',
        transition: style.getPropertyValue('transition') || 'none'
      };
      item.left = rect.left - elRect.left;
      item.top = rect.top - elRect.top + this.el.scrollTop;
      // Stores the target top as opposed to the original top value:
      item.tmpTop = item.top;
      item.height = rect.height +
        parseFloat(style.getPropertyValue('margin-top')) +
        parseFloat(style.getPropertyValue('margin-bottom'));
      item.fixed = this.isFixedItem(item.el) ? index : -1;
      if (item.fixed) {
        this.fixedItems.push({ item, index });
      }
      if (item.el === this.dragEl) {
        this.dragIndex = index;
      }
    })

    // Loop again to change items for dragging. Not done in same loop as above
    // because setting an item's position to `absolute` would change the
    // positioning of subsequent items.
    this.dragItems.forEach((item, index) => {
      item.el.style.left = item.left + 'px';
      item.el.style.position = 'absolute';
      if (item.el === this.dragEl) {
        this.positionDragEl(clientY(event));
      } else {
        item.el.style.top = item.top + 'px';
      }
    });

    // Add classes and event listeners to handle dragging.
    addClass(this.el, CLASS_ACTIVE);
    addClass(this.dragEl, CLASS_DRAG_EL);
    addListener(window, 'move', this.onInputMove);
    addListener(window, 'up', this.onInputUp);
    setTimeout(() => {
      this.dragItems.forEach((item, index) => {
        if (index !== this.dragIndex) {
          item.el.style.transition = this.transition;
        }
      });
    }, 1);


    // Call the onDragStart callback.
    if (this.props.onDragStart) {
      this.props.onDragStart(this.dragIndex);
    }
  },


  // Remove event handlers applied in `setupDrag()`.
  removeDragEventHandlers() {
    removeListener(window, 'move', this.onInputMove);
    removeListener(window, 'up', this.onInputUp);
  },

  // Dragging has stopped so animate items their final positions prior to
  // calling the `onDragUpdate` callback.
  finishDrag() {
    this.finishing = true;
    this.positionDragItems();
    this.dragEl.style.transition = this.transition;
    this.dragEl.style.top = this.dragItems[this.dragIndex].tmpTop + 'px';
    this.finishDelay = setTimeout(function () {
      this.finishing = false;
      this.cleanupDrag();
      if (this.props.onDragUpdate && this.dragIndex !== this.targetIndex) {
        this.props.onDragUpdate(this.getNewListOrder());
      }
      this.dragging = false;
    }.bind(this), this.duration);
  },

  // Remove dragging classes and reset draggable items to original states.
  cleanupDrag() {
    if (this.dragEl) {
      removeClass(this.el, CLASS_ACTIVE);
      removeClass(this.dragEl, CLASS_DRAG_EL);
      this.dragEl.style.zIndex = 'auto';
      this.dragEl = null;
      for (let i = 0; i < this.dragItems.length; i++) {
        let item = this.dragItems[i];
        if (item.style.position) {
          item.el.style.position = item.style.position;
        }
        if (item.style.left) {
          item.el.style.left = item.style.left;
        }
        if (item.style.top) {
          item.el.style.top = item.style.top;
        }
        if (item.style.transition) {
          item.el.style.transition = item.style.transition;
        }
      }
      this.listEl.style.height = this.listHeight;
      if (this.props.onDragComplete) {
        this.props.onDragComplete(this.dragIndex);
      }
    }
  },

  // Returns an array of indexes that represent the updated list order.
  getNewListOrder() {
    return this.tmpDragItems.map(item => {
      return item.index;
    });
  },


  // While dragging, re-position draggable items in response to the dragged
  // position of the currently active item.
  positionDragItems() {
    const dragItem = this.dragItems[this.dragIndex];

    // Create the new order based on updated targetIndex.
    let dragItems = this.dragItems.filter((item, index) => {
      return item.fixed === -1 && index !== this.dragIndex;
    });
    let tmpOrder = this.dragItems.map(item => {
      return (item.fixed !== -1) ? item : null;
    });
    tmpOrder[this.targetIndex] = dragItem;
    tmpOrder.forEach((item, index) => {
      if (item === null) {
        tmpOrder[index] = dragItems.shift();
      }
    });

    // Set y/top for each item according to its index in the tmpOrder.
    let y = 0;
    tmpOrder.forEach(item => {
      item.tmpTop = y;
      if (item !== dragItem) {
        item.el.style.top = y + 'px';
      }
      y += item.height;
    });
    this.tmpDragItems = tmpOrder;
  },

  // Positions the current active item according to where it is being dragged
  // and returns new Y/top value.
  positionDragEl(inputY) {
    const elOffset = -this.elOffset.y + this.el.scrollTop;
    const dragY = inputY + this.dragOffset.y + elOffset;
    this.dragEl.style.top = dragY + 'px';
    return dragY;
  },

  // Positions the dragged item, positions all other items, calls the optional
  // `onDrag` callback.
  performDrag(inputY) {
    // Drag the dragged item.
    this.dragging = true;
    this.positionDragEl(inputY);
    const dragRect = this.dragEl.getBoundingClientRect();

    // Figure out the target index (where the dragged item would go if dropped).
    let tmpIndex = -1;
    const testIndex = this.dragIndex;//(this.targetIndex === -1) ? this.dragIndex : this.targetIndex;
    for (let i = testIndex - 1; i >= 0; i--) {
      let item = this.dragItems[i];
      let itemRect = item.el.getBoundingClientRect();
      if (item.fixed === -1 && dragRect.top < itemRect.top) {
        tmpIndex = i;
      }
    }
    for (let i = testIndex + 1; i < this.dragItems.length; i++) {
      let item = this.dragItems[i];
      let itemRect = item.el.getBoundingClientRect();
      if (item.fixed === -1 && dragRect.top > itemRect.top) {
        tmpIndex = i;
      }
    }

    tmpIndex = (tmpIndex === -1) ? this.dragIndex : tmpIndex;
    this.targetIndex = tmpIndex;

    // Position all items, accounting for the dragged item's height.
    this.positionDragItems();

    if (this.props.onDrag) {
      this.props.onDrag(this.dragIndex);
    }
  }
});



// Static utility functions.
function clientX(event) {
  return clientPos(event, 'clientX');
}

function clientY(event) {
  return clientPos(event, 'clientY');
}

function clientPos(event, prop) {
  return event.touches ? event.touches[0][prop] : event[prop];
}

function addListener(el, type, func, useCapture = false) {
  updateListener(el, 'add', type, func, useCapture);
}

function removeListener(el, type, func, useCapture = false) {
  updateListener(el, 'remove', type, func, useCapture);
}

function updateListener(el, method, type, func, useCapture) {
  method = (method === 'add') ? 'addEventListener' : 'removeEventListener';
  switch (type.toUpperCase()) {
    case 'DOWN':
      applyListener(el, method, TOUCH_ENABLED ? 'touchstart' : 'mousedown',
        func, useCapture);
      break;
    case 'MOVE':
      applyListener(el, method, TOUCH_ENABLED ? 'touchmove' : 'mousemove',
        func, useCapture);
      break;
    case 'UP':
      applyListener(el, method, TOUCH_ENABLED ? 'touchend' : 'mouseup',
        func, useCapture);
      if (TOUCH_ENABLED) {
        applyListener(el, method, 'touchcancel', func, useCapture);
      }
      break;
    default:
      applyListener(el, method, type, func, useCapture);
      break;
  }
}

function applyListener(el, method, type, func, useCapture = false) {
  el[method](type, func, useCapture);
}


function assign() {
  var obj = arguments[0];
  for (let i = 1; i < arguments.length; i++) {
    if (arguments[i] && typeof arguments[i] === 'object') {
      let keys = Object.keys(arguments[i]);
      for (let j = 0; j < keys.length; j++) {
        let key = keys[j];
        obj[key] = arguments[i][key];
      }
    }
  }
  return obj;
}

function addClass(el, className) {
  let classes = el.className.split(/\s/);
  if (classes.indexOf(className) === -1) {
    classes.push(className);
    el.className = classes.join(' ');
  }
}

function removeClass(el, className) {
  let classes = el.className.split(/\s/);
  const index = classes.indexOf(className);
  if (index !== -1) {
    classes.splice(index, 1);
    el.className = classes.join(' ');
  }
}


export default DraggableList;
