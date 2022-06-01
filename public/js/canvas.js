import Chalk from './Chalk.js';
import Arrow from './Arrow.js';
import Line from './Line.js';
import Rect from './Rectangle.js';
import DrawText from './DrawText.js';
import MoveTool from './MoveTool.js';
import { getElementsAtPosition } from '../utils/getElementsAtPosition.js';
import Circle from './Circle.js';
import Diamond from './Diamond.js';
import { drawDiamond, drawText } from '../utils/drawShapes.js';




// https://codepen.io/chengarda/pen/wRxoyB?editors=1010 - For Zoom in and out
//getElementBounds in bounds.ts excalidraw ??
/**
 * Plan is to have map for coordinates
 * 
 * {
 *  0: [{ ...shapes }] // From 0 to 50 shapes will be here
 *  50: [{ ...shapes }] // From 50 to 100 shapes will be here
 * }
 * 
 * Hoping this will reduce the amout of pixels to redraw
 */

/**
 * 
 * CheckList: 1) shape draw
 * 2) shape redraw
 *  2.1) Adding sscroll buffer while pushing to shapes array (imgupdate) only If extra params included
 * 3) shape select
 * 4) delete shape
 * 5) shape move
 * 
 */


//utility to check something is drawn on canvas
function isDrawnOn(context, canvas) {
  var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  var data = imageData.data;
  var result = null;
  var counter = 0;
  var last = data.length - 1;
  for (var i = 0; i < data.length; i++) {
    if (i === last && counter !== 0 && counter === last) {
      result = false;
      break;
    } else if (data[i] !== 0 && data[i] > 0) {
      result = true;
      break;
    } else {
      counter++;
      continue;
    }
  }
  return result;
}


class InitCanvas {
  constructor(canvas, tools) {
    this.addEventListeners = this.addEventListeners.bind(this);
    this.updateTool = this.updateTool.bind(this);
    this.imgUpdate = this.imgUpdate.bind(this);
    this.onEvent = this.onEvent.bind(this);
    this.changeToTextTool = this.changeToTextTool.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onDocumentClick = this.onDocumentClick.bind(this);
    this.resetDraggingValues = this.resetDraggingValues.bind(this);
    this.onWheelMove = this.onWheelMove.bind(this);
    this.zoomIn = this.zoomIn.bind(this);
    this.zoomOut = this.zoomOut.bind(this);
    this.changeToOneScalingFactor = this.changeToOneScalingFactor.bind(this);
    this.changeFromOneScalingFactor = this.changeFromOneScalingFactor.bind(this);
    this.updateZoomRange = this.updateZoomRange.bind(this);

    this.mainCanvas = canvas;
    this.mainContext = this.mainCanvas.getContext('2d');
    let parentNode = canvas.parentNode;
    let tempCanvas = document.createElement('canvas');
    if (!tempCanvas) {
      alert('Error! Cannot create a new canvas element!');
      return;
    }

    // theme support
    this.selectedTheme = 'light'; // theme can be dark or light

    // setting up the initial canvas sizes
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    tempCanvas.id = 'tempCanvas';
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    parentNode.appendChild(tempCanvas);
    this.tempCanvas = tempCanvas;

    this.tempContext = this.tempCanvas.getContext('2d');

    this.tempContext.strokeStyle = this.selectedTheme === 'dark' ? "#FFFFFF" : '#000000';// Default line color. 
    this.tempContext.lineWidth = 1.0;// Default stroke weight. 

    // Fill transparent canvas with dark grey (So we can use the color to erase). 
    this.tempContext.fillStyle = this.selectedTheme === 'dark' ? "#424242" : '#FFFFFF';
    this.tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);//Top, Left, Width, Height of canvas

    this.tools = tools;
    this.selectedTool = 'chalk'
    this.id = 0;
    let selectedOne = this.tools[this.selectedTool];

    this.tool = new selectedOne(this.tempCanvas, this.tempContext, this.imgUpdate, this.id);

    this.shapes = [];

    this.selectedElement = null;


    // To check whether the user is dragging.
    this.mouseXPosition = null;
    this.mouseYPosition = null;
    this.isUserDragging = false;
    this.draggingElement = null;



    // To emulate scroll behaviour
    this.scrollX = 0;
    this.scrollY = 0;

