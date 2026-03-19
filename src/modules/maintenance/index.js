import express           from 'express';
import maintenanceRoutes from './routes/maintenance.routes.js';

const router = express.Router();

router.use('/', maintenanceRoutes);

export default router;