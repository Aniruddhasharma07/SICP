import { Router } from 'express';
import { PrototypeController } from './prototype.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';

export const prototypeRouter = Router();

// Project prototypes
prototypeRouter.post(
  '/projects/:id/prototypes',
  authMiddleware,
  requirePermission('prototype:create'),
  PrototypeController.create
);

prototypeRouter.get(
  '/projects/:id/prototypes',
  authMiddleware,
  PrototypeController.listForProject
);

// Prototype-specific endpoints
prototypeRouter.get(
  '/prototypes/:id',
  authMiddleware,
  PrototypeController.getById
);

prototypeRouter.post(
  '/prototypes/:id/submit',
  authMiddleware,
  requirePermission('prototype:submit'),
  PrototypeController.submit
);

prototypeRouter.post(
  '/prototypes/:id/review',
  authMiddleware,
  requirePermission('prototype:review'),
  PrototypeController.review
);

prototypeRouter.post(
  '/prototypes/:id/revise',
  authMiddleware,
  requirePermission('prototype:create'),
  PrototypeController.revise
);
