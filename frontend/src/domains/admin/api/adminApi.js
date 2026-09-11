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
