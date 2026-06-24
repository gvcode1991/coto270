import {
    eliminarBalance,
    guardarBalance,
    listarBalances
} from "../services/balanceService.js";

export async function obtenerBalances(req, res, next) {
    try {
        res.json({ balances: await listarBalances() });
    } catch (error) {
        next(error);
    }
}

export async function crearOActualizarBalance(req, res, next) {
    try {
        const balance = await guardarBalance(req.body);
        res.status(200).json({
            mensaje: "Balance guardado correctamente.",
            balance
        });
    } catch (error) {
        next(error);
    }
}

export async function borrarBalance(req, res, next) {
    try {
        const balance = await eliminarBalance(req.params.id);
        if (!balance) {
            return res.status(404).json({ mensaje: "Balance no encontrado." });
        }

        return res.json({ mensaje: "Balance eliminado correctamente." });
    } catch (error) {
        return next(error);
    }
}
