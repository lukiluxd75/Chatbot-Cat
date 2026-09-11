import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { chatRoutes } from './domains/chatbot/routes';
import { adminRoutes } from './domains/admin/routes';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {chatRoutes.map(r => <Route key={r.path} path={r.path} element={r.element} />)}
                {adminRoutes.map(r => <Route key={r.path} path={r.path} element={r.element} />)}
            </Routes>
        </BrowserRouter>
    );
}
