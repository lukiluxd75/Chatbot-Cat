import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFeedback } from '../api/adminApi';
import { Home, MessageSquare, ThumbsUp, ThumbsDown, Clock, Search, ListTodo } from 'lucide-react';

export default function FeedbackPage() {
    const [feedbacks, setFeedbacks] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await fetchFeedback();
                setFeedbacks(data);
            } catch (error) {
                console.error("Error cargando feedback", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const filteredFeedbacks = feedbacks.filter(f => 
        (f.feedback_comment && f.feedback_comment.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.detected_procedure && f.detected_procedure.toLowerCase().includes(searchTerm.toLowerCase()))
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
                            <p className="text-accent-200 text-sm opacity-90">Retroalimentación Ciudadana</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
                        <Link to="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs sm:text-sm font-medium border border-white/20 whitespace-nowrap">
                            <ListTodo className="w-4 h-4" /> <span className="hidden sm:inline">Panel Trámites</span>
                        </Link>
                        <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs sm:text-sm font-medium shadow-sm border border-white/30 whitespace-nowrap">
                            <Home className="w-4 h-4" /> <span className="hidden sm:inline">Volver al Chatbot</span>
                        </Link>
                    </div>
                </div>

                {/* Main Content scrollable area con marca de agua */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-accent-50 relative" style={{ backgroundImage: "url('/assets/watermark/cocha-skyline-marca-agua.png')", backgroundRepeat: 'no-repeat', backgroundPosition: 'bottom center', backgroundSize: 'contain', backgroundAttachment: 'local' }}>
                    
                    <div className="max-w-7xl w-full mx-auto bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-sm border border-white/50 mb-10">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-graphite-950">Comentarios del Chatbot</h2>
                        <p className="text-gray-500 text-sm mt-1">Revisa lo que opinan los ciudadanos sobre las respuestas del asistente.</p>
                    </div>
                    
                    <div className="relative w-full sm:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por comentario o trámite..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-accent-500 focus:border-accent-500 bg-white shadow-sm sm:text-sm transition-shadow outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-500">Cargando comentarios...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Voto</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Comentario del Usuario</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contexto (Respuesta AI)</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {filteredFeedbacks.map((f, i) => (
                                        <tr key={f.id || i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {f.feedback === 'positive' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
                                                        <ThumbsUp className="w-4 h-4" /> Útil
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-red-50 text-red-700 border border-red-200">
                                                        <ThumbsDown className="w-4 h-4" /> No útil
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 font-medium">
                                                    {f.feedback_comment || <span className="text-gray-400 italic">Sin comentario adicional</span>}
                                                </div>
                                                {f.detected_procedure && (
                                                    <div className="text-xs text-brand-600 mt-1 font-mono bg-brand-50 inline-block px-2 py-0.5 rounded">
                                                        {f.detected_procedure}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-500 line-clamp-3 w-64 md:w-96" title={f.content}>
                                                    {f.content}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    {new Date(f.created_at).toLocaleString('es-BO', {
                                                        year: 'numeric', month: 'short', day: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredFeedbacks.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                No hay registros de retroalimentación que mostrar.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
