import { Router } from 'express';
import {verifyJWT} from '../middlewares/autho.middleware.js';
import { createPost, deletePost, getAllPosts, getUserPosts, updatePost } from '../controllers/post.controller.js';

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createPost);
router.route("/").get(getAllPosts);
router.route("/user/:userId").get(getUserPosts);
router.route("/update_post/:postId").patch(updatePost);
router.route("/:postId").delete(deletePost);

export default router