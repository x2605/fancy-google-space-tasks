// assignee/assignee_utils.ts - Assignee utility functions
import * as Logger from '@/core/logger';
import { CoreDOMUtils } from '@/core/dom_utils';

Logger.fgtlog('👥 Assignee Utils loading...');

/**
 * Assignee utilities for team member management
 */
class AssigneeUtils {
    /**
     * Get initials from a name
     * @param name - Full name or email
     * @returns Initials (max 2 characters)
     */
    static getInitials(name: string): string {
        if (!name || typeof name !== 'string') {
            return '?';
        }

        // Clean the name
        const cleanName = name.trim();

        // Handle email addresses
        if (cleanName.includes('@')) {
            const emailParts = cleanName.split('@');
            const localPart = emailParts[0];

            // Try to extract name from email local part
            const nameParts = localPart.split(/[._-]/);
            if (nameParts.length >= 2) {
                return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
            } else {
                return localPart.substring(0, 2).toUpperCase();
            }
        }

        // Handle regular names
        const words = cleanName.split(/\s+/).filter(word => word.length > 0);

        if (words.length === 0) {
            return '?';
        } else if (words.length === 1) {
            // Single word - take first 2 characters
            return words[0].substring(0, 2).toUpperCase();
        } else {
            // Multiple words - take first character of first two words
            return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
        }
    }

    /**
     * Get status for an assignee (placeholder implementation)
     * @param assignee - Assignee name
     * @returns Status text
     */
    static getStatus(assignee: string): string {
        if (!assignee) return '';

        // This is a placeholder implementation
        // In a real application, this would check actual user status
        const statuses = ['Available', 'Busy', 'Away', 'In Meeting'];
        const hash = AssigneeUtils.hashString(assignee);
        return statuses[hash % statuses.length];
    }

    /**
     * Get current user (placeholder implementation)
     * @returns Current user name
     */
    static getCurrentUser(): string | null {
        // This is a placeholder implementation
        // In a real application, this would get the current logged-in user
        return 'Current User';
    }

    /**
     * Generate avatar color based on name
     * @param name - Assignee name
     * @returns Color object with background and text colors
     */
    static getAvatarColor(name: string): { background: string; color: string } {
        if (!name) {
            return { background: '#9aa0a6', color: '#ffffff' };
        }

        const hash = AssigneeUtils.hashString(name);
        const hue = hash % 360;
        const saturation = 60 + (hash % 20); // 60-80%
        const lightness = 45 + (hash % 15); // 45-60%

        const backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        const textColor = lightness > 50 ? '#000000' : '#ffffff';

        return {
            background: backgroundColor,
            color: textColor
        };
    }

    /**
     * Hash string to number for consistent color generation
     * @param str - String to hash
     * @returns Hash value
     */
    static hashString(str: string): number {
        let hash = 0;
        if (!str || str.length === 0) return hash;

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        return Math.abs(hash);
    }

