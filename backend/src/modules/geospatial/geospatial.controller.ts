import { Request, Response, NextFunction } from 'express';
import { GeospatialService, GeoFilterInput } from './geospatial.service';
import { sendSuccess } from '../../utils/response';

export class GeospatialController {
  public static async getPoints(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: GeoFilterInput = {
        category: req.query.category as string | undefined,
        severity: req.query.severity as string | undefined,
        status: req.query.status as string | undefined,
        district: req.query.district as string | undefined,
        state: req.query.state as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const result = await GeospatialService.getPoints(filters);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getClusters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: GeoFilterInput = {
        category: req.query.category as string | undefined,
        severity: req.query.severity as string | undefined,
        status: req.query.status as string | undefined,
        district: req.query.district as string | undefined,
        state: req.query.state as string | undefined,
      };

      const result = await GeospatialService.getClusters(filters);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async reverseGeocode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { latitude, longitude } = req.body;
      if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
        sendSuccess(
          res,
          {
            latitude: null,
            longitude: null,
            district: null,
            state: null,
            locality: null,
            postcode: null,
            formattedAddress: null,
            resolved: false,
            message: 'Numerical latitude and longitude are required for reverse geocoding.',
          },
          400
        );
        return;
      }

      const result = await GeospatialService.reverseGeocode(Number(latitude), Number(longitude));
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}
