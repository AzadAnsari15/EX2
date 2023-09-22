class Rectangle {
  constructor(x, y, width = 0, height = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  draw(ctx) {
    ctx.fillStyle = "#FF5733";
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.fillStyle = "blue";
    ctx.fillRect(this.x + this.width - 5, this.y + this.height - 5, 10, 10);
  }

  // Check if a point (x, y) is inside the rectangle
  contains(x, y) {
    return (
      x > this.x &&
      x < this.x + this.width &&
      y > this.y &&
      y < this.y + this.height
    );
  }

  // Check if a point (x, y) is inside the resize indicator of the rectangle(for desktop)
  insideResizeIndicator(x, y) {
    const size = 50;
    return (
      x > this.x + this.width &&
      x < this.x + this.width + size &&
      y > this.y + this.height &&
      y < this.y + this.height + size
    );
  }
  // Resize the rectangle by a given scale factor
  resize(scaleFactor) {
    const deltaWidth = this.width * (scaleFactor - 1);
    const deltaHeight = this.height * (scaleFactor - 1);

    this.width *= scaleFactor;
    this.height *= scaleFactor;
    // Adjust the position to maintain the center of the rectangle
    this.x -= deltaWidth / 2;
    this.y -= deltaHeight / 2;
  }
  move(dx, dy) {
    this.x += dx;
    this.y += dy;
  }
}

class App {
  constructor() {
    /*
          
           */
    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.dottedRectDiv = document.getElementById("dottedRect");
    this.deleteButton = document.getElementById("deleteButton");

    this.rectangles = [];
    this.selectedRectangle = null;
    this.currentRectangle = null;
    this.startPointerPosition = null;
    this.isDrawing = false;
    this.isMoving = false;
    this.isResizing = false;

    this.pointers = new Map();
    this.initialPinchDistance = null;

    this.init();
  }

  init() {
    this.canvas.addEventListener("pointerdown", this.onPointerDown.bind(this));
    this.canvas.addEventListener("pointermove", this.onPointerMove.bind(this));
    this.canvas.addEventListener("pointerup", this.onPointerUp.bind(this));
    this.deleteButton.addEventListener(
      "click",
      this.deleteCurrentRect.bind(this)
    );
  }

  onPointerDown(e) {
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
      if (this.selectedRectangle.contains(x, y)) {
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

  onPointerMove(e) {
    const x = e.offsetX;
    const y = e.offsetY;
    this.pointers.set(e.pointerId, { x, y });

    if (this.isResizing && this.selectedRectangle) {
      if (this.pointers.size == 2) {
        const pointersArray = [...this.pointers.values()];
        const currentDistance = Math.hypot(
          pointersArray[1].x - pointersArray[0].x,
          pointersArray[1].y - pointersArray[0].y
        );
        const scaleFactor = currentDistance / this.initialPinchDistance;

        this.selectedRectangle.resize(scaleFactor);
        this.initialPinchDistance = currentDistance;
      } else {
        const newWidth = x - this.selectedRectangle.x;
        const newHeight = y - this.selectedRectangle.y;

        this.selectedRectangle.width = newWidth;
        this.selectedRectangle.height = newHeight;
      }

      this.showDeleteButton(this.selectedRectangle);
      this.updateDottedRect(this.selectedRectangle);
      this.drawCanvas();

      return;
    } else if (this.isDrawing) {
      this.currentRectangle.width = e.offsetX - this.currentRectangle.x;
      this.currentRectangle.height = e.offsetY - this.currentRectangle.y;
    } else if (this.isMoving && this.selectedRectangle) {
      const dx = e.offsetX - this.startPointerPosition.x;
      const dy = e.offsetY - this.startPointerPosition.y;

      this.selectedRectangle.move(dx, dy);

      this.startPointerPosition = { x: e.offsetX, y: e.offsetY };
      this.showDeleteButton(this.selectedRectangle);
      this.updateDottedRect(this.selectedRectangle);
    }

    this.drawCanvas();
  }

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

  deleteCurrentRect() {
    const index = this.rectangles.indexOf(this.selectedRectangle);
    if (index > -1) {
      this.rectangles.splice(index, 1);
      this.hideDeleteButton();
      this.hideDottedRect();
      this.drawCanvas();
    }
  }

  drawCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let rect of this.rectangles) {
      rect.draw(this.ctx);
    }
  }

  updateDottedRect(rect) {
    this.dottedRectDiv.style.display = "block";
    this.dottedRectDiv.style.left = rect.x - 5 + "px";
    this.dottedRectDiv.style.top = rect.y - 5 + "px";
    this.dottedRectDiv.style.width = rect.width + "px";
    this.dottedRectDiv.style.height = rect.height + "px";
  }

  hideDottedRect() {
    this.dottedRectDiv.style.display = "none";
  }

  showDeleteButton(rect) {
    this.deleteButton.style.display = "block";
    this.deleteButton.style.left = rect.x + rect.width + "px";
    this.deleteButton.style.top = rect.y - 20 + "px";
  }

  hideDeleteButton() {
    this.deleteButton.style.display = "none";
  }
}

new App();
