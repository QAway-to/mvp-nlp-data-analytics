import { useDark, useToggle } from '@vueuse/core';

export const useTheme = () => {
    const isDark = useDark({
        selector: 'html',
        attribute: 'class',
        valueDark: 'dark',
        valueLight: '',
    });

    const toggleDark = useToggle(isDark);

    return {
        isDark,
        toggleDark
    };
};
