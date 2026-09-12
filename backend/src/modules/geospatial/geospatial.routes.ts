import { Router } from 'express';
import { GeospatialController } from './geospatial.controller';

export const geospatialRouter = Router();

geospatialRouter.get('/points', GeospatialController.getPoints);
geospatialRouter.get('/clusters', GeospatialController.getClusters);
geospatialRouter.post('/reverse-geocode', GeospatialController.reverseGeocode);
