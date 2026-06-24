import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, trim: true, maxlength: 80 },
        email: { type: String, required: true, trim: true, lowercase: true, unique: true },
        legajo: { type: String, default: "", trim: true, maxlength: 20 },
        passwordHash: { type: String, required: true },
        passwordSalt: { type: String, required: true },
        activo: { type: Boolean, default: true }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

export const User = mongoose.model("User", userSchema);
