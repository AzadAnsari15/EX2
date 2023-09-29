class Rectangle {
  /**
   * Constructor initializes the position and dimensions of the rectangle.
   */
  constructor(x, y, width = 0, height = 0) {
    /**
     * X-coordinate of the top-left corner
     */
    this.x = x;
    /**
     * Y-coordinate of the top-left corner
     */
    this.y = y;
    /**
     * Width of the rectangle
     */
    this.width = width;
    /**
     * Height of the rectangle
     */
    this.height = height;
  }

  /**
   *
   * Draw the rectangle on the canvas context content provided(ctx)
   */
  draw(ctx) {
    /** Set the rectangle color and draw it */
    ctx.fillStyle = "#FF5733";
    ctx.fillRect(this.x, this.y, this.width, this.height);
    /** Draw a small blue square at the bottom-right corner of the rectangle. */
    ctx.fillStyle = "blue";
    ctx.fillRect(this.x + this.width - 5, this.y + this.height - 5, 10, 10);
  }

  /**
   * Checks if a given point (x, y) lies within the rectangle boundaries
   */
  contains(x, y) {
    return (
      x > this.x &&
      x < this.x + this.width &&
      y > this.y &&
      y < this.y + this.height
    );
  }

  /**
   * Checks if a point (x, y) lies within the resize indicator (blue square) of the rectangle.
   */
  insideResizeIndicator(x, y) {
    const size = 50;
    return (
      x > this.x + this.width &&
      x < this.x + this.width + size &&
      y > this.y + this.height &&
      y < this.y + this.height + size
    );
  }
  /**
   * Adjusts the rectangle's dimensions based on the scale factor provided.
   * The rectangle's position is also adjusted to maintain its center.
   */
  resize(scaleFactor) {
    const deltaWidth = this.width * (scaleFactor - 1);
    const deltaHeight = this.height * (scaleFactor - 1);

    this.width *= scaleFactor; /** Adjust width */
    this.height *= scaleFactor; /** Adjust height */
    this.x -= deltaWidth / 2; /** Adjust x-coordinate to keep center constant */
    this.y -=
      deltaHeight / 2; /** Adjust y-coordinate to keep center constant */
  }

  /**
   * Moves the rectangle based on given deltas (dx, dy), ensuring it stays within canvas boundaries.
   */
  move(dx, dy, maxWidth, maxHeight) {
    this.x = Math.min(Math.max(0, this.x + dx), maxWidth - this.width);
    this.y = Math.min(Math.max(0, this.y + dy), maxHeight - this.height);
  }
}
/**
 * Class representing the main application for drawing and manipulating rectangles on a canvas.
 */
class App {
  /**
   * Constructor initializes the App with required DOM elements and event listeners.
   */
  constructor() {
    /** @type {HTMLCanvasElement} */
    this.canvas = document.getElementById("canvas");
    /** @type {CanvasRenderingContext2D} */
    this.ctx = this.canvas.getContext("2d");

    /** @type {HTMLElement} - Div element representing a dotted rectangle. */
    this.dottedRectDiv = document.getElementById("dottedRect");
    /** @type {HTMLElement} - Button to delete a rectangle. */
    this.deleteButton = document.getElementById("deleteButton");

    /** @type {Array} - List of drawn rectangles. */
    this.rectangles = [];
    /** @type {?Rectangle} - Currently selected rectangle. */
    this.selectedRectangle = null;
    /** @type {?Rectangle} - Rectangle that's currently being drawn. */
    this.currentRectangle = null;
    /** @type {?Object} - Starting position of the pointer. */
    this.startPointerPosition = null;
    /** @type {boolean} - Flag indicating if a rectangle is being drawn. */
    this.isDrawing = false;
    /** @type {boolean} - Flag indicating if a rectangle is being moved. */
    this.isMoving = false;
    /** @type {boolean} - Flag indicating if a rectangle is being resized. */
    this.isResizing = false;

    /** @type {Map} - Map of active pointers. */
    this.pointers = new Map();
    /** @type {?number} - Initial distance between two pointers during a pinch gesture. */
    this.initialPinchDistance = null;

    this.init();
  }

