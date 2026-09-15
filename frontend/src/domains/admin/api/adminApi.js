import axios from 'axios';

const api = axios.create({ baseURL: '/api/admin' });

export const fetchProcedures = async () => {
    const res = await api.get('/procedures');
    return res.data;
};

export const updateProcedure = async (code, data) => {
    const res = await api.put(`/procedures/${code}`, data);
    return res.data;
};

export const fetchFeedback = async () => {
    const res = await api.get('/feedback');
    return res.data;
};

export const ingestarTramite = async (imageFile) => {
    const formData = new FormData();
    formData.append('archivo', imageFile);
    
    // El timeout debe ser alto porque la ingesta con qwen3-vl y gemma4 puede tardar un poco
    const res = await axios.post('/api/ingestar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 240000 
    });
    return res.data;
};
