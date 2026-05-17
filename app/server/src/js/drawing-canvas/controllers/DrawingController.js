export class DrawingController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.urlParams = null;
  }

  async init() {
    this.parseURLParams();
    this.view.drawBoard();
    await this.loadGrid();
    this.bindEvents();
  }

  parseURLParams() {
    const queryString = window.location.search;
    this.urlParams = new URLSearchParams(queryString);
  }

  async loadGrid() {
    const x = this.urlParams.get('x');
    const y = this.urlParams.get('y');

    try {
      const gridData = await this.model.fetchGrid(x, y);
      this.view.renderGrid(gridData, x, y);
    } catch (err) {
      console.error('Error loading grid:', err);
    }
  }

  bindEvents() {
    window.addEventListener('load', () => this.loadGrid());

    this.view.bindColorInputClick(() => {
      if (this.model.isDeleting()) {
        this.model.setDeleting(false);
        this.view.hideEraseBorder();
        this.model.setColor('#FFFFFF');
      }
    });

    this.view.bindColorInputChange((e) => {
      this.model.setColor(e.target.value);
    });

    this.view.bindPointerDown((e) => {
      this.model.setDrawing(true);
      this.view.setPointerCapture(e.pointerId);
    });

    this.view.bindPointerMove((event) => {
      if (!this.model.isDrawing()) return;

      const coords = this.view.getCanvasCoordinates(event);

      if (this.view.hasLocationChanged(coords.flooredX, coords.flooredY)) {
        this.view.updateMouseLocation(coords.flooredX, coords.flooredY);
        this.view.drawSquare(coords.flooredX, coords.flooredY, this.model.getColor());

        const urlX = parseInt(this.urlParams.get('x'));
        const urlY = parseInt(this.urlParams.get('y'));

        this.model.addToStroke(
          parseInt(coords.flooredX / 5 + urlX),
          parseInt(coords.flooredY / 5 + urlY),
          this.model.getColor()
        );
      }
    });

    this.view.bindPointerUp(async () => {
      const x = parseInt(this.urlParams.get('x'));
      const y = parseInt(this.urlParams.get('y'));
      this.model.setDrawing(false);
      await this.model.saveStroke(x, y);
    });

    this.view.bindPointerCancel(() => {
      this.model.setDrawing(false);
    });

    this.view.bindEraseClick(() => {
      const deleting = !this.model.isDeleting();
      this.model.setDeleting(deleting);

      if (deleting) {
        this.view.showEraseBorder();
        this.model.setColor('#FFFFFF');
      } else {
        this.view.hideEraseBorder();
        this.model.setColor('#000000');
      }
    });

    this.view.bindClearClick(async () => {
      try {
        await this.model.clearGrid();
        this.view.clearCanvas();
        this.view.closeModal();
        this.view.drawBoard();
      } catch (err) {
        console.error('Error clearing grid:', err);
      }
    });

    this.view.bindWindowMouseMove((e) => {
      if (this.model.isDeleting()) {
        this.view.updateEraseBorderPosition(e.clientX, e.clientY);
      }
    });
  }
}
