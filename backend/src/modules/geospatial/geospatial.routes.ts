import { Router } from 'express';
import { GeospatialController } from './geospatial.controller';

export const geospatialRouter = Router();

geospatialRouter.get('/points', GeospatialController.getPoints);
geospatialRouter.get('/clusters', GeospatialController.getClusters);
geospatialRouter.get('/search', GeospatialController.searchGeocode);
geospatialRouter.get('/reverse-geocode', GeospatialController.reverseGeocode);
geospatialRouter.post('/reverse-geocode', GeospatialController.reverseGeocode);
