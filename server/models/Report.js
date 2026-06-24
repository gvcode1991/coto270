import mongoose from "mongoose";

const ventaDiariaSchema = new mongoose.Schema(
    {
        fecha: { type: String, required: true },
        etiqueta: { type: String, required: true },
        UniKg: { type: Number, default: 0 },
        VentaTotal: { type: Number, default: 0 }
    },
    { _id: false }
);

const productoSchema = new mongoose.Schema(
    {
        PLU: { type: String, required: true, trim: true },
        Producto: { type: String, required: true, trim: true },
        DTO: { type: String, default: "", trim: true },
        Departamento: { type: String, default: "", trim: true },
        UniKg: { type: Number, default: 0 },
        VentaTotal: { type: Number, default: 0 },
        VentasPorFecha: {
            type: Map,
            of: ventaDiariaSchema,
            default: {}
        }
    },
    { _id: false }
);

const reportSchema = new mongoose.Schema(
    {
        nombreArchivo: { type: String, required: true, trim: true },
        periodo: {
            inicio: { type: String, default: "" },
            fin: { type: String, default: "" },
            fechas: { type: [String], default: [] }
        },
        resumen: {
            productos: { type: Number, default: 0 },
            unidadesKg: { type: Number, default: 0 },
            ventaTotal: { type: Number, default: 0 }
        },
        productos: {
            type: [productoSchema],
            required: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

reportSchema.index(
    {
        nombreArchivo: 1,
        "periodo.inicio": 1,
        "periodo.fin": 1
    },
    { unique: true }
);
reportSchema.index({ "productos.PLU": 1 });
reportSchema.index({ "productos.DTO": 1 });

export const Report = mongoose.model("Report", reportSchema);
