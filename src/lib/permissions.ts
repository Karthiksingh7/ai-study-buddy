// Permission utilities for role-based access control

export type UserRole = 'student' | 'mentor' | 'admin';

export interface Permission {
    action: string;
    resource: string;
}

// Define permissions for each role
const rolePermissions: Record<UserRole, Permission[]> = {
    student: [
        { action: 'use', resource: 'ai_tutor' },
        { action: 'view', resource: 'study_plans' },
        { action: 'manage', resource: 'own_study_plans' },
        { action: 'take', resource: 'quizzes' },
        { action: 'view', resource: 'own_analytics' },
        { action: 'upload', resource: 'documents' },
        { action: 'join', resource: 'classrooms' },
        { action: 'submit', resource: 'assignments' },
        { action: 'view', resource: 'own_profile' },
    ],
    mentor: [
        // Inherits all student permissions
        { action: 'use', resource: 'ai_tutor' },
        { action: 'view', resource: 'study_plans' },
        { action: 'manage', resource: 'own_study_plans' },
        { action: 'take', resource: 'quizzes' },
        { action: 'view', resource: 'own_analytics' },
        { action: 'upload', resource: 'documents' },
        { action: 'view', resource: 'own_profile' },
        // Mentor-specific permissions
        { action: 'create', resource: 'classrooms' },
        { action: 'manage', resource: 'own_classrooms' },
        { action: 'view', resource: 'student_analytics' },
        { action: 'create', resource: 'mock_tests' },
        { action: 'grade', resource: 'submissions' },
        { action: 'generate', resource: 'ai_feedback' },
    ],
    admin: [
        // Full access
        { action: '*', resource: '*' },
    ],
};

export function hasPermission(role: UserRole | null, action: string, resource: string): boolean {
    if (!role) return false;

    const permissions = rolePermissions[role];

    return permissions.some(
        (p) =>
            (p.action === '*' && p.resource === '*') ||
            (p.action === action && p.resource === resource) ||
            (p.action === '*' && p.resource === resource) ||
            (p.action === action && p.resource === '*')
    );
}

export function isAdmin(role: UserRole | null): boolean {
    return role === 'admin';
}

export function isMentor(role: UserRole | null): boolean {
    return role === 'mentor' || role === 'admin';
}

export function isStudent(role: UserRole | null): boolean {
    return role === 'student';
}

export function getRoleDisplayName(role: UserRole | null): string {
    if (!role) return 'User';
    return role.charAt(0).toUpperCase() + role.slice(1);
}

export function getRoleColor(role: UserRole | null): string {
    switch (role) {
        case 'admin':
            return 'text-red-500 bg-red-100 dark:bg-red-950/30';
        case 'mentor':
            return 'text-blue-500 bg-blue-100 dark:bg-blue-950/30';
        case 'student':
            return 'text-green-500 bg-green-100 dark:bg-green-950/30';
        default:
            return 'text-gray-500 bg-gray-100 dark:bg-gray-950/30';
    }
}

// Feature flags based on subscription and role
export interface UsageLimits {
    aiChatsPerDay: number;
    quizzesPerDay: number;
    documentsTotal: number;
    mockTestsPerMonth: number;
}

export function getUsageLimits(plan: 'free' | 'pro' | 'institutional'): UsageLimits {
    switch (plan) {
        case 'pro':
            return {
                aiChatsPerDay: 1000,
                quizzesPerDay: 100,
                documentsTotal: 100,
                mockTestsPerMonth: 50,
            };
        case 'institutional':
            return {
                aiChatsPerDay: 10000,
                quizzesPerDay: 1000,
                documentsTotal: 1000,
                mockTestsPerMonth: 500,
            };
        default: // free
            return {
                aiChatsPerDay: 10,
                quizzesPerDay: 5,
                documentsTotal: 5,
                mockTestsPerMonth: 3,
            };
    }
}
