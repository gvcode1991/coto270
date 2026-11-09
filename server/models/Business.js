import mongoose from "mongoose";
import { RUBROS } from "../../src/lib/business.js";

const businessSchema = new mongoose.Schema({
    _id: { type: String, default: "principal" },
    nombre: { type: String, required: true, trim: true, maxlength: 100 },
    rubro: { type: String, required: true, enum: Object.keys(RUBROS) }
}, { timestamps: true, versionKey: false });

export const Business = mongoose.model("Business", businessSchema);
