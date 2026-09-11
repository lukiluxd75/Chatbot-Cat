import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProcedures, updateProcedure } from '../api/adminApi';
import { Edit2, Save, X, FileText, CheckCircle2, XCircle, Home, LayoutDashboard, Search } from 'lucide-react';

export default function AdminPage() {
    const [procedures, setProcedures] = useState([]);
    const [selectedCode, setSelectedCode] = useState(null);
    const [formData, setFormData] = useState(null);
    const [alert, setAlert] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const loadData = async () => {
        try {
            const data = await fetchProcedures();
            setProcedures(data);
        } catch (error) {
            setAlert({ type: 'error', message: 'No se pudieron cargar los datos de los trámites.' });
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
            setAlert({ type: 'success', message: '¡El trámite se actualizó correctamente!' });
            setSelectedCode(null);
            loadData();
            setTimeout(() => setAlert(null), 4000);
        } catch (error) {
            setAlert({ type: 'error', message: 'Ocurrió un error al intentar guardar los cambios.' });
        }
    };

    const filteredProcedures = procedures.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Navbar */}
            <header className="bg-brand-800 text-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <LayoutDashboard className="w-6 h-6 text-accent-300" />
                            <h1 className="text-xl font-bold tracking-wide">Panel de Administración</h1>
                        </div>
                        <Link to="/" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-900 transition-colors text-sm font-medium">
                            <Home className="w-4 h-4" />
                            Volver al Chatbot
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-graphite-950">Catálogo de Trámites</h2>
                        <p className="text-gray-500 text-sm mt-1">Gestiona la información, costos y estado de los trámites catastrales.</p>
                    </div>
                    
                    <div className="relative w-full sm:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar trámite..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-accent-500 focus:border-accent-500 bg-white shadow-sm sm:text-sm transition-shadow outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {alert && (
                    <div className={`flex items-center gap-3 p-4 mb-6 rounded-lg shadow-sm border-l-4 animate-slide-down ${alert.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
                        {alert.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                        <p className="font-medium">{alert.message}</p>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Código</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trámite</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Costo</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredProcedures.map(p => (
                                    <tr key={p.code} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-gray-400 group-hover:text-brand-600 transition-colors" />
                                                <span className="text-sm font-mono text-gray-600">{p.code}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                                            <div className="text-xs text-gray-500 mt-1 line-clamp-1" title={p.description}>{p.description}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
                                                {p.amount ? `${p.currency} ${p.amount}` : 'Gratuito/Variable'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${p.is_active === 1 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${p.is_active === 1 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                {p.is_active === 1 ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button 
                                                onClick={() => handleEdit(p)} 
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-accent-50 hover:text-brand-800 hover:border-brand-600 transition-all shadow-sm"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProcedures.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            No se encontraron trámites que coincidan con la búsqueda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Edit Modal */}
            {selectedCode && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Backdrop */}
                        <div className="fixed inset-0 bg-gray-900 bg-opacity-40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedCode(null)}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        {/* Modal Panel */}
                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full border border-gray-100">
                            <div className="bg-brand-800 px-6 py-4 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Edit2 className="w-5 h-5 text-accent-300" />
                                    Editar Trámite: <span className="font-mono bg-brand-900 px-2 py-0.5 rounded text-sm border border-brand-600">{selectedCode}</span>
                                </h3>
                                <button onClick={() => setSelectedCode(null)} className="text-gray-300 hover:text-white transition-colors p-1 rounded-full hover:bg-brand-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSave} className="px-6 py-6 sm:p-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Oficial del Trámite</label>
                                        <input 
                                            required 
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-accent-500 focus:ring-accent-500 text-gray-900 border p-2.5 transition-colors outline-none" 
                                            value={formData.name || ''} 
                                            onChange={e => setFormData({...formData, name: e.target.value})} 
                                            placeholder="Ej. Visado de Planos"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción para el ciudadano</label>
                                        <textarea 
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-accent-500 focus:ring-accent-500 text-gray-900 border p-2.5 transition-colors outline-none" 
                                            rows="4" 
                                            value={formData.description || ''} 
                                            onChange={e => setFormData({...formData, description: e.target.value})} 
                                            placeholder="Explica brevemente de qué trata este trámite..."
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Monto (Costo)</label>
                                            <div className="relative rounded-lg shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-gray-500 sm:text-sm font-bold">$</span>
                                                </div>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-accent-500 focus:ring-accent-500 pl-8 border p-2.5 transition-colors outline-none" 
                                                    value={formData.amount || ''} 
                                                    onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || null})} 
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Moneda</label>
                                            <input 
                                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-accent-500 focus:ring-accent-500 border p-2.5 transition-colors text-gray-600 font-medium outline-none" 
                                                value={formData.currency || 'Bs.'} 
                                                onChange={e => setFormData({...formData, currency: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="pt-4 border-t border-gray-100 mt-4">
                                        <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                                            <div className="relative flex items-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-5 h-5 text-accent-600 rounded border-gray-300 focus:ring-accent-500 cursor-pointer" 
                                                    checked={formData.is_active === 1} 
                                                    onChange={e => setFormData({...formData, is_active: e.target.checked ? 1 : 0})} 
                                                />
                                            </div>
                                            <div>
                                                <span className="block text-sm font-bold text-gray-900 group-hover:text-brand-800 transition-colors">Trámite Activo</span>
                                                <span className="block text-xs text-gray-500">Si está inactivo, el chatbot dejará de recomendarlo a los ciudadanos.</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-gray-100">
                                    <button 
                                        type="button" 
                                        onClick={() => setSelectedCode(null)} 
                                        className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-800 border border-transparent rounded-lg text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
                                    >
                                        <Save className="w-4 h-4" />
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
