import { Router } from 'express';
import {verifyJWT} from '../middlewares/autho.middleware.js';
import { getLikedVideos, removeVideoFromLikedVideos, toggleCommentLike, togglePostLike, toggleVideoLike } from '../controllers/like.controller.js';

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/toggle/v/:videoId").post(toggleVideoLike);
router.route("/toggle/c/:commentId").post(toggleCommentLike);
router.route("/toggle/p/:postId").post(togglePostLike);
router.route("/videos").get(getLikedVideos);
router.route("/remove-video/:videoId").delete(removeVideoFromLikedVideos)

export default router