export class DrawingModel {
  constructor() {
    this.grid = [];
    this.stroke = [];
    this.color = '#000000';
    this.deleting = false;
    this.drawing = false;
  }

  async fetchGrid(x, y) {
    try {
      const response = await fetch(`/api/coordinates?x=${x}&y=${y}`);
      const data = await response.json();
      this.grid = data.data;
      return data.data;
    } catch (err) {
      console.error('Error fetching grid:', err);
      throw err;
    }
  }

  async saveStroke(x, y) {
    const filtered = this.stroke.filter(
      (item) =>
        item.x >= x && item.x < x + 100 && item.y >= y && item.y < y + 100
    );

    if (filtered.length === 0) {
      this.stroke = [];
      return;
    }

    try {
      if (this.deleting) {
        await fetch('/api/coordinates', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: filtered }),
        });
      } else {
        await fetch('/api/coordinates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: filtered }),
        });
      }
      this.stroke = [];
    } catch (err) {
      console.error('Error saving stroke:', err);
      throw err;
    }
  }

  async clearGrid() {
    try {
      await fetch('/api/coordinates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: this.grid }),
      });
      this.grid = [];
    } catch (err) {
      console.error('Error clearing grid:', err);
      throw err;
    }
  }

  addToStroke(x, y, color) {
    this.stroke.push({ x, y, color });
  }

  setColor(color) {
    this.color = color;
  }

  getColor() {
    return this.color;
  }

  setDeleting(value) {
    this.deleting = value;
    if (value) {
      this.color = '#FFFFFF';
    }
  }

  isDeleting() {
    return this.deleting;
  }

  setDrawing(value) {
    this.drawing = value;
  }

  isDrawing() {
    return this.drawing;
  }

  getGrid() {
    return this.grid;
  }
}