    // scaling factor
    this.scalingFactor = 1;

    this.addEventListeners();

    // updating font size
    this.baseFontSize = 24;
    this.baseLineHeight = (150 * this.baseFontSize) / 100;
    this.updateFontProperties();


    //debug purpise
    //document.getElementById('debug').removeChild(document.getElementById('debug').firstChild)
    document.getElementById('zoomRange').appendChild(document.createTextNode(Math.floor(this.scalingFactor * 100)))
  }

  zoomIn(e) {
    e.stopPropagation();
    if (this.scalingFactor <= 0.1) {
      return;
    }
    this.scalingFactor -= 0.1;
    this.scalingFactor = Number(this.scalingFactor.toFixed(1));
    this.baseFontSize = this.baseFontSize - 3;
    this.baseLineHeight = (150 * this.baseFontSize) / 100;
    this.updateZoomRange();
    this.updateFontProperties();
    this.redraw();
  }

  zoomOut(e) {
    e.stopPropagation();
    if (this.scalingFactor >= 2) {
      return;
    }
    this.scalingFactor += 0.1;

    this.scalingFactor = Number(this.scalingFactor.toFixed(1));
    this.baseFontSize = this.baseFontSize + 3;
    this.baseLineHeight = (150 * this.baseFontSize) / 100;
    this.updateZoomRange();
    this.updateFontProperties();
    this.redraw();
  }

  updateZoomRange() {
    document.getElementById('zoomRange').removeChild(document.getElementById('zoomRange').firstChild);
    document.getElementById('zoomRange').appendChild(document.createTextNode(Math.floor(this.scalingFactor * 100)));
  }


  changeToOneScalingFactor(coords) {
    return coords / this.scalingFactor;
  }

  changeFromOneScalingFactor(coords) {
    return coords * this.scalingFactor;
  }



  updateFontProperties() {
    document.documentElement.style.setProperty('--font-size', `${this.baseFontSize}px`);
    document.documentElement.style.setProperty('--line-height', `${this.baseLineHeight}px`);
  }

  addEventListeners() {
    this.tempCanvas.addEventListener('mousedown', this.onEvent, false);
    this.tempCanvas.addEventListener('mousemove', this.onEvent, false);
    this.tempCanvas.addEventListener('mouseup', this.onEvent, false);
    this.tempCanvas.addEventListener('dblclick', this.changeToTextTool, false);
    document.addEventListener('keydown', this.onKeyDown, false);
    document.addEventListener('click', this.onDocumentClick, false);
    document.addEventListener('wheel', this.onWheelMove, false);
    document.getElementById('textAreaId').addEventListener('click', (e) => {
      // Preventing is required as the click is inside the textarea.
      e.stopPropagation();
    })


    document.getElementById('plus').addEventListener('click', this.zoomOut, false);
    document.getElementById('minus').addEventListener('click', this.zoomIn, false)
  }

  onWheelMove(e) {
    if (this.selectedTool === 'text') {
      // Drawing text on canvas before scroll move
      this.tool['onBlur']();
    }
    this.scrollX = this.scrollX - e.deltaX;
    this.scrollY = this.scrollY - e.deltaY;
    this.redraw();
  }

  changeToTextTool(ev) {

    ev._x = this.changeToOneScalingFactor(ev.x - this.scrollX);
    ev._y = this.changeToOneScalingFactor(ev.y - this.scrollY);

    let enclosedElement = getElementsAtPosition(ev._x, ev._y, this.shapes);

    // Temporarily updating tool manually
    this.updateTool('text', enclosedElement && enclosedElement.type === 'text' ? enclosedElement.id : null);
    this.resetDraggingValues();



    if (enclosedElement && enclosedElement.type === 'text') {
      this.shapes = this.shapes.filter(shape => shape.id !== this.selectedElement.id);
      this.redraw();
    }

    let func = this.tool[ev.type];
    if (func) {
      this.tempContext.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
      // func will be dbclick in drawtext
      func(ev, enclosedElement, { scrollX: this.scrollX, scrollY: this.scrollY, scalingFactor: this.scalingFactor });
    }

  }

  onKeyDown(ev) {
    if (this.selectedTool === 'text') {
      // Early Return as we dont need to listen while textarea is shown
      return;
    }
    if ((ev.keyCode >= 48 && ev.keyCode <= 57) || (ev.keyCode >= 65 && ev.keyCode <= 90)) {
      // 48 - 57 number 0 - 9 and 65 - 90 Alphabetys

    } else {
      // special keys 
      if (this.selectedElement) {
        // Backspace or delete key
        if (ev.which === 46 || ev.which === 8) {
          this.shapes = this.shapes.filter(shape => shape.id !== this.selectedElement.id);
          this.redraw();
        }
      }
    }

  }


  onDocumentClick(ev) {
    // TODO: Get the starting and ending point from coordinates(Inside Rect, or any other shapes starting point)
    // if (ev.layerX || ev.layerX == 0) { // Firefox 
    //   ev._x = ev.layerX;
    //   ev._y = ev.layerY;
    // } else if (ev.offsetX || ev.offsetX == 0) { // Opera 
    //   ev._x = ev.offsetX;
    //   ev._y = ev.offsetY;
    // }

    ev._x = this.changeToOneScalingFactor(ev.x - this.scrollX);
    ev._y = this.changeToOneScalingFactor(ev.y - this.scrollY);

    if (this.selectedTool === 'text') {
      //Revertting tyhius is required.


      this.tool['onBlur']();
      // this.selectedTool = 'select';
      // this.tool = null;
      return;
    }

    if (this.selectedTool === 'select') {
      this.tempContext.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
      let selectedElement = getElementsAtPosition(ev._x, ev._y, this.shapes);
      this.selectedElement = selectedElement;
      console.log(selectedElement);
      if (this.selectedElement) {
        if (this.selectedElement.type === 'rectangle') {
          let x = this.changeFromOneScalingFactor(this.selectedElement.x) + this.scrollX;
          let y = this.changeFromOneScalingFactor(this.selectedElement.y) + this.scrollY;
          this.tempContext.setLineDash([6]);
          this.tempContext.strokeRect(x - 5, y - 5, this.changeFromOneScalingFactor(this.selectedElement.width) + 10, this.changeFromOneScalingFactor(this.selectedElement.height) + 10);
        } else if (this.selectedElement.type === 'line' || this.selectedElement.type === 'arrow') {
          let x = this.changeFromOneScalingFactor(this.selectedElement.startX) + this.scrollX;
          let y = this.changeFromOneScalingFactor(this.selectedElement.startY) + this.scrollY;
          this.tempContext.setLineDash([6]);
          this.tempContext.strokeRect(x - 5, y - 5, this.changeFromOneScalingFactor(this.selectedElement.width) + 10, this.changeFromOneScalingFactor(this.selectedElement.height) + 10);
        } else if (this.selectedElement.type === 'circle') {
          let x = this.changeFromOneScalingFactor(this.selectedElement.x) + this.scrollX;
          let y = this.changeFromOneScalingFactor(this.selectedElement.y) + this.scrollY;
          this.tempContext.setLineDash([6]);
          this.tempContext.beginPath();
          this.tempContext.arc(x, y, this.changeFromOneScalingFactor(this.selectedElement.radius) + 10, 0, 2 * Math.PI);
          this.tempContext.stroke();
        } else if (this.selectedElement.type === 'diamond') {
          let x = this.changeFromOneScalingFactor(this.selectedElement.startX) + this.scrollX;
          let y = this.changeFromOneScalingFactor(this.selectedElement.startY) + this.scrollY;
          this.tempContext.setLineDash([6]);
          this.tempContext.strokeRect(x - 5, y - 5, this.changeFromOneScalingFactor(this.selectedElement.width) + 10, this.changeFromOneScalingFactor(this.selectedElement.height) + 10);
        } else if (this.selectedElement.type === 'text') {
          let x = this.changeFromOneScalingFactor(this.selectedElement.x) + this.scrollX;
          let y = this.changeFromOneScalingFactor(this.selectedElement.y) + this.scrollY;
          this.tempContext.setLineDash([6]);
          this.tempContext.strokeRect(x - 5, y - 5, this.changeFromOneScalingFactor(this.selectedElement.width), this.changeFromOneScalingFactor(this.selectedElement.height));
        }
      }
    }
  }

  redraw() {
    this.tempContext.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
    this.tempContext.restore();
    this.tempContext.setLineDash([]);
    this.tempContext.strokeStyle = this.selectedTheme === 'dark' ? "#FFFFFF" : '#000000';;
    this.tempContext.fillStyle = this.selectedTheme === 'dark' ? "#424242" : '#000000';;
    // TODO: Move to utility for each shape.
    this.shapes.forEach(shape => {
      if (shape.type === 'rectangle') {
        this.tempContext.strokeRect(this.changeFromOneScalingFactor(shape.x) + this.scrollX, this.changeFromOneScalingFactor(shape.y) + this.scrollY, this.changeFromOneScalingFactor(shape.width), this.changeFromOneScalingFactor(shape.height));
      } else if (shape.type === 'arrow') {
        let headlen = 10;
        let x = this.changeFromOneScalingFactor(shape.x) + this.scrollX;
        let y = this.changeFromOneScalingFactor(shape.y) + this.scrollY;
        let endX = this.changeFromOneScalingFactor(shape.endX) + this.scrollX;
        let endY = this.changeFromOneScalingFactor(shape.endY) + this.scrollY;
        let dx = endX - x;
        let dy = endY - y;
        let angle = Math.atan2(dy, dx);
        this.tempContext.beginPath();
        this.tempContext.moveTo(x, y)
        this.tempContext.lineTo(endX, endY);
        this.tempContext.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
        this.tempContext.moveTo(endX, endY);
        this.tempContext.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
        this.tempContext.stroke();
        this.tempContext.closePath();
      } else if (shape.type === 'line') {
        this.tempContext.beginPath();
        this.tempContext.moveTo(this.changeFromOneScalingFactor(shape.x) + this.scrollX, this.changeFromOneScalingFactor(shape.y) + this.scrollY);
        this.tempContext.lineTo(this.changeFromOneScalingFactor(shape.endX) + this.scrollX, this.changeFromOneScalingFactor(shape.endY) + this.scrollY);
        this.tempContext.stroke();
        this.tempContext.closePath();
      } else if (shape.type === 'text') {
        let color = this.selectedTheme === 'dark' ? "#FFFFFF" : '#000000';
        console.log('Draqwinf test');
        drawText(shape.textContent, this.tempContext, this.changeFromOneScalingFactor(shape.x) + this.scrollX, this.changeFromOneScalingFactor(shape.y) + this.scrollY, this.changeFromOneScalingFactor(shape.width), this.baseLineHeight, color, this.baseFontSize);
      } else if (shape.type === 'circle') {
        let x = this.changeFromOneScalingFactor(shape.x) + this.scrollX;
        let y = this.changeFromOneScalingFactor(shape.y) + this.scrollY;
        this.tempContext.beginPath();
        this.tempContext.arc(x, y, this.changeFromOneScalingFactor(shape.radius), 0, 2 * Math.PI);
        this.tempContext.stroke();
      } else if (shape.type === 'diamond') {
        let xCenter = this.changeFromOneScalingFactor(shape.x) + this.scrollX;
        let yCenter = this.changeFromOneScalingFactor(shape.y) + this.scrollY;
        let size = this.changeFromOneScalingFactor(shape.x - shape.endX);
        drawDiamond(xCenter, yCenter, size, this.tempContext);
      }
    });


    // clear the present canvas
    this.mainContext.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
    this.mainContext.drawImage(this.tempCanvas, 0, 0);
    this.tempContext.restore();
    this.tempContext.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
  }



  onEvent(ev) {
    // if (ev.layerX || ev.layerX == 0) { // Firefox 
    //   ev._x = ev.layerX;
    //   ev._y = ev.layerY;
    // } else if (ev.offsetX || ev.offsetX == 0) { // Opera 
    //   ev._x = ev.offsetX;
    //   ev._y = ev.offsetY;
    // }

    // ev._x = ev.x - this.scrollX;
    // ev._y = ev.y - this.scrollY;
    ev._x = ev.x;
    ev._y = ev.y;

    // let isUserDragging = false;

    if (this.selectedTool === 'select') {
      if (ev.type === 'mousedown') {
        this.mouseXPosition = ev._x;
        this.mouseYPosition = ev._y;
      } else if (ev.type === 'mousemove') {
        if (this.mouseYPosition && this.mouseXPosition) {
          let diffX = Math.abs(this.mouseXPosition - ev._x);
          let diffY = Math.abs(this.mouseYPosition - ev._y);
          if (diffX > 20 || diffY > 20) {
            this.isUserDragging = true;

          }
        }
      } else {
        this.isUserDragging = false;
        this.mouseXPosition = null;
        this.mouseYPosition = null;
      }


    } else {
      this.isUserDragging = false;
      this.mouseXPosition = null;
      this.mouseYPosition = null;
    }
    // Get the tool's event handler. 

    if (this.isUserDragging) {
      // Handlinng the case for move
      this.selectedTool = 'move';
      // since we are moving across the canvas. we need to take into the account of scrollx and scrolly values
      ev._x = this.changeToOneScalingFactor(ev.x - this.scrollX);
      ev._y = this.changeToOneScalingFactor(ev.y - this.scrollY);
      if (!this.draggingElement) {
        // First case of move tool -> User just selected the element.events should be mousedown
        let elementSelected = getElementsAtPosition(this.changeToOneScalingFactor(this.mouseXPosition - this.scrollX), this.changeToOneScalingFactor(this.mouseYPosition - this.scrollY), this.shapes);
        if (elementSelected) {
          this.selectedElement = elementSelected;

          this.draggingElement = elementSelected;
          // TODO: Remove element from main canvas . Need to check whether we need to remove since we will be resetDraggingValuesing the entire canvas ??
          this.tempContext.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
          //modifyig the selectedElement
          let selectedElement = {
            ...this.selectedElement,
            x: this.changeFromOneScalingFactor(this.selectedElement.x),
            y: this.changeFromOneScalingFactor(this.selectedElement.y),
            endX: this.changeFromOneScalingFactor(this.selectedElement.endX),
            endY: this.changeFromOneScalingFactor(this.selectedElement.endY),
            startX: this.changeFromOneScalingFactor(this.selectedElement.startX),
            startY: this.changeFromOneScalingFactor(this.selectedElement.startY),
            radius: this.changeFromOneScalingFactor(this.selectedElement.radius),
            width: this.selectedElement.width ? this.changeFromOneScalingFactor(this.selectedElement.width) : null,
            height: this.selectedElement.height ? this.changeFromOneScalingFactor(this.selectedElement.height) : null,
            scalingFactor: this.scalingFactor
          }
          this.tool = new MoveTool(this.tempCanvas, this.tempContext, this.imgUpdate, selectedElement, this.selectedTheme);
          // element is present. we need to call movetool
          this.tool['mousedown'](ev);

        }

        // ?? 
      } else if (this.mouseXPosition !== null && this.mouseYPosition !== null) {
        // events are mousemove or mouseup. Need to check whether this condition is required
        if (ev.type === 'mousemove' || ev.type === 'mouseup') {
          // movetool instace should already by present
          if (this.tool) {
            this.tool[ev.type](ev);
            if (ev.type === 'mouseup') {
              this.isUserDragging = false;
              this.mouseXPosition = null;
              this.mouseYPosition = null;
            }

          }
        }
      }
    } else if (this.tool) {
      let func = this.tool[ev.type];
      if (func) {
        func(ev);
      }
    }


  }

  imgUpdate(drawenImage) {
    if (drawenImage && drawenImage.type) {
      /** TODO: Change this logic to object key value structure */

      let modifiedImage = {
        ...drawenImage,
        x: this.changeToOneScalingFactor(drawenImage.x - this.scrollX),
        y: this.changeToOneScalingFactor(drawenImage.y - this.scrollY),
        endX: this.changeToOneScalingFactor(drawenImage.endX - this.scrollX),
        endY: this.changeToOneScalingFactor(drawenImage.endY - this.scrollY),
        startX: this.changeToOneScalingFactor(drawenImage.startX - this.scrollX),
        startY: this.changeToOneScalingFactor(drawenImage.startY - this.scrollY),
        radius: this.changeToOneScalingFactor(drawenImage.radius),
        width: drawenImage.width ? this.changeToOneScalingFactor(drawenImage.width) : null,
        height: drawenImage.height ? this.changeToOneScalingFactor(drawenImage.height) : null,
        scalingFactor: this.scalingFactor
      }
      let filteredShapes = this.shapes.filter(shape => shape.id !== drawenImage.id);
      this.shapes = [...filteredShapes, modifiedImage];
    }
    console.log(this.shapes, this.selectedTool);
    this.resetDraggingValues();


    requestAnimationFrame(() => {

      // if the action is delete or move. wee nneed to call resetDraggingValues
      if (this.selectedTool === 'move' || this.selectedTool === 'text') {
        this.redraw();
        this.selectedTool = 'select';
        //this.tool = new SelectTool(this.shapes);
        /**CHange this to util */
        let element = document.getElementById('select');
        let previousSelectedEle = document.querySelector('.selected');
        previousSelectedEle.classList.remove('selected');
        element.classList.add('selected');
        /** */

        this.tool = null;
      } else {
        this.mainContext.drawImage(this.tempCanvas, 0, 0);
        //this.tempContext.restore();
        this.tempContext.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
        //this.renderParticularShape(modifiedImage);

        // Changing to select tool once we have drawn a shape except to typing text
        if (this.selectedTool !== 'text') {
          this.selectedTool = 'select';
          //this.tool = new SelectTool(this.shapes);

          /**CHange this to util */
          let element = document.getElementById('select');
          let previousSelectedEle = document.querySelector('.selected');
          previousSelectedEle.classList.remove('selected');
          element.classList.add('selected');
          /** */


          this.tool = null;
        }
      }
      // this.redraw();

    })

  }

  resetDraggingValues() {
    this.isUserDragging = false;
    this.draggingElement = null;
    this.mouseXPosition = null;
    this.mouseYPosition = null;
  }

  updateTool(value, id = null) {
    if (this.tools[value]) {
      this.selectedTool = value;
      let selectedOne = this.tools[this.selectedTool];
      // For storing the shapes. we are generating ids.
      if (!id) {
        this.id = this.id + 1;
        this.tool = new selectedOne(this.tempCanvas, this.tempContext, this.imgUpdate, this.id, this.selectedTheme);
      } else {
        this.tool = new selectedOne(this.tempCanvas, this.tempContext, this.imgUpdate, id, this.selectedTheme);
      }

    }
  }

  updateCanvas({ width, height }) {
    this.mainCanvas.width = width;
    this.mainCanvas.height = height;
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;
    this.redraw();
  }

  updateTheme() {
    this.selectedTheme = this.selectedTheme === 'dark' ? 'light' : 'dark';
    this.tempContext.strokeStyle = this.selectedTheme === 'dark' ? "#FFFFFF" : '#000000';// Default line color. 
    this.tempContext.lineWidth = 1.0;// Default stroke weight. 

    // Fill transparent canvas with dark grey (So we can use the color to erase). 
    this.tempContext.fillStyle = this.selectedTheme === 'dark' ? "#424242" : '#FFFFFF';
    this.tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);//Top, Left, Width, Height of canvas
    this.redraw();
  }
}




