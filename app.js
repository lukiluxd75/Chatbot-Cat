document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatContainer = document.getElementById('chat-container');
    const sendBtn = document.getElementById('send-btn');

    // Estado del historial de mensajes
    let messagesHistory = [];

    // Función para agregar un mensaje al UI
    function appendMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex items-start gap-3 max-w-[85%] animate-slide-down ${role === 'user' ? 'self-end flex-row-reverse' : ''}`;
        
        const avatar = document.createElement('div');
        if (role === 'user') {
            avatar.className = 'w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-1 bg-brand-900';
            avatar.textContent = 'TÚ';
        } else {
            avatar.className = 'w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 bg-white border border-accent-200 overflow-hidden shadow-sm';
            avatar.innerHTML = '<img src="assets/branding/logo-gamc-cocha.png" alt="IA" class="w-full h-full object-contain p-1">';
        }

        const bubble = document.createElement('div');
        if (role === 'user') {
            bubble.className = 'bg-brand-900 text-white p-4 rounded-2xl rounded-tr-none shadow-sm';
        } else {
            bubble.className = 'bg-white p-4 rounded-2xl rounded-tl-none shadow-sm text-graphite-950 border border-accent-200';
        }
        
        // Convertir saltos de línea a <br>
        bubble.innerHTML = content.replace(/\n/g, '<br>');

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(bubble);
        chatContainer.appendChild(messageDiv);
        
        // Scroll al fondo
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Función para mostrar indicador de carga
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'flex items-start gap-3 max-w-[85%] animate-slide-down';
        
        typingDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-white flex-shrink-0 flex items-center justify-center mt-1 border border-accent-200 overflow-hidden shadow-sm">
                <img src="assets/branding/logo-gamc-cocha.png" alt="IA" class="w-full h-full object-contain p-1">
            </div>
            <div class="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center border border-accent-200 h-[52px]">
                <div class="w-2 h-2 bg-haze-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                <div class="w-2 h-2 bg-haze-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                <div class="w-2 h-2 bg-haze-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
        `;
        chatContainer.appendChild(typingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Función para remover indicador de carga
    function removeTypingIndicator() {
        const typingDiv = document.getElementById('typing-indicator');
        if (typingDiv) {
            typingDiv.remove();
        }
    }

    // Enviar mensaje al backend
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const message = userInput.value.trim();
        if (!message) return;

        // Limpiar input y agregar al UI
        userInput.value = '';
        appendMessage('user', message);
        
        // Agregar al historial
        messagesHistory.push({ role: 'user', content: message });
        
        // Bloquear input
        userInput.disabled = true;
        sendBtn.disabled = true;
        sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
        
        showTypingIndicator();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages: messagesHistory })
            });

            if (!response.ok) {
                throw new Error('Error en la comunicación con el servidor');
            }

            const data = await response.json();
            const botMessage = data.response;

            // Agregar respuesta al historial
            messagesHistory.push({ role: 'assistant', content: botMessage });
            
            removeTypingIndicator();
            appendMessage('assistant', botMessage);

        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator();
            appendMessage('assistant', 'Lo siento, ha ocurrido un error al conectar con el servidor local. Asegúrate de que Ollama y el backend estén corriendo.');
        } finally {
            // Desbloquear input
            userInput.disabled = false;
            sendBtn.disabled = false;
            sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            userInput.focus();
        }
    });
});
