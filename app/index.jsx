import React from 'react';
import ReactDOM from 'react-dom';
import DraggableList from '../DraggableList';
import items from './items.json';

const Index = React.createClass({

  getInitialState() {
    return { items: items };
  },


  render() {
    // Define the options for the DraggableList.
    const listOpts = {
      // Selectors for items that must not be moved:
      fixed: ['.fixed'],

      // Callbacks to handle events:
      onDragStart: this.onListMoveStart,
      onDrag: this.onListMoved,
      onDragComplete: this.onListMoveComplete,
      onDragUpdate: this.onListUpdated,

      // Duration in milliseconds of animation (default is 300):
      duration: 300,
      // Also works:
      // duration: '0.3s',

      // Styles to apply to the Draggable List container div. Div has the
      // class 'draggable-list'. While dragging, the div has the additional
      // class 'draggable-list-active'. By default, these styles will be
      // applied:
      // {
      //   position: 'relative',
      //   overflowX: 'hidden',
      //   overflowY: 'auto',
      //   width: '100%',
      //   height: '100%'
      // }
      // Style property names must be camel case.
      style: { backgroundColor: '#bdf' }
      // If false, no styles will be applied.
      // style: false
    };

    // Wrap the DraggableList around a list of items, in this case a `<ul>`.
    return (
      <div className="container">
        <DraggableList {...listOpts}>
          {this.renderItems()}
        </DraggableList>
      </div>
    );
  },


  renderItems() {
    let items = this.state.items.map((item, index) => {
      if (item === '__fixed__') {
        return (
          <li className="fixed" key={index}>
            Item fixed at a specific index.
          </li>
        );
      }
      return (
        <li key={index}>
          <button onClick={this.onButtonClick}>
            {item}
          </button>
        </li>
      );
    });
    return (
      <ul className="drag-list">
        {items}
      </ul>
    );
  },


  onButtonClick(event) {
    console.log(event.target.innerHTML);
  },

  onListMoveStart(index) {
    console.log('START:', index);
  },

  onListMoved(index) {
    console.log('MOVE', index);
  },

  onListMoveComplete(index) {
    console.log('COMPLETE', index);
  },

  onListUpdated(newOrder) {
    console.log('UPDATED');
    let items = newOrder.map(index => {
      return this.state.items[index];
    });
    this.setState({ items });
  }
});

ReactDOM.render(<Index/>, document.querySelector('#main'));
