import mongoose from "mongoose";

const catalogProductSchema = new mongoose.Schema(
    {
        PLU: { type: String, required: true, trim: true, unique: true },
        Producto: { type: String, required: true, trim: true },
        DTO: { type: String, default: "", trim: true },
        Departamento: { type: String, required: true, trim: true },
        UnidadMedida: {
            type: String,
            required: true,
            enum: ["uni", "kg"]
        },
        Categoria: {
            type: String,
            required: true,
            enum: ["producto-final", "materia-prima"],
            default: "producto-final"
        },
        Activo: { type: Boolean, default: true }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

catalogProductSchema.index({ Producto: "text", Departamento: "text", PLU: "text" });
catalogProductSchema.index({ Categoria: 1, Activo: 1 });

export const CatalogProduct = mongoose.model("CatalogProduct", catalogProductSchema);
