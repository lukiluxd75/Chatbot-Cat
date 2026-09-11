import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function ChatMessage({ message }) {
    const isBot = message.role === 'assistant';
    
    // Parse audit response if JSON
    let content = message.content;
    let auditData = null;
    try {
        if (isBot && content.startsWith('{')) {
            auditData = JSON.parse(content);
        }
    } catch (e) {}

    if (isBot) {
        return (
            <div className="flex items-start gap-3 max-w-[85%] animate-slide-up-stagger">
                <div className="w-8 h-8 rounded-full bg-white flex-shrink-0 flex items-center justify-center mt-1 border border-accent-200 overflow-hidden shadow-sm">
                    <img src="/assets/branding/logo-gamc-cocha.png" alt="IA" className="w-full h-full object-contain p-1" />
                </div>
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
                                    a: ({node, ...props}) => <a className="text-accent-600 underline" {...props} />
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3 max-w-[85%] self-end animate-slide-in-right flex-row-reverse">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex-shrink-0 flex items-center justify-center mt-1 shadow-sm text-white font-bold text-xs">
                TU
            </div>
            <div className="bg-brand-600 text-white p-4 rounded-2xl rounded-tr-none shadow-sm">
                <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
            </div>
        </div>
    );
}
