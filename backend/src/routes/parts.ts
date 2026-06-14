import { Router } from 'express';
import { listParts, getSummary, getPart, updatePart } from '../controllers/partsController';
import { streamParts } from '../controllers/streamController';

const router = Router();

// 注意:/summary 與 /stream 必須排在 /:id 之前,否則會被當成 id="summary"/"stream" 攔截
router.get('/summary', getSummary);
router.get('/stream', streamParts); // SSE:後端推播 IoT 庫存異動
router.get('/', listParts);
router.get('/:id', getPart);
router.patch('/:id', updatePart);

export default router;
