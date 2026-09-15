import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function ChatMessage({ message, onFeedback }) {
    const isBot = message.role === 'assistant';
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [comment, setComment] = useState('');
    const [pendingFeedback, setPendingFeedback] = useState(null);
    
    // Parse audit response if JSON
    let content = message.content;
    let auditData = null;
    try {
        if (isBot && content.startsWith('{')) {
            auditData = JSON.parse(content);
        }
    } catch (e) {}

    const handleThumbClick = (type) => {
        if (message.feedback) return;
        setPendingFeedback(type);
        setShowCommentBox(true);
    };

    const handleSubmitFeedback = () => {
        onFeedback?.(pendingFeedback, comment.trim() || null);
        setShowCommentBox(false);
        setComment('');
        setPendingFeedback(null);
    };

    const handleSkipComment = () => {
        onFeedback?.(pendingFeedback, null);
        setShowCommentBox(false);
        setComment('');
        setPendingFeedback(null);
    };

    if (isBot) {
        return (
            <div className="flex items-start gap-3 max-w-[85%] animate-slide-up-stagger">
                <div className="w-8 h-8 rounded-full bg-white flex-shrink-0 flex items-center justify-center mt-1 border border-accent-200 overflow-hidden shadow-sm">
                    <img src="/assets/branding/logo-gamc-cocha.png" alt="IA" className="w-full h-full object-contain p-1" />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm text-graphite-950 border border-accent-200">
                        {auditData ? (
                            <div className="border rounded p-4 bg-gray-50 mt-2">
                                <div className="font-bold text-lg mb-2">
                                    Estado: <span className={auditData.estado === 'Aprobado' ? 'text-green-600' : 'text-red-600'}>{auditData.estado}</span>
                                </div>
                                {auditData.documentos_presentes?.length > 0 && (
                                    <div className="mb-2">
                                        <span className="font-bold">Presentes:</span>
                                        <ul className="list-disc pl-5 text-sm mt-1">
                                            {auditData.documentos_presentes.map(d => <li key={d}>{d}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {auditData.documentos_faltantes?.length > 0 && (
                                    <div className="mb-2">
                                        <span className="font-bold text-red-600">Faltantes:</span>
                                        <ul className="list-disc pl-5 text-sm mt-1">
                                            {auditData.documentos_faltantes.map(d => <li key={d}>{d}</li>)}
                                        </ul>
                                    </div>
                                )}
                                <p className="mt-2 text-sm italic">{auditData.observaciones}</p>
                            </div>
                        ) : (
                            <div className="leading-relaxed">
                                <ReactMarkdown
                                    components={{
                                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2" {...props} />,
                                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                        h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2 text-brand-800" {...props} />,
                                        h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 text-brand-800" {...props} />,
                                        h3: ({node, ...props}) => <h3 className="text-md font-bold mb-2 text-brand-800" {...props} />,
                                        strong: ({node, ...props}) => <strong className="font-bold text-brand-800" {...props} />,
                                        a: ({node, ...props}) => <a className="text-accent-600 underline" {...props} />,
                                        img: ({node, ...props}) => {
                                            let filename = "formulario.png";
                                            if (props.src) {
                                                const parts = props.src.split('/');
                                                filename = decodeURIComponent(parts[parts.length - 1]);
                                            }
                                            return (
                                                <div className="my-4 flex flex-col items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                    <img className="max-w-xs md:max-w-sm rounded-lg shadow-sm border border-gray-300" {...props} />
                                                    <a 
                                                        href={props.src} 
                                                        download={filename}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-800 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>
                                                        Descargar {props.alt || 'Formulario'}
                                                    </a>
                                                </div>
                                            );
                                        }
                                    }}
                                >
                                    {content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>

                    {/* Botones de retroalimentación */}
                    {message.messageId && (
                        <div className="ml-1">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => handleThumbClick('positive')}
                                    disabled={!!message.feedback}
                                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                        message.feedback === 'positive'
                                            ? 'bg-green-100 text-green-600'
                                            : message.feedback
                                                ? 'text-gray-300 cursor-default'
                                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                    }`}
                                    title="Respuesta útil"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                        <path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleThumbClick('negative')}
                                    disabled={!!message.feedback}
                                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                        message.feedback === 'negative'
                                            ? 'bg-red-100 text-red-600'
                                            : message.feedback
                                                ? 'text-gray-300 cursor-default'
                                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                    }`}
                                    title="Respuesta no útil"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                        <path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L14 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                                    </svg>
                                </button>
                                {message.feedback && (
                                    <span className="text-xs text-gray-400 ml-1">
                                        {message.feedback === 'positive' ? '¡Gracias!' : 'Gracias por tu opinión'}
                                        {message.feedbackComment && ' — comentario guardado'}
                                    </span>
                                )}
                            </div>

                            {/* Caja de comentario expandible */}
                            {showCommentBox && !message.feedback && (
                                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-3 animate-slide-up-stagger">
                                    <p className="text-xs text-gray-500 mb-2">
                                        {pendingFeedback === 'positive' 
                                            ? '¿Qué te pareció útil de esta respuesta?' 
                                            : '¿Qué podríamos mejorar?'}
                                    </p>
                                    <textarea
                                        className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:outline-none focus:border-brand-500 resize-none text-graphite-950 placeholder-gray-400"
                                        rows="2"
                                        placeholder="Escribe tu comentario (opcional)..."
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button
                                            onClick={handleSkipComment}
                                            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                        >
                                            Omitir
                                        </button>
                                        <button
                                            onClick={handleSubmitFeedback}
                                            className="text-xs text-white bg-brand-600 hover:bg-brand-800 px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer"
                                        >
                                            Enviar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Mensaje del usuario - puede tener imagen adjunta
    const hasImage = message.imagePreview;

    return (
        <div className="flex items-start gap-3 max-w-[85%] self-end animate-slide-in-right flex-row-reverse">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex-shrink-0 flex items-center justify-center mt-1 shadow-sm text-white font-bold text-xs">
                TU
            </div>
            <div className="bg-brand-600 text-white p-4 rounded-2xl rounded-tr-none shadow-sm">
                {hasImage && (
                    <div className="mb-3">
                        <img 
                            src={message.imagePreview} 
                            alt="Imagen adjunta" 
                            className="max-w-[200px] rounded-lg border border-white/30 shadow-sm"
                        />
                    </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
            </div>
        </div>
    );
}
