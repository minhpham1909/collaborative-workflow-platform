export const WORKSPACE_MANAGEMENT_ACTIONS = Object.freeze(['created', 'metadata_updated', 'invitation_created', 'invitation_revoked', 'member_joined', 'member_left', 'member_removed', 'role_changed', 'ownership_transferred', 'archived', 'unarchived']);
export const WORKSPACE_AUDIT_ACTIONS = Object.freeze([...WORKSPACE_MANAGEMENT_ACTIONS, 'ban', 'unban']);
export const WORKSPACE_AUDIT_SOURCES = Object.freeze(['management', 'role', 'lifecycle', 'security']);
