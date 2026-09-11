import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProcedures, updateProcedure } from '../api/adminApi';

export default function AdminPage() {
    const [procedures, setProcedures] = useState([]);
    const [selectedCode, setSelectedCode] = useState(null);
    const [formData, setFormData] = useState(null);
    const [alert, setAlert] = useState(null);

    const loadData = async () => {
        try {
            const data = await fetchProcedures();
            setProcedures(data);
        } catch (error) {
            setAlert({ type: 'error', message: 'Error cargando datos.' });
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleEdit = (p) => {
        setSelectedCode(p.code);
        setFormData({ ...p });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await updateProcedure(selectedCode, formData);
            setAlert({ type: 'success', message: 'Trámite actualizado correctamente.' });
            setSelectedCode(null);
            loadData();
        } catch (error) {
            setAlert({ type: 'error', message: 'Error al actualizar.' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-brand-500 text-white px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Gestión de Trámites Catastrales</h1>
                    <Link to="/" className="text-sm underline hover:text-accent-500">Ir al Chatbot</Link>
                </div>
                
                <div className="p-6">
                    {alert && (
                        <div className={`p-4 mb-4 text-sm rounded-lg ${alert.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                            {alert.message}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clave</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {procedures.map(p => (
                                    <tr key={p.code}>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-500">{p.code}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{p.amount ? `${p.currency} ${p.amount}` : '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.is_active === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {p.is_active === 1 ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium">
                                            <button onClick={() => handleEdit(p)} className="text-brand-500 hover:text-brand-600 font-bold">Editar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedCode && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
                        <h3 className="text-lg font-bold mb-4">Editar: {selectedCode}</h3>
                        <form onSubmit={handleSave}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Nombre</label>
                                <input required className="w-full border p-2 rounded" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Descripción</label>
                                <textarea className="w-full border p-2 rounded" rows="4" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Monto</label>
                                    <input type="number" step="0.01" className="w-full border p-2 rounded" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || null})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Moneda</label>
                                    <input className="w-full border p-2 rounded" value={formData.currency || ''} onChange={e => setFormData({...formData, currency: e.target.value})} />
                                </div>
                            </div>
                            <div className="mb-6">
                                <label className="flex items-center">
                                    <input type="checkbox" className="mr-2" checked={formData.is_active === 1} onChange={e => setFormData({...formData, is_active: e.target.checked ? 1 : 0})} />
                                    Activo
                                </label>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setSelectedCode(null)} className="px-4 py-2 border rounded">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-brand-500 text-white rounded">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
