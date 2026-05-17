export class DrawingView {
  constructor() {
    this.board = document.getElementById('canvas');
    this.ctx = this.board.getContext('2d');
    this.colorInput = document.getElementById('color-picker');
    this.clearButton = document.getElementById('clear-accept');
    this.eraseButton = document.getElementById('erase');
    this.eraseBorder = document.getElementById('erase-border');
    this.modal = document.getElementById('staticBackdrop');
    this.square = 25;
    this.mouseLocation = { x: 0, y: 0 };
  }

  drawBoard() {
    for (let i = 1; i < 20; i++) {
      const startX = this.square * i;
      const startY = 0;
      this.ctx.beginPath();
      this.ctx.lineWidth = 0.5;
      this.ctx.strokeStyle = '#000000';
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(startX, startY + 500);
      this.ctx.stroke();
    }
    for (let i = 1; i < 20; i++) {
      const startY = this.square * i;
      const startX = 0;
      this.ctx.beginPath();
      this.ctx.lineWidth = 0.5;
      this.ctx.strokeStyle = '#000000';
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(startX + 500, startY);
      this.ctx.stroke();
    }
  }

  renderGrid(gridData, offsetX, offsetY) {
    gridData.forEach((item) => {
      this.ctx.fillStyle = item.color;
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 0.25;
      this.ctx.strokeRect(
        (item.x - offsetX) * 5,
        (item.y - offsetY) * 5,
        this.square,
        this.square
      );
      this.ctx.fillRect(
        (item.x - offsetX) * 5,
        (item.y - offsetY) * 5,
        this.square,
        this.square
      );
    });
  }

  drawSquare(x, y, color) {
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 0.25;
    this.ctx.fillRect(x, y, this.square, this.square);
    this.ctx.strokeRect(x, y, this.square, this.square);
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.board.width, this.board.height);
  }

  showEraseBorder() {
    this.eraseBorder.classList.remove('hidden');
  }

  hideEraseBorder() {
    this.eraseBorder.classList.add('hidden');
  }

  updateEraseBorderPosition(x, y) {
    this.eraseBorder.style.left = `${x}px`;
    this.eraseBorder.style.top = `${y}px`;
  }

  closeModal() {
    bootstrap.Modal.getInstance(this.modal).hide();
  }

  getCanvasCoordinates(event) {
    const rect = this.board.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const flooredX = Math.floor(x / this.square) * this.square;
    const flooredY = Math.floor(y / this.square) * this.square;

    return { x, y, flooredX, flooredY };
  }

  hasLocationChanged(x, y) {
    return x !== this.mouseLocation.x || y !== this.mouseLocation.y;
  }

  updateMouseLocation(x, y) {
    this.mouseLocation.x = x;
    this.mouseLocation.y = y;
  }

  bindColorInputClick(handler) {
    this.colorInput.addEventListener('click', handler);
  }

  bindColorInputChange(handler) {
    this.colorInput.addEventListener('input', handler);
  }

  bindPointerDown(handler) {
    this.board.addEventListener('pointerdown', handler);
  }

  bindPointerMove(handler) {
    this.board.addEventListener('pointermove', handler);
  }

  bindPointerUp(handler) {
    this.board.addEventListener('pointerup', handler);
  }

  bindPointerCancel(handler) {
    this.board.addEventListener('pointercancel', handler);
  }

  bindEraseClick(handler) {
    this.eraseButton.addEventListener('click', handler);
  }

  bindClearClick(handler) {
    this.clearButton.addEventListener('click', handler);
  }

  bindWindowMouseMove(handler) {
    window.addEventListener('mousemove', handler);
  }

  setPointerCapture(pointerId) {
    this.board.setPointerCapture(pointerId);
  }
}
