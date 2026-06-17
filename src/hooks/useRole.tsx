import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserRole, hasPermission, isAdmin, isMentor } from "@/lib/permissions";

interface RoleContextType {
    role: UserRole | null;
    loading: boolean;
    hasPermission: (action: string, resource: string) => boolean;
    isAdmin: boolean;
    isMentor: boolean;
    isStudent: boolean;
    refetchRole: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType>({
    role: null,
    loading: true,
    hasPermission: () => false,
    isAdmin: false,
    isMentor: false,
    isStudent: false,
    refetchRole: async () => { },
});

export function RoleProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchRole = async () => {
        if (!user) {
            setRole(null);
            setLoading(false);
            return;
        }

        try {
            // Note: user_roles table will exist after running the database migration
            // Using 'any' assertion to bypass type checking until types are regenerated
            const { data, error } = await (supabase as any)
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .single();

            if (error) {
                // If no role found, default to student
                if (error.code === "PGRST116") {
                    setRole("student");
                } else {
                    console.error("Error fetching role:", error);
                    setRole("student");
                }
            } else {
                setRole(data.role as UserRole);
            }
        } catch (err) {
            console.error("Error fetching role:", err);
            setRole("student");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchRole();
        }
    }, [user, authLoading]);

    const value: RoleContextType = {
        role,
        loading: authLoading || loading,
        hasPermission: (action: string, resource: string) => hasPermission(role, action, resource),
        isAdmin: isAdmin(role),
        isMentor: isMentor(role),
        isStudent: role === "student",
        refetchRole: fetchRole,
    };

    return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
    return useContext(RoleContext);
}
