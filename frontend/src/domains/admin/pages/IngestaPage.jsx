import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ingestarTramite } from '../api/adminApi';
import { FileUp, Save, LayoutDashboard, MessageSquare, CheckCircle2, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function IngestaPage() {
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Por favor selecciona un archivo de imagen.');
            return;
        }

        setError(null);
        setResult(null);
        setSelectedImage(file);
        
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleIngest = async () => {
        if (!selectedImage) return;
        
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await ingestarTramite(selectedImage);
            setResult(data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Ocurrió un error al procesar la imagen.');
        } finally {
            setIsLoading(false);
        }
    };

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
                            <p className="text-accent-200 text-sm opacity-90">Ingesta Automatizada con IA</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
                        <Link to="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs sm:text-sm font-medium border border-white/20 whitespace-nowrap">
                            <LayoutDashboard className="w-4 h-4" /> <span className="hidden sm:inline">Panel Trámites</span>
                        </Link>
                        <Link to="/admin/feedback" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs sm:text-sm font-medium border border-white/20 whitespace-nowrap">
                            <MessageSquare className="w-4 h-4" /> <span className="hidden sm:inline">Ver Feedback</span>
                        </Link>
                    </div>
                </div>

                {/* Main Content scrollable area con marca de agua */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-accent-50 relative" style={{ backgroundImage: "url('/assets/watermark/cocha-skyline-marca-agua.png')", backgroundRepeat: 'no-repeat', backgroundPosition: 'bottom center', backgroundSize: 'contain', backgroundAttachment: 'local' }}>
                    
                    <div className="max-w-4xl w-full mx-auto bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-sm border border-white/50 mb-10">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-graphite-950">Escanear Nuevo Trámite</h2>
                    <p className="text-gray-500 text-sm mt-1">Sube una foto o escaneo de una normativa legal. El sistema utilizará la IA de visión para leerla y la estructurará automáticamente en la base de datos.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Panel de Subida */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center">
                        <div className="w-full flex justify-center mb-6">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg border border-gray-300 shadow-sm" />
                            ) : (
                                <div className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                                    <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                                    <p>Ninguna imagen seleccionada</p>
                                </div>
                            )}
                        </div>

                        <input 
                            type="file" 
                            accept="image/*"
                            id="file-upload" 
                            className="hidden" 
                            onChange={handleImageSelect}
                        />
                        <div className="flex gap-4 w-full">
                            <label 
                                htmlFor="file-upload" 
                                className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-white border-2 border-brand-600 text-brand-600 rounded-lg cursor-pointer hover:bg-brand-50 transition-colors font-semibold"
                            >
                                <ImageIcon className="w-5 h-5" />
                                Seleccionar Foto
                            </label>

                            <button
                                onClick={handleIngest}
                                disabled={!selectedImage || isLoading}
                                className="flex-1 flex justify-center items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-700 transition-colors font-semibold"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Ingestar Trámite
                                    </>
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 w-full text-center">
                                {error}
                            </div>
                        )}

                        {isLoading && (
                            <div className="mt-6 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
                                <div className="flex gap-1 mb-1">
                                    <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                    <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                    <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                </div>
                                <span>Leyendo documento con Qwen VL... estructurando con Gemma...</span>
                                <span className="text-xs text-gray-400">Esto puede demorar hasta 3 minutos dependiendo del hardware.</span>
                            </div>
                        )}
                    </div>

                    {/* Panel de Resultados */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Resultado de la Extracción</h3>
                        
                        {!result ? (
                            <div className="h-full min-h-[200px] flex items-center justify-center text-gray-400 italic text-sm">
                                Los datos del trámite escaneado aparecerán aquí...
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-bold text-green-800">¡Ingesta Completada!</h4>
                                        <p className="text-xs text-green-700">{result.message}</p>
                                        <div className="flex gap-2 mt-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${result.db_insertado ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                                SQL: {result.db_insertado ? 'OK' : 'Falló'}
                                            </span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${result.vector_indexado ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                                Vector: {result.vector_indexado ? 'OK' : 'Falló'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase">Nombre del Trámite</h4>
                                    <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">{result.tramite.nombre_tramite}</p>
                                </div>
                                
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase">Descripción</h4>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">{result.tramite.descripcion}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase">Costo</h4>
                                        <p className="text-sm font-medium text-brand-600 bg-brand-50 p-2 rounded border border-brand-100">
                                            {result.tramite.monto_bolivianos > 0 ? `${result.tramite.monto_bolivianos} Bs.` : 'Gratuito'}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase">Código Sugerido</h4>
                                        <p className="text-sm font-mono text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">{result.tramite.codigo}</p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Requisitos Extraídos ({result.tramite.requisitos.length})</h4>
                                    <ul className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-100 space-y-1 list-disc pl-5">
                                        {result.tramite.requisitos.map((req, idx) => (
                                            <li key={idx}>{req}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
