export class GridModel {
  constructor() {
    this.coordinates = [];
  }

  async fetchCoordinates() {
    try {
      const response = await fetch('/api/coordinates');
      const data = await response.json();
      this.coordinates = data.data;
      return this.coordinates;
    } catch (err) {
      console.error('Error fetching coordinates:', err);
      throw err;
    }
  }

  getCoordinates() {
    return this.coordinates;
  }
}
