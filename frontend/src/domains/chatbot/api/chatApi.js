import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const sendChatMessage = async (messages, sessionId) => {
    const res = await api.post('/chat', {
        session_id: sessionId,
        messages: messages
    });
    return res.data;
};
