import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProcedures, updateProcedure } from '../api/adminApi';
import { Edit2, Save, X, FileText, CheckCircle2, XCircle, Home, LayoutDashboard, Search, MessageSquare, FileUp } from 'lucide-react';

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
        <div className="h-screen w-full flex items-center justify-center p-2 sm:p-4 bg-animated-gradient font-sans text-graphite-950">
            <div className="animate-card-in bg-white w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[95vh]">
                
                {/* Header idéntico al chatbot pero con menú admin */}
                <div className="glass-header text-white p-5 flex items-center justify-between gap-4 shadow-md z-10 relative">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-accent-500 animate-pulse-logo hover-scale-logo">
                            <img src="/assets/branding/logo-gamc-cocha.png" alt="GAMC Logo" className="w-10 h-10 object-contain" />
                        </div>
                        <div className="flex-1 hidden sm:block">
                            <h1 className="font-bold text-xl flex items-center gap-2">
                                Panel de Administración
                                <span className="relative flex h-3 w-3">
                                  <span className="pulse-status absolute inline-flex h-full w-full rounded-full bg-[var(--color-state-amber)] opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-state-amber)]"></span>
                                </span>
                            </h1>
                            <p className="text-accent-200 text-sm opacity-90">Gestión de Trámites e Ingesta</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
                        <Link to="/admin/ingesta" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs sm:text-sm font-medium border border-white/20 whitespace-nowrap">
                            <FileUp className="w-4 h-4" /> <span className="hidden sm:inline">Alimentar BD</span>
                        </Link>
                        <Link to="/admin/feedback" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs sm:text-sm font-medium border border-white/20 whitespace-nowrap">
                            <MessageSquare className="w-4 h-4" /> <span className="hidden sm:inline">Ver Feedback</span>
                        </Link>
                        <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs sm:text-sm font-medium shadow-sm border border-white/30 whitespace-nowrap">
                            <Home className="w-4 h-4" /> <span className="hidden sm:inline">Volver al Chatbot</span>
                        </Link>
                    </div>
                </div>

                {/* Main Content scrollable area con marca de agua */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-accent-50 relative" style={{ backgroundImage: "url('/assets/watermark/cocha-skyline-marca-agua.png')", backgroundRepeat: 'no-repeat', backgroundPosition: 'bottom center', backgroundSize: 'contain', backgroundAttachment: 'local' }}>
                    
                    <div className="max-w-7xl w-full mx-auto bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-sm border border-white/50 mb-10">
                
                {!selectedCode ? (
                    <>
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
                    </>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up-stagger">
                        <div className="bg-gray-50 border-b border-gray-200 px-6 py-5 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-graphite-950 flex items-center gap-2">
                                    <Edit2 className="w-5 h-5 text-brand-600" />
                                    Editar Trámite
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Código: <span className="font-mono bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">{selectedCode}</span>
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedCode(null)} 
                                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200"
                                title="Cerrar"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 sm:p-8">
                            <div className="space-y-8 max-w-4xl">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Nombre Oficial del Trámite</label>
                                    <input 
                                        required 
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 text-gray-900 border p-3 transition-colors outline-none" 
                                        value={formData.name || ''} 
                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                        placeholder="Ej. Visado de Planos"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Descripción para el ciudadano</label>
                                    <textarea 
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 text-gray-900 border p-3 transition-colors outline-none" 
                                        rows="4" 
                                        value={formData.description || ''} 
                                        onChange={e => setFormData({...formData, description: e.target.value})} 
                                        placeholder="Explica brevemente de qué trata este trámite..."
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Monto (Costo base)</label>
                                        <div className="relative rounded-lg shadow-sm">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-gray-500 sm:text-sm font-bold">$</span>
                                            </div>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 pl-8 border p-3 transition-colors outline-none" 
                                                value={formData.amount || ''} 
                                                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || null})} 
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Moneda</label>
                                        <input 
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 border p-3 transition-colors text-gray-600 font-medium outline-none" 
                                            value={formData.currency || 'Bs.'} 
                                            onChange={e => setFormData({...formData, currency: e.target.value})} 
                                        />
                                    </div>
                                </div>
                                
                                <div className="pt-4 mt-4">
                                    <label className="flex items-center gap-4 cursor-pointer group p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200">
                                        <div className="relative flex items-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-6 h-6 text-brand-600 rounded border-gray-300 focus:ring-brand-500 cursor-pointer" 
                                                checked={formData.is_active === 1} 
                                                onChange={e => setFormData({...formData, is_active: e.target.checked ? 1 : 0})} 
                                            />
                                        </div>
                                        <div>
                                            <span className="block text-base font-bold text-gray-900">Mantener este Trámite Activo</span>
                                            <span className="block text-sm text-gray-500 mt-0.5">Si lo desactivas, el chatbot dejará de recomendarlo y no aparecerá en las búsquedas.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            
                            <div className="mt-10 flex justify-end gap-4 pt-6 border-t border-gray-200">
                                <button 
                                    type="button" 
                                    onClick={() => setSelectedCode(null)} 
                                    className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all shadow-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-800 border border-transparent rounded-lg text-sm font-bold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all"
                                >
                                    <Save className="w-5 h-5" />
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                    </div>
                </div>
            </div>
        </div>
    );
}
