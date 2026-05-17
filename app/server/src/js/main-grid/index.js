import { GridModel } from './models/GridModel.js';
import { GridView } from './views/GridView.js';
import { GridController } from './controllers/GridController.js';

const model = new GridModel();
const view = new GridView();
const controller = new GridController(model, view);

controller.init();
