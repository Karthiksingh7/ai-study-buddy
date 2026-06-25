import { createContext, useContext, useCallback, useEffect, ReactNode } from "react";
import { toast } from "sonner";

// 12 Pure Blue Gradient Themes - All Blue Shades
export const GRADIENT_THEMES = [
    // Light to Dark Blues
    { start: "200 85% 55%", mid: "210 80% 50%", end: "220 75% 50%", primary: "210 80% 52%", name: "Sky Blue" },
    { start: "210 80% 50%", mid: "220 75% 55%", end: "230 70% 55%", primary: "220 77% 52%", name: "Ocean Blue" },
    { start: "220 75% 50%", mid: "230 70% 50%", end: "240 65% 55%", primary: "225 72% 52%", name: "Azure Blue" },

    // Cyan Blues  
    { start: "190 85% 50%", mid: "200 80% 50%", end: "210 75% 55%", primary: "195 82% 50%", name: "Cyan Blue" },
    { start: "185 80% 48%", mid: "195 78% 50%", end: "205 75% 52%", primary: "190 79% 49%", name: "Aqua Blue" },
    { start: "195 80% 50%", mid: "205 78% 52%", end: "215 75% 55%", primary: "200 79% 51%", name: "Crystal Blue" },

    // Deep Blues
    { start: "220 65% 50%", mid: "230 60% 48%", end: "240 55% 50%", primary: "225 62% 49%", name: "Deep Blue" },
    { start: "230 60% 48%", mid: "240 55% 50%", end: "250 50% 52%", primary: "235 57% 49%", name: "Royal Blue" },
    { start: "215 70% 50%", mid: "225 65% 52%", end: "235 60% 55%", primary: "220 67% 51%", name: "Navy Blue" },

    // Bright Blues
    { start: "200 90% 55%", mid: "210 85% 52%", end: "220 80% 50%", primary: "205 87% 53%", name: "Bright Blue" },
    { start: "195 88% 52%", mid: "205 85% 50%", end: "215 80% 52%", primary: "200 86% 51%", name: "Electric Blue" },
    { start: "205 85% 50%", mid: "215 82% 52%", end: "225 78% 54%", primary: "210 83% 51%", name: "Vivid Blue" },
];

interface ThemeContextType {
    currentTheme: number;
    changeTheme: () => void;
    applyTheme: (index: number) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const applyTheme = useCallback((index: number) => {
        const theme = GRADIENT_THEMES[index];
        if (!theme) return;

        const root = document.documentElement;

        // Core gradient colors
        root.style.setProperty("--gradient-start", theme.start);
        root.style.setProperty("--gradient-mid", theme.mid);
        root.style.setProperty("--gradient-end", theme.end);
        root.style.setProperty("--primary", theme.primary);
        root.style.setProperty("--ring", theme.primary);
        root.style.setProperty("--accent", theme.end);

        // Extract hue from primary for coordinated colors
        const hue = parseInt(theme.primary.split(" ")[0]);

        // LIGHT BACKGROUNDS — Clean White Theme
        root.style.setProperty("--background", `${hue} 20% 99%`);
        root.style.setProperty("--foreground", `${hue} 40% 10%`);
        root.style.setProperty("--card", `${hue} 30% 97%`);
        root.style.setProperty("--card-foreground", `${hue} 40% 10%`);
        root.style.setProperty("--popover", `${hue} 30% 97%`);
        root.style.setProperty("--popover-foreground", `${hue} 40% 10%`);

        // Secondary colors — light variants
        root.style.setProperty("--secondary", `${hue} 25% 93%`);
        root.style.setProperty("--secondary-foreground", `${hue} 30% 15%`);
        root.style.setProperty("--muted", `${hue} 20% 95%`);
        root.style.setProperty("--muted-foreground", `${hue} 15% 42%`);
        root.style.setProperty("--border", `${hue} 20% 88%`);
        root.style.setProperty("--input", `${hue} 20% 90%`);

        // Sidebar colors — light glass
        root.style.setProperty("--sidebar-background", `${hue} 25% 97%`);
        root.style.setProperty("--sidebar-foreground", `${hue} 40% 15%`);
        root.style.setProperty("--sidebar-primary", theme.primary);
        root.style.setProperty("--sidebar-ring", theme.primary);
        root.style.setProperty("--sidebar-accent", `${hue} 30% 93%`);
        root.style.setProperty("--sidebar-accent-foreground", `${hue} 40% 15%`);
        root.style.setProperty("--sidebar-border", `${hue} 18% 90%`);

        localStorage.setItem("gradient-index", index.toString());
    }, []);

    const changeTheme = useCallback(() => {
        const currentIndex = parseInt(localStorage.getItem("gradient-index") || "-1", 10);
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * GRADIENT_THEMES.length);
        } while (newIndex === currentIndex && GRADIENT_THEMES.length > 1);

        applyTheme(newIndex);
        const theme = GRADIENT_THEMES[newIndex];
        toast.success(`Theme: ${theme.name}`, { duration: 1500, position: "bottom-center" });
    }, [applyTheme]);

    // Apply saved theme on mount
    useEffect(() => {
        const savedIndex = parseInt(localStorage.getItem("gradient-index") || "-1", 10);
        if (savedIndex >= 0 && savedIndex < GRADIENT_THEMES.length) {
            applyTheme(savedIndex);
        } else {
            const randomIndex = Math.floor(Math.random() * GRADIENT_THEMES.length);
            applyTheme(randomIndex);
        }
    }, [applyTheme]);

    return (
        <ThemeContext.Provider value={{
            currentTheme: parseInt(localStorage.getItem("gradient-index") || "0", 10),
            changeTheme,
            applyTheme
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}

// Helper hook for components that want to change theme on click
export function useThemeClick() {
    const { changeTheme } = useTheme();
    return { onClick: changeTheme };
}
