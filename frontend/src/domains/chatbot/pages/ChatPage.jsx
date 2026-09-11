import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sendChatMessage } from '../api/chatApi';
import ChatMessage from '../components/ChatMessage';

export default function ChatPage() {
    const [messages, setMessages] = useState([{ role: 'assistant', content: '👋 ¡Hola! Soy el asistente catastral del GAMC. Estoy aquí para ayudarte con información sobre trámites. ¿En qué te puedo ayudar hoy?' }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId] = useState(() => 'sess_' + Math.random().toString(36).substr(2, 9));
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const newMessages = [...messages, { role: 'user', content: input.trim() }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const apiMessages = newMessages.filter((_, i) => i > 0);
            const res = await sendChatMessage(apiMessages, sessionId);
            setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
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
                            <ChatMessage key={i} message={m} />
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
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm text-graphite-950 border border-accent-200 flex items-center">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-brand-600 rounded-full wave-dot" style={{animationDelay: '0ms'}}></div>
                                        <div className="w-2 h-2 bg-brand-600 rounded-full wave-dot" style={{animationDelay: '150ms'}}></div>
                                        <div className="w-2 h-2 bg-brand-600 rounded-full wave-dot" style={{animationDelay: '300ms'}}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-accent-200 relative z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <form onSubmit={handleSubmit} className="flex gap-2 relative">
                        <div className="relative flex-1">
                            <input 
                                type="text" 
                                className="w-full bg-accent-50 border border-haze-300 rounded-full pl-5 pr-12 py-3 focus:outline-none input-focus-glow transition-all text-graphite-950 placeholder-haze-400"
                                placeholder="Escribe tu consulta aquí..."
                                autoComplete="off"
                                required
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="send-btn-glow bg-brand-600 hover:bg-brand-800 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex-shrink-0 cursor-pointer"
                            disabled={isLoading || !input.trim()}
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
