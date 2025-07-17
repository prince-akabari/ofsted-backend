import { Router } from 'express';
import { getDashboardOverview } from '../controllers/dashboard.controller';
const router = Router();

router.get('/', getDashboardOverview);

export default router;
