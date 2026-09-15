import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const sendChatMessage = async (messages, sessionId) => {
    const res = await api.post('/chat', {
        session_id: sessionId,
        messages: messages
    });
    return res.data;
};

export const sendFeedback = async (messageId, feedback, comment = null) => {
    const res = await api.post('/feedback', {
        message_id: messageId,
        feedback: feedback,
        comment: comment
    });
    return res.data;
};

export const sendVisionImage = async (imageFile, prompt = '', sessionId = 'default_session') => {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('prompt', prompt);
    formData.append('session_id', sessionId);
    
    const res = await api.post('/vision', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
    });
    return res.data;
};
