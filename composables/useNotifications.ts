import { ref } from 'vue';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: Date;
    read: boolean;
}

const notifications = ref<Notification[]>([]);

export const useNotifications = () => {
    const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        const id = Math.random().toString(36).substring(7);
        const newNotif: Notification = {
            id,
            title,
            message,
            type,
            timestamp: new Date(),
            read: false,
        };
        notifications.value.unshift(newNotif);

        // Auto-remove toast after 5 seconds
        setTimeout(() => {
            // We don't remove it from the list, we just might handle "toast visibility" separately if needed.
            // But usually, the "Toast" component handles its own visibility duration, 
            // while the "Notification Center" keeps the history.
            // For simplicity, this composable manages the *data*.
        }, 5000);
    };

    const markAsRead = (id: string) => {
        const notif = notifications.value.find(n => n.id === id);
        if (notif) notif.read = true;
    };

    const markAllAsRead = () => {
        notifications.value.forEach(n => n.read = true);
    };

    const clearAll = () => {
        notifications.value = [];
    };

    const unreadCount = () => notifications.value.filter(n => !n.read).length;

    // Demo: Mock incoming notification
    const startDemoNotifications = () => {
        setTimeout(() => {
            addNotification('New Lead Assigned', 'You have been assigned to "TechCorp Enterprise" deal.', 'info');
        }, 5000);

        setInterval(() => {
            if (Math.random() > 0.7) {
                const events = [
                    { t: 'Deal Updated', m: 'Status changed to "Negotiation" for Acme Inc.', type: 'success' },
                    { t: 'Task Overdue', m: 'Call with John Doe was due 1 hour ago.', type: 'warning' },
                    { t: 'System Alert', m: 'Maintenance scheduled for tonight.', type: 'info' }
                ];
                const ev = events[Math.floor(Math.random() * events.length)];
                // addNotification(ev.t, ev.m, ev.type as any); // Disable constant spam for now, just initial one
            }
        }, 30000);
    };

    return {
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        unreadCount,
        startDemoNotifications
    };
};
