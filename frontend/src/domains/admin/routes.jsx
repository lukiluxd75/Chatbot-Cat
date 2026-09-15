import FeedbackPage from './pages/FeedbackPage';
import AdminPage from './pages/AdminPage';
import IngestaPage from './pages/IngestaPage';

export const adminRoutes = [
    { path: '/admin', element: <AdminPage /> },
    { path: '/admin/feedback', element: <FeedbackPage /> },
    { path: '/admin/ingesta', element: <IngestaPage /> }
];
