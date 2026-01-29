import { useLocalStorage } from '@vueuse/core';

export interface UserProfile {
    displayName: string;
    email: string;
    role: string;
}

export const useUserProfile = () => {
    // Persist user profile to local storage
    const userProfile = useLocalStorage<UserProfile>('here-crm-user-profile', {
        displayName: 'Ilya Zaigralov',
        email: 'ilya@example.com',
        role: 'Partner'
    });

    return {
        userProfile
    };
};
