import express from "express";
import u from "@/utils";
import { success } from "@/lib/responseFormat";
const router = express.Router();

// Get all global (cross-project) characters + public characters
export default router.post("/", async (req, res) => {
  const characters = await u
    .db("t_character")
    .where(function () {
      this.whereNull("projectId").orWhere("isPublic", 1);
    })
    .select("*");

  const result = characters.map((char: any) => ({
    ...char,
    referenceImages: char.referenceImages ? JSON.parse(char.referenceImages) : [],
    stateHistory: char.stateHistory ? JSON.parse(char.stateHistory) : [],
  }));

  res.status(200).send(success(result));
});
