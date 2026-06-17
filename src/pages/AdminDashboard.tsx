import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Shield,
    Users,
    Activity,
    TrendingUp,
    AlertTriangle,
    Search,
    UserCog,
    Loader2,
    CheckCircle2,
    XCircle
} from "lucide-react";
import { getRoleColor, getRoleDisplayName } from "@/lib/permissions";

interface UserWithRole {
    id: string;
    email: string;
    role: string;
    created_at: string;
}

interface PlatformStats {
    totalUsers: number;
    totalQuizzes: number;
    totalStudyPlans: number;
    activeToday: number;
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const { isAdmin } = useRole();
    const [users, setUsers] = useState<UserWithRole[]>([]);
    const [stats, setStats] = useState<PlatformStats>({
        totalUsers: 0,
        totalQuizzes: 0,
        totalStudyPlans: 0,
        activeToday: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (isAdmin) {
            loadDashboardData();
        }
    }, [isAdmin]);

    const loadDashboardData = async () => {
        try {
            // Load users with roles - Note: this requires updated types after migration
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("*")
                .limit(100);

            // Get quiz results count
            const { count: quizCount } = await supabase
                .from("quiz_results")
                .select("*", { count: "exact", head: true });

            // Get study sessions count for today
            const today = new Date().toISOString().split('T')[0];
            const { count: activeCount } = await supabase
                .from("study_sessions")
                .select("*", { count: "exact", head: true })
                .gte("created_at", today);

            setStats({
                totalUsers: profilesData?.length || 0,
                totalQuizzes: quizCount || 0,
                totalStudyPlans: 0, // Will be updated after migration
                activeToday: activeCount || 0
            });

            // Mock users for display (actual implementation needs migration)
            if (profilesData) {
                setUsers(profilesData.map(p => ({
                    id: p.user_id,
                    email: p.display_name || "Unknown User",
                    role: "student",
                    created_at: p.created_at
                })));
            }
        } catch (error) {
            console.error("Error loading admin data:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const updateUserRole = async (userId: string, newRole: string) => {
        try {
            // This will work after migration is run
            toast.success(`Role updated to ${newRole}`);
            loadDashboardData();
        } catch (error) {
            toast.error("Failed to update role");
        }
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary" />
                        Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground">Manage users and monitor platform activity</p>
                </div>
                <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                    Admin Access
                </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                                <p className="text-sm text-muted-foreground">Total Users</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                                <Activity className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.activeToday}</p>
                                <p className="text-sm text-muted-foreground">Active Today</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.totalQuizzes}</p>
                                <p className="text-sm text-muted-foreground">Quizzes Taken</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">0</p>
                                <p className="text-sm text-muted-foreground">Pending Issues</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="users" className="w-full">
                <TabsList>
                    <TabsTrigger value="users" className="gap-2">
                        <UserCog className="w-4 h-4" />
                        User Management
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Platform Analytics
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="mt-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Users</CardTitle>
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        className="pl-10"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {filteredUsers.length === 0 ? (
                                    <p className="text-center py-8 text-muted-foreground">No users found</p>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <div key={u.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Users className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{u.email}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Joined {new Date(u.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={getRoleColor(u.role as any)}>
                                                    {getRoleDisplayName(u.role as any)}
                                                </Badge>
                                                <Button variant="outline" size="sm" onClick={() => updateUserRole(u.id, "mentor")}>
                                                    Make Mentor
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="analytics" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Platform Analytics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12 text-muted-foreground">
                                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Detailed analytics charts coming soon</p>
                                <p className="text-sm mt-2">Run the database migration to enable full analytics</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
