import { DrawingModel } from './models/DrawingModel.js';
import { DrawingView } from './views/DrawingView.js';
import { DrawingController } from './controllers/DrawingController.js';

const model = new DrawingModel();
const view = new DrawingView();
const controller = new DrawingController(model, view);

controller.init();
