import { User } from "../models/User.js";

export async function migrarSeguridadUsuarios() {
    const coleccion = User.collection;
    const total = await coleccion.countDocuments();
    if (!total) return;

    await coleccion.updateMany(
        { estado: { $exists: false } },
        {
            $set: {
                estado: "aprobado",
                activo: true,
                aprobadoEn: new Date()
            }
        }
    );
    await coleccion.updateMany(
        { apellido: { $exists: false } },
        { $set: { apellido: "Sin especificar" } }
    );
    await coleccion.updateMany(
        { rol: { $exists: false }, role: "admin" },
        { $set: { rol: "admin" } }
    );
    await coleccion.updateMany(
        { rol: { $exists: false } },
        { $set: { rol: "operador" } }
    );

    const administrador = await coleccion.findOne({ rol: "admin" });
    if (!administrador) {
        const primero = await coleccion.findOne({}, { sort: { createdAt: 1, _id: 1 } });
        await coleccion.updateOne(
            { _id: primero._id },
            {
                $set: {
                    rol: "admin",
                    estado: "aprobado",
                    activo: true,
                    aprobadoEn: primero.aprobadoEn || new Date()
                }
            }
        );
    }
}
