import { Router } from "express";
import {
    createContact, updateContactStatus , getContacts
} from "../controllers/contact.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/create", verifyJWT, createContact);
router.post("/update/:contactId", verifyJWT, updateContactStatus);
router.get("/", verifyJWT, getContacts);


export default router;
