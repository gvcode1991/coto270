import mongoose from "mongoose";

const productoBalanceSchema = new mongoose.Schema(
    {
        PLU: { type: String, required: true, trim: true },
        Producto: { type: String, required: true, trim: true },
        DTO: { type: String, default: "", trim: true },
        Departamento: { type: String, required: true, trim: true },
        UnidadMedida: {
            type: String,
            required: true,
            enum: ["uni", "kg"]
        },
        CantidadContada: { type: Number, default: null, min: 0 }
    },
    { _id: true }
);

const balanceSchema = new mongoose.Schema(
    {
        fecha: { type: String, required: true },
        tipo: {
            type: String,
            required: true,
            enum: ["parcial-1", "parcial-2", "cierre"]
        },
        periodo: { type: String, required: true, trim: true },
        estado: {
            type: String,
            enum: ["preparacion", "contado"],
            default: "preparacion"
        },
        productos: {
            type: [productoBalanceSchema],
            validate: {
                validator: productos => productos.length > 0,
                message: "El balance debe incluir al menos un producto."
            }
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

balanceSchema.index({ fecha: 1, tipo: 1 }, { unique: true });
balanceSchema.index({ "productos.PLU": 1 });

export const Balance = mongoose.model("Balance", balanceSchema);
