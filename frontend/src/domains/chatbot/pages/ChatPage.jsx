import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sendChatMessage, sendFeedback, sendVisionImage } from '../api/chatApi';
import ChatMessage from '../components/ChatMessage';

export default function ChatPage() {
    const [messages, setMessages] = useState([{ role: 'assistant', content: '👋 ¡Hola! Soy el asistente catastral del GAMC. Estoy aquí para ayudarte con información sobre trámites. ¿En qué te puedo ayudar hoy?\n\n📎 Puedes adjuntar fotos de tus documentos usando el botón de cámara para que los analice.' }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId] = useState(() => 'sess_' + Math.random().toString(36).substr(2, 9));
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleFeedback = async (index, messageId, feedback, comment = null) => {
        if (!messageId) return;
        try {
            await sendFeedback(messageId, feedback, comment);
            setMessages(prev => prev.map((m, i) =>
                i === index ? { ...m, feedback, feedbackComment: comment } : m
            ));
        } catch (error) {
            console.error('Error al enviar retroalimentación:', error);
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen.');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert('La imagen es demasiado grande (máx. 20 MB).');
            return;
        }

        setSelectedImage(file);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const clearImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        // Si hay imagen, enviar al endpoint de visión
        if (selectedImage) {
            const userText = input.trim() || 'Analiza este documento';
            const preview = imagePreview;
            
            setMessages(prev => [...prev, { 
                role: 'user', 
                content: userText,
                imagePreview: preview
            }]);
            setInput('');
            clearImage();
            setIsLoading(true);

            try {
                const res = await sendVisionImage(selectedImage, userText, sessionId);
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: res.response,
                    messageId: res.message_id 
                }]);
            } catch (error) {
                const errorMsg = error.response?.status === 504
                    ? 'El análisis de la imagen está tardando más de lo esperado. Intenta con una imagen más pequeña.'
                    : 'Lo siento, ha ocurrido un error al analizar la imagen.';
                setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Flujo normal de texto
        if (!input.trim()) return;

        const newMessages = [...messages, { role: 'user', content: input.trim() }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const apiMessages = newMessages.filter((_, i) => i > 0)
                .filter(m => !m.imagePreview)  // No enviar previews de imagen al chat normal
                .map(m => ({ role: m.role, content: m.content }));
            const res = await sendChatMessage(apiMessages, sessionId);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: res.response, 
                messageId: res.message_id 
            }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, ha ocurrido un error de conexión.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center p-4 bg-animated-gradient font-sans text-graphite-950">
            <div className="animate-card-in bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
                
                {/* Header */}
                <div className="glass-header text-white p-5 flex items-center justify-between gap-4 shadow-md z-10 relative">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-accent-500 animate-pulse-logo hover-scale-logo">
                            <img src="/assets/branding/logo-gamc-cocha.png" alt="GAMC Logo" className="w-10 h-10 object-contain" />
                        </div>
                        <div className="flex-1">
                            <h1 className="font-bold text-xl flex items-center gap-2">
                                Asistente Catastral
                                <span className="relative flex h-3 w-3">
                                  <span className="pulse-status absolute inline-flex h-full w-full rounded-full bg-[var(--color-state-success)] opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-state-success)]"></span>
                                </span>
                            </h1>
                            <p className="text-accent-200 text-sm opacity-90">Consultas de Trámites Catastrales</p>
                        </div>
                    </div>
                    <Link to="/admin" className="text-xs text-accent-200 hover:text-white underline">Admin</Link>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-hidden flex flex-col bg-accent-50" style={{ backgroundImage: "url('/assets/watermark/cocha-skyline-marca-agua.png')", backgroundRepeat: 'no-repeat', backgroundPosition: 'bottom center', backgroundSize: 'contain' }}>
                    
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 chat-scroll pb-2">
                        {messages.map((m, i) => (
                            <ChatMessage 
                                key={i} 
                                message={m} 
                                onFeedback={(feedback, comment) => handleFeedback(i, m.messageId, feedback, comment)}
                            />
                        ))}

                        {/* Quick Suggestions (only show at start) */}
                        {messages.length === 1 && (
                            <div className="flex flex-wrap gap-2 ml-11 mb-2 animate-slide-up-stagger" style={{ animationDelay: '150ms' }}>
                                <button onClick={() => setInput("¿Qué puedes hacer?")} className="suggestion-chip bg-white border border-accent-300 text-brand-600 text-sm px-3 py-1.5 rounded-full hover:bg-accent-50 font-medium cursor-pointer">¿Qué puedes hacer?</button>
                                <button onClick={() => setInput("¿Qué áreas abarcas?")} className="suggestion-chip bg-white border border-accent-300 text-brand-600 text-sm px-3 py-1.5 rounded-full hover:bg-accent-50 font-medium cursor-pointer">¿Qué áreas abarcas?</button>
                                <button onClick={() => setInput("Contacto")} className="suggestion-chip bg-white border border-accent-300 text-brand-600 text-sm px-3 py-1.5 rounded-full hover:bg-accent-50 font-medium cursor-pointer">Contacto</button>
                            </div>
                        )}
                        
                        {isLoading && (
                            <div className="flex items-start gap-3 max-w-[85%] animate-slide-up-stagger">
                                <div className="w-8 h-8 rounded-full bg-white flex-shrink-0 flex items-center justify-center mt-1 border border-accent-200 overflow-hidden shadow-sm">
                                    <img src="/assets/branding/logo-gamc-cocha.png" alt="IA" className="w-full h-full object-contain p-1" />
                                </div>
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm text-graphite-950 border border-accent-200 flex items-center gap-3">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-brand-600 rounded-full wave-dot" style={{animationDelay: '0ms'}}></div>
                                        <div className="w-2 h-2 bg-brand-600 rounded-full wave-dot" style={{animationDelay: '150ms'}}></div>
                                        <div className="w-2 h-2 bg-brand-600 rounded-full wave-dot" style={{animationDelay: '300ms'}}></div>
                                    </div>
                                    {selectedImage === null && imagePreview === null && (
                                        <span className="text-xs text-gray-400">
                                            {messages[messages.length - 1]?.imagePreview ? 'Analizando imagen...' : 'Pensando...'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Preview de imagen seleccionada */}
                {imagePreview && (
                    <div className="px-4 pt-3 pb-1 bg-white border-t border-accent-200 flex items-center gap-3">
                        <div className="relative">
                            <img 
                                src={imagePreview} 
                                alt="Preview" 
                                className="w-16 h-16 object-cover rounded-lg border border-gray-300 shadow-sm"
                            />
                            <button
                                onClick={clearImage}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-sm cursor-pointer"
                                title="Quitar imagen"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="text-sm text-gray-500">
                            <p className="font-medium text-gray-700">{selectedImage?.name}</p>
                            <p className="text-xs">{(selectedImage?.size / 1024).toFixed(0)} KB — Se analizará con IA de visión</p>
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-accent-200 relative z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <form onSubmit={handleSubmit} className="flex gap-2 relative items-center">
                        {/* Botón de adjuntar imagen */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleImageSelect}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-brand-600 hover:bg-accent-50 transition-all disabled:opacity-50 cursor-pointer"
                            title="Adjuntar imagen / Escanear documento"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                        </button>

                        <div className="relative flex-1">
                            <input 
                                type="text" 
                                className="w-full bg-accent-50 border border-haze-300 rounded-full pl-5 pr-12 py-3 focus:outline-none input-focus-glow transition-all text-graphite-950 placeholder-haze-400"
                                placeholder={selectedImage ? "Describe qué quieres analizar (opcional)..." : "Escribe tu consulta aquí..."}
                                autoComplete="off"
                                required={!selectedImage}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="send-btn-glow bg-brand-600 hover:bg-brand-800 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex-shrink-0 cursor-pointer"
                            disabled={isLoading || (!input.trim() && !selectedImage)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1">
                                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                            </svg>
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}
