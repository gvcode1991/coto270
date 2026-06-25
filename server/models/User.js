import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, trim: true, maxlength: 80 },
        apellido: { type: String, required: true, trim: true, maxlength: 80 },
        email: { type: String, required: true, trim: true, lowercase: true, unique: true },
        legajo: { type: String, default: "", trim: true, maxlength: 20 },
        passwordHash: { type: String, required: true },
        passwordSalt: { type: String, default: "" },
        recoveryCodeHash: { type: String, default: "" },
        rol: {
            type: String,
            enum: ["admin", "gerente", "referente", "operador"],
            default: "operador",
            index: true
        },
        estado: {
            type: String,
            enum: ["pendiente", "aprobado", "rechazado"],
            default: "pendiente",
            index: true
        },
        activo: { type: Boolean, default: true },
        aprobadoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        aprobadoEn: { type: Date, default: null },
        ultimoAcceso: { type: Date, default: null }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

export const User = mongoose.model("User", userSchema);
