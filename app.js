document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-container');
    const sendBtn = document.getElementById('send-btn');
    const charCounter = document.getElementById('char-counter');
    const charCount = document.getElementById('char-count');
    const suggestionChips = document.querySelectorAll('.suggestion-chip');

    // Estado del historial de mensajes
    let messagesHistory = [];
    
    // Generar o recuperar ID de sesión (UUID v4 básico)
    let sessionId = sessionStorage.getItem('chatSessionId');
    if (!sessionId) {
        sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem('chatSessionId', sessionId);
    }

    // Smooth scroll al inicializar
    document.documentElement.style.scrollBehavior = 'smooth';

    // Manejar cambios en el input
    userInput.addEventListener('input', () => {
        const val = userInput.value.trim();
        sendBtn.disabled = val.length === 0;
        
        // Character counter
        charCount.textContent = userInput.value.length;
        if (userInput.value.length > 0) {
            charCounter.style.opacity = '1';
        } else {
            charCounter.style.opacity = '0';
        }
    });

    // Manejar chips de sugerencia
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            userInput.value = chip.textContent;
            // Trigger input event to enable button and update counter
            userInput.dispatchEvent(new Event('input'));
            // Enviar automáticamente al hacer click en el chip
            chatForm.requestSubmit();
            // Ocultar chips de sugerencia con animación
            const chipsContainer = chip.closest('.flex.flex-wrap');
            if (chipsContainer) {
                chipsContainer.classList.add('message-fade-out');
                setTimeout(() => chipsContainer.remove(), 300);
            }
        });
    });

    // Función para agregar un mensaje al UI
    function appendMessage(role, content) {
        const messageDiv = document.createElement('div');
        const isUser = role === 'user';
        
        messageDiv.className = `flex items-start gap-3 max-w-[85%] ${isUser ? 'self-end flex-row-reverse animate-slide-in-right' : 'animate-slide-up-stagger'}`;
        
        const avatar = document.createElement('div');
        if (isUser) {
            avatar.className = 'w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-1 bg-brand-900 shadow-sm';
            avatar.textContent = 'TÚ';
        } else {
            avatar.className = 'w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 bg-white border border-accent-200 overflow-hidden shadow-sm';
            avatar.innerHTML = '<img src="assets/branding/logo-gamc-cocha.png" alt="IA" class="w-full h-full object-contain p-1">';
        }

        const bubble = document.createElement('div');
        if (isUser) {
            bubble.className = 'bg-brand-900 text-white p-4 rounded-2xl rounded-tr-none shadow-sm';
            // Para el usuario, no aplicamos estilos complejos de markdown (usamos texto plano con saltos)
            bubble.innerHTML = content.replace(/\n/g, '<br>');
        } else {
            bubble.className = 'bg-white p-4 rounded-2xl rounded-tl-none shadow-sm text-graphite-950 border border-accent-200 markdown-content';
            
            // Reemplazar emojis comunes por iconos profesionales de Phosphor
            let processedContent = content
                // Documentos / Requisitos
                .replace(/📄|📋|📝|📁|📂|📑/g, '<i class="ph-bold ph-file-text" style="color: #113a52; margin-right: 4px;"></i>')
                // Dinero / Costos
                .replace(/💰|💵|🪙|💳/g, '<i class="ph-bold ph-money" style="color: #113a52; margin-right: 4px;"></i>')
                // Tiempo / Plazos
                .replace(/⏱️|⏰|⏲️|📅|📆/g, '<i class="ph-bold ph-clock" style="color: #113a52; margin-right: 4px;"></i>')
                // Ubicacion / Institución
                .replace(/📍|🏢|🏛️/g, '<i class="ph-bold ph-buildings" style="color: #113a52; margin-right: 4px;"></i>')
                // Checklist / Éxito
                .replace(/✅|✔️|👍/g, '<i class="ph-bold ph-check-circle" style="color: #72ae17; margin-right: 4px;"></i>')
                // Advertencia / Info / Pasos
                .replace(/⚠️|❗|❕|ℹ️/g, '<i class="ph-bold ph-info" style="color: #f59e0b; margin-right: 4px;"></i>')
                // Saludos
                .replace(/👋|🤝/g, '<i class="ph-bold ph-hand-waving" style="color: #113a52; margin-right: 4px;"></i>')
                // Pasos (números envueltos como emojis si el LLM los manda)
                .replace(/👉|➡️/g, '<i class="ph-bold ph-arrow-right" style="color: #113a52; margin-right: 4px;"></i>');

            // Renderizamos la respuesta de la IA (que tiene markdown e iconos) a HTML
            bubble.innerHTML = marked.parse(processedContent);
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(bubble);
        chatContainer.appendChild(messageDiv);
        
        // Scroll al fondo suave
        setTimeout(() => {
            chatContainer.scrollTo({
                top: chatContainer.scrollHeight,
                behavior: 'smooth'
            });
        }, 10);
    }

    // Función para mostrar indicador de carga
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'flex items-start gap-3 max-w-[85%] animate-slide-up-stagger';
        
        typingDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-white flex-shrink-0 flex items-center justify-center mt-1 border border-accent-200 overflow-hidden shadow-sm">
                <img src="assets/branding/logo-gamc-cocha.png" alt="IA" class="w-full h-full object-contain p-1">
            </div>
            <div class="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1.5 items-center border border-accent-200 h-[48px]">
                <div class="w-2 h-2 bg-haze-400 rounded-full wave-dot" style="animation-delay: 0s"></div>
                <div class="w-2 h-2 bg-haze-400 rounded-full wave-dot" style="animation-delay: 0.2s"></div>
                <div class="w-2 h-2 bg-haze-400 rounded-full wave-dot" style="animation-delay: 0.4s"></div>
            </div>
        `;
        chatContainer.appendChild(typingDiv);
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    // Función para remover indicador de carga
    function removeTypingIndicator() {
        const typingDiv = document.getElementById('typing-indicator');
        if (typingDiv) {
            typingDiv.classList.add('message-fade-out');
            setTimeout(() => {
                typingDiv.remove();
            }, 300); // Wait for animation to finish
        }
    }

    // Enviar mensaje al backend
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const message = userInput.value.trim();
        if (!message) return;

        // Limpiar input y resetear UI
        userInput.value = '';
        userInput.dispatchEvent(new Event('input')); // disable button
        appendMessage('user', message);
        
        // Agregar al historial
        messagesHistory.push({ role: 'user', content: message });
        
        // Bloquear input
        userInput.disabled = true;
        
        showTypingIndicator();

        try {
            const response = await fetch('http://127.0.0.1:8000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    session_id: sessionId,
                    messages: messagesHistory 
                })
            });

            if (!response.ok) {
                throw new Error('Error en la comunicación con el servidor');
            }

            const data = await response.json();
            const botMessage = data.response;

            // Agregar respuesta al historial
            messagesHistory.push({ role: 'assistant', content: botMessage });
            
            removeTypingIndicator();
            // Pequeño delay para permitir que el fade-out se vea antes de añadir el nuevo mensaje
            setTimeout(() => {
                appendMessage('assistant', botMessage);
            }, 300);

        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator();
            setTimeout(() => {
                appendMessage('assistant', 'Lo siento, ha ocurrido un error al conectar con el servidor local. Asegúrate de que Ollama y el backend estén corriendo.');
            }, 300);
        } finally {
            // Desbloquear input
            userInput.disabled = false;
            setTimeout(() => {
                userInput.focus();
            }, 350);
        }
    });
});
