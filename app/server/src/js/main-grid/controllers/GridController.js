export class GridController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.square = 100;
  }

  async init() {
    this.view.drawBoard();
    await this.loadGrid();
    this.bindEvents();
  }

  async loadGrid() {
    try {
      const coordinates = await this.model.fetchCoordinates();
      this.view.renderCoordinates(coordinates);
    } catch (err) {
      console.error('Error loading grid:', err);
    }
  }

  bindEvents() {
    this.view.bindClickHandler(this.handleClick.bind(this));
    this.view.bindMouseMoveHandler(this.handleMouseMove.bind(this));

    window.addEventListener('load', () => this.loadGrid());
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        this.loadGrid();
      }
    });
  }

  handleClick(event) {
    const rect = this.view.getCanvasBoundingRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.navigateToSquare(x, y);
  }

  handleMouseMove(event) {
    const rect = this.view.getCanvasBoundingRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.view.updateHoverBorder(x, y);
  }

  navigateToSquare(x, y) {
    const flooredX = this.roundToHundredFloor(x);
    const flooredY = this.roundToHundredFloor(y);

    const params = new URLSearchParams({ x: flooredX, y: flooredY });
    const url = new URL('square.html', window.location.href);
    url.search = params.toString();

    window.location.href = url.toString();
  }

  roundToHundredFloor(n) {
    return Math.floor(n / 100) * 100;
  }
}
