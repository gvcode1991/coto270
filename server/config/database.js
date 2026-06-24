import mongoose from "mongoose";

export async function conectarBaseDeDatos(uri, nombreBaseDeDatos = "pulso-ventas") {
    if (!uri) {
        console.warn("MongoDB no configurado. La app funcionara sin persistencia.");
        return false;
    }

    await mongoose.connect(uri, {
        dbName: nombreBaseDeDatos,
        serverSelectionTimeoutMS: 8000
    });

    console.log("MongoDB conectado.");
    return true;
}

export function obtenerEstadoBaseDeDatos() {
    const estados = ["desconectado", "conectado", "conectando", "desconectando"];
    return estados[mongoose.connection.readyState] || "desconocido";
}

export function baseDeDatosDisponible() {
    return mongoose.connection.readyState === 1;
}
