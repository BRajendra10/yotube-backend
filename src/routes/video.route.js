import { Router } from 'express';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/autho.middleware.js';
import { deleteVideo, getAllVideos, getVideoById, publishVideo, updateVideoDetails } from '../controllers/video.controller.js';

const router = Router()

router.use(verifyJWT);
// to see or perform any task user must be verifyed

router
    .route("/")
    .get(getAllVideos)
    .post(
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1
            },
            {
                name: "thumbnail",
                maxCount: 1
            }
        ]),
        publishVideo
    )

router.route("/:videoId").patch(
    upload.fields([
            {
                name: "videoFile",
                maxCount: 1
            },
            {
                name: "thumbnail",
                maxCount: 1
            }
        ]), 
        updateVideoDetails
    )

router
    .route("/:videoId")
        .get(getVideoById)
        .delete(deleteVideo)

export default router