    /**
     * Format assignee name for display
     * @param name - Raw assignee name
     * @returns Formatted name
     */
    static formatDisplayName(name: string): string {
        if (!name || typeof name !== 'string') {
            return 'Unknown';
        }

        const cleanName = name.trim();

        // Handle email addresses
        if (cleanName.includes('@')) {
            const emailParts = cleanName.split('@');
            const localPart = emailParts[0];

            // Try to extract name from email local part
            const nameParts = localPart.split(/[._-]/);
            if (nameParts.length >= 2) {
                // Capitalize first letter of each part
                return nameParts
                    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                    .join(' ');
            }
        }

        // Return cleaned name with title case
        return cleanName
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Validate assignee name
     * @param assignee - Assignee name to validate
     * @returns Is valid assignee
     */
    static isValidAssignee(assignee: string): boolean {
        if (!assignee || typeof assignee !== 'string') {
            return false;
        }

        const cleanAssignee = assignee.trim();

        // Check length
        if (cleanAssignee.length === 0 || cleanAssignee.length > 100) {
            return false;
        }

        // Check if it's a valid email format
        if (cleanAssignee.includes('@')) {
            const emailRegex = /^[^\s@]+@[^\s@]+$/;
            return emailRegex.test(cleanAssignee);
        }

        // Check for invalid characters in names
        const invalidChars = /[<>"'&]/;
        return !invalidChars.test(cleanAssignee);
    }

    /**
     * Clean assignee name
     * @param assignee - Assignee name to clean
     * @returns Cleaned assignee name
     */
    static cleanAssigneeName(assignee: string): string {
        if (!assignee || typeof assignee !== 'string') {
            return '';
        }

        return assignee
            .trim()
            .replace(/[<>"'&]/g, '') // Remove invalid characters
            .substring(0, 100); // Limit length
    }

    /**
     * Search assignees by query
     * @param assignees - List of assignees
     * @param query - Search query
     * @returns Filtered assignees
     */
    static searchAssignees(assignees: string[], query: string): string[] {
        if (!query || !Array.isArray(assignees)) {
            return assignees || [];
        }

        const queryLower = query.toLowerCase().trim();

        return assignees.filter(assignee => {
            const assigneeLower = assignee.toLowerCase();
            const displayName = AssigneeUtils.formatDisplayName(assignee).toLowerCase();

            return assigneeLower.includes(queryLower) ||
                displayName.includes(queryLower);
        }).sort((a, b) => {
            // Prioritize exact matches and starts-with matches
            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();

            if (aLower === queryLower) return -1;
            if (bLower === queryLower) return 1;
            if (aLower.startsWith(queryLower)) return -1;
            if (bLower.startsWith(queryLower)) return 1;

            return a.localeCompare(b);
        });
    }

    /**
     * Group tasks by assignee
     * @param tasks - Tasks map
     * @returns Tasks grouped by assignee
     */
    static groupTasksByAssignee(tasks: Map<string, any>): any {
        const grouped: any = {
            unassigned: []
        };

        if (tasks && tasks.size > 0) {
            tasks.forEach(task => {
                const assignee = task.assignee && task.assignee.trim();

                if (assignee) {
                    if (!grouped[assignee]) {
                        grouped[assignee] = [];
                    }
                    grouped[assignee].push(task);
                } else {
                    grouped.unassigned.push(task);
                }
            });
        }

        return grouped;
    }

    /**
     * Get workload for assignees
     * @param groupedTasks - Tasks grouped by assignee
     * @returns Workload information
     */
    static getWorkloadInfo(groupedTasks: any): any[] {
        const workloads: any[] = [];

        Object.entries(groupedTasks).forEach(([assignee, tasks]: [string, any]) => {
            if (assignee === 'unassigned') return;

            const completedTasks = tasks.filter((task: any) => task.isCompleted).length;
            const pendingTasks = tasks.length - completedTasks;
            const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

            workloads.push({
                assignee,
                displayName: AssigneeUtils.formatDisplayName(assignee),
                totalTasks: tasks.length,
                completedTasks,
                pendingTasks,
                completionRate: Math.round(completionRate),
                workloadLevel: AssigneeUtils.calculateWorkloadLevel(pendingTasks)
            });
        });

        return workloads.sort((a, b) => b.totalTasks - a.totalTasks);
    }

    /**
     * Calculate workload level
     * @param pendingTasks - Number of pending tasks
     * @returns Workload level
     */
    static calculateWorkloadLevel(pendingTasks: number): string {
        if (pendingTasks === 0) return 'Available';
        if (pendingTasks <= 2) return 'Light';
        if (pendingTasks <= 5) return 'Medium';
        if (pendingTasks <= 10) return 'Heavy';
        return 'Overloaded';
    }

    /**
     * Generate assignee dropdown options HTML
     * @param assignees - List of assignees
     * @param selected - Currently selected assignee
     * @returns Options HTML
     */
    static generateDropdownOptions(assignees: string[], selected: string = ''): string {
        let optionsHTML = '<option value="">Unassigned</option>';

        if (Array.isArray(assignees)) {
            assignees.forEach(assignee => {
                const isSelected = assignee === selected ? ' selected' : '';
                const displayName = AssigneeUtils.formatDisplayName(assignee);

                optionsHTML += `
                    <option value="${CoreDOMUtils.escapeHtml(assignee)}"${isSelected}>
                        ${CoreDOMUtils.escapeHtml(displayName)}
                    </option>
                `;
            });
        }

        return optionsHTML;
    }
}

export { AssigneeUtils };

Logger.fgtlog('✅ Assignee Utils loaded successfully');