export class GridView {
  constructor() {
    this.board = document.getElementById('canvas');
    this.ctx = this.board.getContext('2d');
    this.border = document.getElementById('border');
    this.square = 100;
    this.borderLocation = { x: 0, y: 0 };
  }

  drawBoard() {
    for (let i = 1; i < 10; i++) {
      const startX = this.square * i;
      const startY = 0;
      this.ctx.beginPath();
      this.ctx.lineWidth = 0.5;
      this.ctx.strokeStyle = '#000000';
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(startX, startY + 1000);
      this.ctx.stroke();
    }
    for (let i = 1; i < 10; i++) {
      const startY = this.square * i;
      const startX = 0;
      this.ctx.beginPath();
      this.ctx.lineWidth = 0.5;
      this.ctx.strokeStyle = '#000000';
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(startX + 1000, startY);
      this.ctx.stroke();
    }
  }

  renderCoordinates(coordinates) {
    coordinates.forEach((item) => {
      this.ctx.fillStyle = item.color;
      this.ctx.fillRect(item.x, item.y, 5, 5);
    });
  }

  updateHoverBorder(x, y) {
    const flooredX = Math.floor(x / this.square) * this.square;
    const flooredY = Math.floor(y / this.square) * this.square;

    if (flooredX !== this.borderLocation.x || flooredY !== this.borderLocation.y) {
      this.border.style.top = `${flooredY}px`;
      this.border.style.left = `${flooredX}px`;
      this.borderLocation.x = flooredX;
      this.borderLocation.y = flooredY;
    }
  }

  getCanvasBoundingRect() {
    return this.board.getBoundingClientRect();
  }

  bindClickHandler(handler) {
    this.board.addEventListener('click', handler);
  }

  bindMouseMoveHandler(handler) {
    this.board.addEventListener('mousemove', handler);
  }
}