window.addEventListener('load', function () {

  function init() {

    let tools = {
      move: '',
      chalk: Chalk,
      line: Line,
      rect: Rect,
      arrow: Arrow,
      text: DrawText,
      circle: Circle,
      diamond: Diamond
    };

    let canvas = document.getElementById('drawingCanvas');
    let drawingTool = new InitCanvas(canvas, tools);

    let toolCollections = document.getElementsByClassName('tool-icon');

    function updateTool(e) {
      let element = e.currentTarget;
      let previousSelectedEle = document.querySelector('.selected');
      previousSelectedEle.classList.remove('selected');
      element.classList.add('selected');
      drawingTool.updateTool(element.id);
    }

    function switchTheme(event) {
      event.stopPropagation();
      document.body.classList.toggle('dark-mode');
      drawingTool.updateTheme();
    }

    for (var i = 0; i < toolCollections.length; i++) {
      toolCollections[i].addEventListener('click', updateTool, false);
    }

    function onResize(ev) {
      drawingTool.updateCanvas({ width: window.innerWidth, height: window.innerHeight })
    }

    let toggleModeEle = document.getElementById('toggleDarkMode');

    toggleModeEle.addEventListener('click', switchTheme);

    window.addEventListener('resize', onResize);

  }


  init();
}, false)


