// assignee/assignee_utils.js - Assignee utility functions
fgtlog('👥 Assignee Utils loading...');

/**
 * Assignee utilities for team member management
 */
class AssigneeUtils {
    /**
     * Get initials from a name
     * @param {string} name - Full name or email
     * @returns {string} - Initials (max 2 characters)
     */
    static getInitials(name) {
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
     * @param {string} assignee - Assignee name
     * @returns {string} - Status text
     */
    static getStatus(assignee) {
        if (!assignee) return '';

        // This is a placeholder implementation
        // In a real application, this would check actual user status
        const statuses = ['Available', 'Busy', 'Away', 'In Meeting'];
        const hash = AssigneeUtils.hashString(assignee);
        return statuses[hash % statuses.length];
    }

    /**
     * Get current user (placeholder implementation)
     * @returns {string|null} - Current user name
     */
    static getCurrentUser() {
        // This is a placeholder implementation
        // In a real application, this would get the current logged-in user
        return 'Current User';
    }

    /**
     * Generate avatar color based on name
     * @param {string} name - Assignee name
     * @returns {Object} - Color object with background and text colors
     */
    static getAvatarColor(name) {
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
     * @param {string} str - String to hash
     * @returns {number} - Hash value
     */
    static hashString(str) {
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
     * @param {string} name - Raw assignee name
     * @returns {string} - Formatted name
     */
    static formatDisplayName(name) {
        if (!name || typeof name !== 'string') {
            return 'Unknown';
        }

        const cleanName = name.trim();

        // Handle email addresses
        if (cleanName.includes('@')) {
            const emailParts = cleanName.split('@');
            const localPart = emailParts[0];

            // Try to convert email to readable name
            const nameParts = localPart.split(/[._-]/);
            const formattedParts = nameParts.map(part =>
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            );

            if (formattedParts.length >= 2) {
                return formattedParts.join(' ');
            } else {
                return formattedParts[0];
            }
        }

        // Handle regular names - title case
        return cleanName.split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Create assignee badge HTML
     * @param {string} assignee - Assignee name
     * @param {Object} options - Styling options
     * @returns {string} - Badge HTML
     */
    static createAssigneeBadge(assignee, options = {}) {
        if (!assignee) {
            return `<span class="no-assignee">Unassigned</span>`;
        }

        const initials = AssigneeUtils.getInitials(assignee);
        const colors = AssigneeUtils.getAvatarColor(assignee);
        const displayName = AssigneeUtils.formatDisplayName(assignee);
        const className = options.className || 'assignee-badge';
        const showName = options.showName !== false;
        const size = options.size || 'medium';

        const sizeClasses = {
            small: 'assignee-badge-small',
            medium: 'assignee-badge-medium',
            large: 'assignee-badge-large'
        };

        return `
            <div class="${className} ${sizeClasses[size]}" data-assignee="${CoreDOMUtils.escapeHtml(assignee)}">
                <div class="assignee-avatar" style="background: ${colors.background}; color: ${colors.color};">
                    ${initials}
                </div>
                ${showName ? `<span class="assignee-name">${CoreDOMUtils.escapeHtml(displayName)}</span>` : ''}
            </div>
        `;
    }

    /**
     * Extract team members from tasks
     * @param {Map} tasks - Tasks map
     * @returns {string[]} - Unique assignees
     */
    static extractTeamMembers(tasks) {
        const assignees = new Set();

        if (tasks && tasks.size > 0) {
            tasks.forEach(task => {
                if (task.assignee && task.assignee.trim()) {
                    assignees.add(task.assignee.trim());
                }
            });
        }

        return Array.from(assignees).sort();
    }

    /**
     * Get assignee statistics
     * @param {Map} tasks - Tasks map
     * @returns {Object} - Assignee statistics
     */
    static getAssigneeStatistics(tasks) {
        const stats = {
            totalTasks: 0,
            assignedTasks: 0,
            unassignedTasks: 0,
            assignees: {},
            topAssignees: []
        };

        if (tasks && tasks.size > 0) {
            tasks.forEach(task => {
                stats.totalTasks++;

                if (task.assignee && task.assignee.trim()) {
                    stats.assignedTasks++;
                    const assignee = task.assignee.trim();

                    if (!stats.assignees[assignee]) {
                        stats.assignees[assignee] = {
                            name: assignee,
                            totalTasks: 0,
                            completedTasks: 0,
                            pendingTasks: 0
                        };
                    }

                    stats.assignees[assignee].totalTasks++;

                    if (task.isCompleted) {
                        stats.assignees[assignee].completedTasks++;
                    } else {
                        stats.assignees[assignee].pendingTasks++;
                    }
                } else {
                    stats.unassignedTasks++;
                }
            });
        }

        // Calculate top assignees
        stats.topAssignees = Object.values(stats.assignees)
            .sort((a, b) => b.totalTasks - a.totalTasks)
            .slice(0, 5);

        return stats;
    }

    /**
     * Validate assignee name
     * @param {string} assignee - Assignee name to validate
     * @returns {boolean} - Is valid
     */
    static isValidAssignee(assignee) {
        if (!assignee || typeof assignee !== 'string') {
            return false;
        }

        const cleanAssignee = assignee.trim();

        // Check length
        if (cleanAssignee.length === 0 || cleanAssignee.length > 100) {
            return false;
        }

        // Check for basic email format if it contains @
        if (cleanAssignee.includes('@')) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(cleanAssignee);
        }

        // Check for invalid characters in names
        const invalidChars = /[<>\"'&]/;
        return !invalidChars.test(cleanAssignee);
    }

    /**
     * Clean assignee name
     * @param {string} assignee - Assignee name to clean
     * @returns {string} - Cleaned assignee name
     */
    static cleanAssigneeName(assignee) {
        if (!assignee || typeof assignee !== 'string') {
            return '';
        }

        return assignee
            .trim()
            .replace(/[<>\"'&]/g, '') // Remove invalid characters
            .substring(0, 100); // Limit length
    }

    /**
     * Search assignees by query
     * @param {string[]} assignees - List of assignees
     * @param {string} query - Search query
     * @returns {string[]} - Filtered assignees
     */
    static searchAssignees(assignees, query) {
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
     * @param {Map} tasks - Tasks map
     * @returns {Object} - Tasks grouped by assignee
     */
    static groupTasksByAssignee(tasks) {
        const grouped = {
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
     * @param {Object} groupedTasks - Tasks grouped by assignee
     * @returns {Object[]} - Workload information
     */
    static getWorkloadInfo(groupedTasks) {
        const workloads = [];

        Object.entries(groupedTasks).forEach(([assignee, tasks]) => {
            if (assignee === 'unassigned') return;

            const completedTasks = tasks.filter(task => task.isCompleted).length;
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
     * @param {number} pendingTasks - Number of pending tasks
     * @returns {string} - Workload level
     */
    static calculateWorkloadLevel(pendingTasks) {
        if (pendingTasks === 0) return 'Available';
        if (pendingTasks <= 2) return 'Light';
        if (pendingTasks <= 5) return 'Medium';
        if (pendingTasks <= 10) return 'Heavy';
        return 'Overloaded';
    }

    /**
     * Generate assignee dropdown options HTML
     * @param {string[]} assignees - List of assignees
     * @param {string} selected - Currently selected assignee
     * @returns {string} - Options HTML
     */
    static generateDropdownOptions(assignees, selected = '') {
        let optionsHTML = '<option value="">Unassigned</option>';

        if (Array.isArray(assignees)) {
            assignees.forEach(assignee => {
                const isSelected = assignee === selected ? 'selected' : '';
                const displayName = AssigneeUtils.formatDisplayName(assignee);
                optionsHTML += `<option value="${CoreDOMUtils.escapeHtml(assignee)}" ${isSelected}>${CoreDOMUtils.escapeHtml(displayName)}</option>`;
            });
        }

        return optionsHTML;
    }

    /**
     * Create team member list HTML
     * @param {string[]} assignees - List of assignees
     * @param {Object} options - Display options
     * @returns {string} - Team list HTML
     */
    static createTeamListHTML(assignees, options = {}) {
        const namespace = options.namespace || 'fancy-gst';
        const showStats = options.showStats !== false;
        const allowSelection = options.allowSelection === true;

        if (!Array.isArray(assignees) || assignees.length === 0) {
            return `<div class="${namespace}-no-team-members">No team members found</div>`;
        }

        let listHTML = `<div class="${namespace}-team-list">`;

        assignees.forEach(assignee => {
            const colors = AssigneeUtils.getAvatarColor(assignee);
            const initials = AssigneeUtils.getInitials(assignee);
            const displayName = AssigneeUtils.formatDisplayName(assignee);
            const status = AssigneeUtils.getStatus(assignee);

            listHTML += `
                <div class="${namespace}-team-member ${allowSelection ? 'selectable' : ''}" 
                     data-assignee="${CoreDOMUtils.escapeHtml(assignee)}">
                    <div class="${namespace}-member-avatar" style="background: ${colors.background}; color: ${colors.color};">
                        ${initials}
                    </div>
                    <div class="${namespace}-member-info">
                        <div class="${namespace}-member-name">${CoreDOMUtils.escapeHtml(displayName)}</div>
                        <div class="${namespace}-member-status">${CoreDOMUtils.escapeHtml(status)}</div>
                    </div>
                    ${allowSelection ? `<div class="${namespace}-selection-indicator"></div>` : ''}
                </div>
            `;
        });

        listHTML += '</div>';
        return listHTML;
    }
}

// Export to global scope
window.AssigneeUtils = AssigneeUtils;

fgtlog('✅ Assignee Utils loaded successfully');