  /**
   * Setup initial event listeners and configurations.
   */
  init() {
    this.canvas.addEventListener("pointerdown", this.onPointerDown.bind(this));
    this.canvas.addEventListener("pointermove", this.onPointerMove.bind(this));
    this.canvas.addEventListener("pointerup", this.onPointerUp.bind(this));
    this.canvas.addEventListener(
      "pointercancel",
      this.onPointerCancel.bind(this)
    );

    this.deleteButton.addEventListener(
      "click",
      this.deleteCurrentRect.bind(this)
    );
  }
  /**
   * Handles the pointer down event.
   * @param {PointerEvent} e - The pointer event.
   */
  onPointerDown(e) {
    // If two fingers are already detected and they're inside the rectangle, ignore other fingers.
    if (this.pointers.size >= 2 && this.selectedRectangle && this.isResizing) {
      return;
    }

    const x = e.offsetX;
    const y = e.offsetY;
    this.startPointerPosition = { x, y };
    this.pointers.set(e.pointerId, { x, y });
    //eg for two fingure  {
    //   1: { x: 100, y: 150 },
    //   2: { x: 200, y: 250 }
    // }

    if (this.pointers.size === 1) {
      for (let rect of this.rectangles) {
        if (rect.insideResizeIndicator(x, y)) {
          this.isResizing = true;
          this.selectedRectangle = rect;
          this.showDeleteButton(rect);
          this.updateDottedRect(rect);
          return;
        } else if (rect.contains(x, y)) {
          this.selectedRectangle = rect;
          this.isMoving = true;
          this.showDeleteButton(rect);
          this.updateDottedRect(rect);
          return;
        }
      }

      if (!this.isMoving) {
        this.isDrawing = true;
        this.currentRectangle = new Rectangle(x, y);
        this.rectangles.push(this.currentRectangle);
      }
    } else if (this.pointers.size === 2 && this.selectedRectangle) {
      const firstPoint = this.pointers.values().next().value;
      if (
        this.selectedRectangle.contains(firstPoint.x, firstPoint.y) &&
        this.selectedRectangle.contains(x, y)
      ) {
        this.isResizing = true;
        this.isMoving = false;
        const pointersArray = [...this.pointers.values()];
        this.initialPinchDistance = Math.hypot(
          pointersArray[1].x - pointersArray[0].x,
          pointersArray[1].y - pointersArray[0].y
        );
      }
    }
  }
  /**
   * Handles the pointer move event.
   * @param {PointerEvent} e - The pointer event.
   */
  onPointerMove(e) {
    const x = e.offsetX;
    const y = e.offsetY;
    // If we're resizing, only update the pointers if it's one of the initial two.
    if (
      this.isResizing &&
      this.selectedRectangle &&
      !this.pointers.has(e.pointerId)
    ) {
      return; // Ignore this pointer move event if it's a third (or more) finger.
    }
    this.pointers.set(e.pointerId, { x, y });

    if (this.isResizing && this.selectedRectangle) {
      if (this.pointers.size === 2) {
        const pointersArray = [...this.pointers.values()];

        const currentDistance = Math.hypot(
          pointersArray[1].x - pointersArray[0].x,
          pointersArray[1].y - pointersArray[0].y
        );
        const scaleFactor = currentDistance / this.initialPinchDistance;

        this.selectedRectangle.resize(scaleFactor);
        this.initialPinchDistance = currentDistance;
      } else if (this.pointers.size === 1) {
        // Single-finger resize based on the indicator
        const newWidth = x - this.selectedRectangle.x;
        const newHeight = y - this.selectedRectangle.y;

        this.selectedRectangle.width = Math.max(newWidth, 10); // setting a minimum width
        this.selectedRectangle.height = Math.max(newHeight, 10); // setting a minimum height
      }

      this.showDeleteButton(this.selectedRectangle);
      this.updateDottedRect(this.selectedRectangle);
      this.drawCanvas();

      return;
    } else if (this.isDrawing && this.pointers.size === 1) {
      this.currentRectangle.width = e.offsetX - this.currentRectangle.x;
      this.currentRectangle.height = e.offsetY - this.currentRectangle.y;
    } else if (
      this.isMoving &&
      this.selectedRectangle &&
      this.pointers.size === 1
    ) {
      const dx = e.offsetX - this.startPointerPosition.x;
      const dy = e.offsetY - this.startPointerPosition.y;

      this.selectedRectangle.move(
        dx,
        dy,
        this.canvas.width,
        this.canvas.height
      );

      this.startPointerPosition = { x: e.offsetX, y: e.offsetY };
      this.showDeleteButton(this.selectedRectangle);
      this.updateDottedRect(this.selectedRectangle);
    }

    this.drawCanvas();
  }
  /**
   * Handle user lifting their pointer (or finger) from the canvas.
   */
  onPointerUp(e) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) {
      this.initialPinchDistance = null;
    }
    if (this.pointers.size === 0) {
      this.isDrawing = false;
      this.isMoving = false;
      this.isResizing = false;
    }
  }
  /**
   * Handle a pointer (or finger) getting unexpectedly cancelled.
   */
  onPointerCancel(e) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) {
      this.initialPinchDistance = null;
    }

    if (this.pointers.size === 0) {
      this.isDrawing = false;
      this.isMoving = false;
      this.isResizing = false;
    }
  }
  /** Deletes the currently selected rectangle. */
  deleteCurrentRect() {
    const index = this.rectangles.indexOf(this.selectedRectangle);
    if (index > -1) {
      this.rectangles.splice(index, 1);
      this.hideDeleteButton();
      this.hideDottedRect();
      this.drawCanvas();
    }
  }
  /** Redraws all rectangles on the canvas. */
  drawCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let rect of this.rectangles) {
      rect.draw(this.ctx);
    }
  }
  /**
   * Updates the visual dotted rectangle to match the current rectangle's position and size.
   * @param {Rectangle} rect - The rectangle object to match.
   */
  updateDottedRect(rect) {
    this.dottedRectDiv.style.display = "block";
    this.dottedRectDiv.style.left = rect.x - 5 + "px";
    this.dottedRectDiv.style.top = rect.y - 5 + "px";
    this.dottedRectDiv.style.width = rect.width + "px";
    this.dottedRectDiv.style.height = rect.height + "px";
  }
  /** Hides the visual dotted rectangle. */
  hideDottedRect() {
    this.dottedRectDiv.style.display = "none";
  }
  /**
   * Displays the delete button near the currently selected rectangle.
   * @param {Rectangle} rect - The rectangle object to display the delete button near.
   */
  showDeleteButton(rect) {
    this.deleteButton.style.display = "block";
    this.deleteButton.style.left = rect.x + rect.width + "px";
    this.deleteButton.style.top = rect.y - 20 + "px";
  }
  /**
   * Handle a pointer (or finger) getting unexpectedly cancelled.
   */
  hideDeleteButton() {
    this.deleteButton.style.display = "none";
  }
}
/** Instantiate the main application. */
new App();
