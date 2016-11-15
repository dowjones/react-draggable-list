# react-draggable-list
A React component that enables a list of items to be reordered via drag and drop.

To view a demo: `npm run test`

## Quick and dirty example:
```
import DraggableList from './DraggableList';

const Example = React.createClass({

  getInitialState() {
    return {
      items: [
        'AAAAAA',
        'BBBBBB',
        'CCCCCC'
      ]
    };
  },

  render() {
    // Define the options for the DraggableList.
    const listOpts = {
      onDragStart: this.onListMoveStart,
      onDrag: this.onListMoved,
      onDragComplete: this.onListMoveComplete,
      onDragUpdate: this.onListUpdated,
    };

    // Wrap the DraggableList around a list of items, in this case a `<ul>`.
    return (
      <div className="container">
        <DraggableList {...listOpts}>
          {this.renderList()}
        </DraggableList>
      </div>
    );
  },

  renderList() {
    const items = this.state.map(value => {
      return (<li>{value}</li>);
    });
    return (<ul>{items}</ul>);
  },

  // These event handling callbacks are all optional. To handle changes to the
  // list that result from user actions, set a callback as the value the
  // `onDragUpdate` option (`onListUpdated` below).
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
```
See [app/index.html](app/index.html) for a more complex example.

## Style & Behavior Options
The DraggableList component and elements within it can be referenced for styling purposes through class names. The DraggableList components renders a `<div>` with the class `draggable-list`. While dragging, it is given the additional class of `draggable-list-active`, and the actual item being dragged (a `<li>` in the example above) is given the class `draggable-list-element`.

When initiating DraggableList, options are set via component props:

#### duration
This determines how fast elements animate to new positions. Acceptable values are milliseconds (`300`) or CSS-style strings: (`'0.3s'`). The default is `300`.

#### style
By default, `<div class="draggable-list">` is styled with:
```
{
  position: 'relative',
  overflowX: 'hidden',
  overflowY: 'auto',
  width: '100%',
  height: '100%'
}
```
This allows the list to expand to fill its container while scrolling if the contents overflow the container. If `style` is set to an object, that object will be merged with the default object. If `style` is set to `false`, the default object will not be applied.
